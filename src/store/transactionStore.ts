import { create } from 'zustand';
import { Transaction } from '../types/transaction';
import { getDb } from './database';
import { toPaise, fromPaise } from '../utils/money';

interface MonthlyStats {
  income: number;
  expenses: number;
  net: number;
}

interface TransactionStore {
  transactions: Transaction[];
  loading: boolean;
  loadTransactions: () => Promise<void>;
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'date'> & { date?: string },
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
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
const resolveCategoryId = async (
  db: ReturnType<typeof getDb>,
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
  await db.execute('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?);', [
    id,
    normalized,
    icon ?? null,
  ]);
  return id;
};

const ROW_QUERY = `
  SELECT t.id, t.amount_paise, t.type, c.name AS category,
         COALESCE(c.icon, 'other') AS categoryIcon,
         t.description, t.occurred_at, t.payment_method AS paymentMethod
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
`;

const rowToTransaction = (row: any): Transaction => ({
  id: row.id,
  amount: fromPaise(row.amount_paise),
  type: row.type,
  category: row.category ?? 'Other',
  categoryIcon: row.categoryIcon ?? 'other',
  description: row.description ?? undefined,
  date: new Date(row.occurred_at).toISOString(),
  paymentMethod: row.paymentMethod ?? undefined,
});

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
    try {
      const id = generateId();
      const date = transaction.date || new Date().toISOString();
      const newTx: Transaction = { ...transaction, id, date };
      const amountPaise = toPaise(String(newTx.amount));

      const db = getDb();
      const categoryId = await resolveCategoryId(db, newTx.category, newTx.categoryIcon);

      await db.execute(
        `INSERT INTO transactions
          (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL);`,
        [
          newTx.id,
          amountPaise,
          newTx.type,
          categoryId,
          newTx.description ?? null,
          new Date(newTx.date).getTime(),
          newTx.paymentMethod ?? null,
        ],
      );

      set(state => ({
        transactions: [newTx, ...state.transactions],
      }));
    } catch (error) {
      console.error('[transactionStore] addTransaction error:', error);
      throw error;
    }
  },

  deleteTransaction: async id => {
    try {
      const db = getDb();
      await db.execute('DELETE FROM transactions WHERE id = ?;', [id]);

      set(state => ({
        transactions: state.transactions.filter(tx => tx.id !== id),
      }));
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
          toPaise(String(merged.amount)),
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

        if (tx.type === 'income') {
          acc.income += tx.amount;
        } else if (tx.type === 'expense') {
          acc.expenses += tx.amount;
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
