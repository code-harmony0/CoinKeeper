import { create } from 'zustand';
import { Transaction } from '../types/transaction';
import { getDb } from './database';

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
    transaction: Omit<Transaction, 'id' | 'date'>,
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>,
  ) => Promise<void>;
  getMonthlyStats: (month: number, year: number) => MonthlyStats;
}

const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  loading: true,

  loadTransactions: async () => {
    try {
      set({ loading: true });
      const db = getDb();
      const result = await db.execute(
        'SELECT * FROM transactions ORDER BY date DESC;',
      );
      const rows = (result.rows ?? []) as unknown as Transaction[];
      set({ transactions: rows, loading: false });
    } catch (error) {
      console.error('[transactionStore] loadTransactions error:', error);
      set({ loading: false });
    }
  },

  addTransaction: async transaction => {
    try {
      const id = generateId();
      const date = new Date().toISOString();
      const newTx: Transaction = { ...transaction, id, date };

      const db = getDb();
      await db.execute(
        `INSERT INTO transactions
          (id, amount, type, category, categoryIcon, description, date, paymentMethod)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newTx.id,
          newTx.amount,
          newTx.type,
          newTx.category,
          newTx.categoryIcon,
          newTx.description ?? null,
          newTx.date,
          newTx.paymentMethod ?? null,
        ],
      );

      set(state => ({
        transactions: [newTx, ...state.transactions],
      }));
    } catch (error) {
      console.error('[transactionStore] addTransaction error:', error);
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
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      const db = getDb();
      const current = get().transactions.find(tx => tx.id === id);
      if (!current) return;

      const merged: Transaction = { ...current, ...updates };

      await db.execute(
        `UPDATE transactions SET
          amount = ?, type = ?, category = ?, categoryIcon = ?,
          description = ?, date = ?, paymentMethod = ?
         WHERE id = ?;`,
        [
          merged.amount,
          merged.type,
          merged.category,
          merged.categoryIcon,
          merged.description ?? null,
          merged.date,
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
}));
