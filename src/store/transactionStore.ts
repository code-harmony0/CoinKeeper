import { create } from 'zustand';
import { Transaction } from '../types/transaction';
import { getDb } from './database';
import { checkBudgetAlert } from '../services/budgetAlert';
import { toPaise, fromPaise } from '../utils/money';
import { classifyBudgetBucket } from '../utils/budgetBucket';
import { financialEventBus } from '../services/EventBus';

interface MonthlyStats {
  income: number;
  expenses: number;
  net: number;
}

type NewTransaction = Omit<Transaction, 'id' | 'date' | 'categoryId'> & { date?: string };

interface TransactionStore {
  transactions: Transaction[];
  loading: boolean;
  loadTransactions: () => Promise<void>;
  addTransaction: (transaction: NewTransaction) => Promise<void>;
  /** Saves many at once with a single ledger event. Returns how many were saved, in order. */
  addTransactions: (
    transactions: NewTransaction[],
    onProgress?: (saved: number) => void,
  ) => Promise<number>;
  deleteTransaction: (id: string) => Promise<void>;
  /** Removes every transaction that came from an SMS import. Returns how many. */
  deleteImportedSmsTransactions: () => Promise<number>;
  /** Removes every transaction, however it got here. Returns how many. */
  deleteAllTransactions: () => Promise<number>;
  /** Flags money the user expects back, so it stops counting as spending. */
  markAwaitingReturn: (id: string, awaiting: boolean) => Promise<void>;
  /** Records that `incomingId` is `outgoingId` coming back. Neither then counts. */
  settleWith: (outgoingId: string, incomingId: string) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>,
  ) => Promise<void>;
  getMonthlyStats: (month: number, year: number) => MonthlyStats;
  searchTransactions: (query: string) => Transaction[];
}

const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Post-Task-1.3, `transactions` stores amount_paise/occurred_at/category_id
 * rather than the amount/date/category/categoryIcon this store's public
 * Transaction type still exposes to the rest of the app. This function is
 * the only place that translation happens — every screen, hook, and service
 * that already consumes Transaction keeps working unchanged.
 */
/**
 * The subset of the db handle this needs. Typing it structurally lets the same
 * resolver run against a plain handle *or* an open transaction, so IncomeEngine
 * can categorise income inside its atomic tx instead of duplicating this logic
 * (and its budget_bucket classification) a second time.
 */
export interface SqlExecutor {
  execute: (sql: string, params?: any[]) => Promise<any>;
}

export const resolveCategoryId = async (
  db: SqlExecutor,
  name: string,
  icon: string | undefined,
): Promise<string> => {
  const normalized = (name || 'Other').trim() || 'Other';

  const existing = await db.execute(
    'SELECT id, icon FROM categories WHERE lower(name) = lower(?) LIMIT 1;',
    [normalized],
  );
  const existingRow = existing.rows?.[0] as { id?: string; icon?: string } | undefined;

  if (existingRow?.id) {
    if (icon && icon !== existingRow.icon) {
      await db.execute('UPDATE categories SET icon = ? WHERE id = ?;', [icon, existingRow.id]);
    }
    return existingRow.id;
  }

  const id = generateId();
  await db.execute('INSERT INTO categories (id, name, icon, budget_bucket) VALUES (?, ?, ?, ?);', [
    id,
    normalized,
    icon ?? null,
    classifyBudgetBucket(normalized),
  ]);
  return id;
};

const ROW_QUERY = `
  SELECT t.id, t.amount_paise, t.type, c.name AS category,
         c.id AS categoryId,
         COALESCE(c.icon, 'other') AS categoryIcon,
         c.color AS categoryColor,
         t.description, t.occurred_at, t.payment_method AS paymentMethod, t.bank_id AS bankId,
         t.awaiting_return AS awaitingReturn, t.settlement_of AS settlementOf
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  WHERE t.type IN ('income', 'expense', 'transfer_to_goal')
`;

const rowToTransaction = (row: any): Transaction => ({
  id: row.id,
  amountPaise: row.amount_paise,
  type: row.type,
  category: row.category ?? 'Other',
  categoryId: row.categoryId ?? row.category ?? 'other',
  categoryIcon: row.categoryIcon ?? 'other',
  categoryColor: row.categoryColor ?? undefined,
  description: row.description ?? undefined,
  date: new Date(row.occurred_at).toISOString(),
  paymentMethod: row.paymentMethod ?? undefined,
  // Written on every SMS import but never read back until now, so nothing
  // downstream could tell which bank a transaction came from.
  bankId: row.bankId ?? undefined,
  awaitingReturn: row.awaitingReturn === 1,
  settlementOf: row.settlementOf ?? undefined,
});

/**
 * SMS imports are keyed as `sms:<id>` in sms_hash. Older rows keep raw SMS
 * text in that column, so the prefix keeps the two from ever colliding.
 */
const SMS_HASH_PREFIX = 'sms:';

/** Ids of inbox messages already saved, so a rescan does not offer them again. */
export const getImportedSmsIds = async (): Promise<Set<string>> => {
  const result = await getDb().execute(
    `SELECT sms_hash FROM transactions WHERE sms_hash LIKE '${SMS_HASH_PREFIX}%';`,
  );
  return new Set(
    ((result?.rows ?? []) as any[]).map(row => String(row.sms_hash).slice(SMS_HASH_PREFIX.length)),
  );
};

const insertTransaction = async (
  transaction: NewTransaction,
  executor?: SqlExecutor,
  knownCategoryId?: string,
): Promise<Transaction> => {
  const db = executor ?? getDb();
  const date = transaction.date || new Date().toISOString();
  const categoryId =
    knownCategoryId ?? (await resolveCategoryId(db, transaction.category, transaction.categoryIcon));
  const newTx: Transaction = { ...transaction, id: generateId(), date, categoryId };

  await db.execute(
    `INSERT INTO transactions
      (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash, bank_id)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?);`,
    [
      newTx.id,
      newTx.amountPaise,
      newTx.type,
      categoryId,
      newTx.description ?? null,
      new Date(newTx.date).getTime(),
      newTx.paymentMethod ?? null,
      newTx.smsId ? `${SMS_HASH_PREFIX}${newTx.smsId}` : null,
      newTx.bankId ?? null,
    ],
  );
  return newTx;
};

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  loading: true,

  loadTransactions: async () => {
    try {
      set({ loading: true });
      const db = getDb();
      const result = await db.execute(`${ROW_QUERY} ORDER BY t.occurred_at DESC;`);
      const rows = (result.rows ?? []) as any[];
      set({ transactions: rows.map(rowToTransaction), loading: false });
    } catch (error) {
      console.error('[transactionStore] loadTransactions error:', error);
      set({ loading: false });
    }
  },

  addTransaction: async transaction => {
    if (!(transaction.amountPaise > 0)) {
      throw new Error('Invalid amount');
    }
    try {
      const newTx = await insertTransaction(transaction);

      set(state => ({
        transactions: [newTx, ...state.transactions],
      }));
      financialEventBus.emit();

      // Fire and forget: a budget warning is never worth failing a save for.
      void checkBudgetAlert();
    } catch (error) {
      console.error('[transactionStore] addTransaction error:', error);
      throw error;
    }
  },

  // Every ledger event makes each subscriber refetch, so importing an inbox
  // one addTransaction at a time froze the app for as many rounds as messages.
  addTransactions: async (transactions, onProgress) => {
    const added: Transaction[] = [];
    try {
      // One commit for the whole import, and each category resolved once
      // rather than per row — separately committed inserts turned a few
      // hundred SMS into a minutes-long freeze.
      const categoryIds = new Map<string, string>();
      await getDb().transaction(async tx => {
        for (const transaction of transactions) {
          if (!(transaction.amountPaise > 0)) throw new Error('Invalid amount');

          const key = `${transaction.category}|${transaction.categoryIcon ?? ''}`;
          let categoryId = categoryIds.get(key);
          if (!categoryId) {
            categoryId = await resolveCategoryId(tx, transaction.category, transaction.categoryIcon);
            categoryIds.set(key, categoryId);
          }

          added.push(await insertTransaction(transaction, tx, categoryId));
          onProgress?.(added.length);
        }
      });
    } catch (error) {
      // Stops at the first failure; everything before it is already saved.
      console.error('[transactionStore] addTransactions error:', error);
    }

    if (added.length > 0) {
      set(state => ({ transactions: [...added, ...state.transactions] }));
      financialEventBus.emit();
      void checkBudgetAlert();
    }
    return added.length;
  },

  // Re-importing is the way to pick up better parsing of messages already
  // read: the rows came from SMS, so SMS can produce them again. Manual and
  // CSV entries have no sms_hash and are left alone.
  deleteImportedSmsTransactions: async () => {
    try {
      const db = getDb();
      // Counted first rather than read from rowsAffected: op-sqlite does not
      // report it for this statement, so the user was told "0 removed" while
      // hundreds of rows disappeared.
      const before = await db.execute(
        `SELECT COUNT(*) AS total FROM transactions WHERE sms_hash LIKE '${SMS_HASH_PREFIX}%';`,
      );
      const removed = (((before?.rows ?? []) as any[])[0]?.total ?? 0) as number;

      await db.execute(`DELETE FROM transactions WHERE sms_hash LIKE '${SMS_HASH_PREFIX}%';`);
      await get().loadTransactions();
      financialEventBus.emit();
      return removed;
    } catch (error) {
      console.error('[transactionStore] deleteImportedSmsTransactions error:', error);
      return 0;
    }
  },

  markAwaitingReturn: async (id, awaiting) => {
    try {
      await getDb().execute('UPDATE transactions SET awaiting_return = ? WHERE id = ?;', [
        awaiting ? 1 : 0,
        id,
      ]);
      await get().loadTransactions();
      financialEventBus.emit();
    } catch (error) {
      console.error('[transactionStore] markAwaitingReturn error:', error);
      throw error;
    }
  },

  // The two halves are flagged separately on purpose: the outgoing row carries
  // "this was never spending", the incoming row carries "this was never
  // income". Each is true on its own, so a half-recorded pair still keeps the
  // totals honest.
  settleWith: async (outgoingId, incomingId) => {
    try {
      const db = getDb();
      await db.transaction(async tx => {
        await tx.execute('UPDATE transactions SET settlement_of = ? WHERE id = ?;', [
          outgoingId,
          incomingId,
        ]);
        await tx.execute('UPDATE transactions SET awaiting_return = 1 WHERE id = ?;', [outgoingId]);
      });
      await get().loadTransactions();
      financialEventBus.emit();
    } catch (error) {
      console.error('[transactionStore] settleWith error:', error);
      throw error;
    }
  },

  deleteAllTransactions: async () => {
    try {
      const db = getDb();
      const before = await db.execute('SELECT COUNT(*) AS total FROM transactions;');
      const removed = (((before?.rows ?? []) as any[])[0]?.total ?? 0) as number;

      await db.execute('DELETE FROM transactions;');
      set({ transactions: [] });
      financialEventBus.emit();
      return removed;
    } catch (error) {
      console.error('[transactionStore] deleteAllTransactions error:', error);
      return 0;
    }
  },

  deleteTransaction: async id => {
    try {
      const db = getDb();
      await db.execute('DELETE FROM transactions WHERE id = ?;', [id]);

      set(state => ({
        transactions: state.transactions.filter(tx => tx.id !== id),
      }));
      financialEventBus.emit();
    } catch (error) {
      console.error('[transactionStore] deleteTransaction error:', error);
      throw error;
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      const db = getDb();
      const current = get().transactions.find(tx => tx.id === id);
      if (!current) return;

      const merged: Transaction = { ...current, ...updates };
      const categoryId = await resolveCategoryId(db, merged.category, merged.categoryIcon);

      await db.execute(
        `UPDATE transactions SET
          amount_paise = ?, type = ?, category_id = ?,
          description = ?, occurred_at = ?, payment_method = ?
         WHERE id = ?;`,
        [
          merged.amountPaise,
          merged.type,
          categoryId,
          merged.description ?? null,
          new Date(merged.date).getTime(),
          merged.paymentMethod ?? null,
          id,
        ],
      );

      set(state => ({
        transactions: state.transactions.map(tx =>
          tx.id === id ? merged : tx,
        ),
      }));
      financialEventBus.emit();
    } catch (error) {
      console.error('[transactionStore] updateTransaction error:', error);
      throw error;
    }
  },

  getMonthlyStats: (month, year) => {
    const { transactions } = get();

    return transactions.reduce<MonthlyStats>(
      (acc, tx) => {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() !== month || txDate.getFullYear() !== year) {
          return acc;
        }
        // Money lent out and money coming back are the same money passing
        // through. Counting either side inflates the month on both ends.
        if (tx.awaitingReturn || tx.settlementOf) {
          return acc;
        }

        if (tx.type === 'income') {
          acc.income += tx.amountPaise;
        } else if (tx.type === 'expense') {
          acc.expenses += tx.amountPaise;
        }
        acc.net = acc.income - acc.expenses;
        return acc;
      },
      { income: 0, expenses: 0, net: 0 },
    );
  },

  searchTransactions: query => {
    const { transactions } = get();
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      tx =>
        (tx.description ?? '').toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q),
    );
  },
}));

// Subscribe to global invalidation events so the store updates when Bills or Goals mutate the ledger
financialEventBus.subscribe(() => {
  useTransactionStore.getState().loadTransactions();
});
