import { create } from 'zustand';
import { getDb } from './database';
import { resolveCategoryId } from './transactionStore';

const generateTxId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface Bill {
  id: string;
  name: string;
  amountPaise: number;
  categoryId?: string;
  dueDay: number; // 1-31
  isRecurring: boolean;
  repeatInterval?: string;
  reminderDaysBefore?: number;
  notes?: string;
  color?: string;
  icon?: string;
  autoPayEnabled?: boolean;
  lastPaidAt?: number;
  lastPaidTransactionId?: string;
  notificationId?: string;
}

interface BillStoreState {
  bills: Bill[];
  isLoading: boolean;
  error: string | null;
  loadBills: () => Promise<void>;
  addBill: (bill: Omit<Bill, 'id'>) => Promise<string>;
  markPaid: (id: string, timestamp: number) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  updateNotificationId: (id: string, notificationId: string) => Promise<void>;
}

let idCounter = 0;
const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${idCounter++}`;

export const useBillStore = create<BillStoreState>((set) => ({
  bills: [],
  isLoading: false,
  error: null,

  loadBills: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      const result = await db.execute('SELECT * FROM bills ORDER BY due_day ASC;');
      const bills = (result.rows || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        amountPaise: row.amount_paise,
        categoryId: row.category_id,
        dueDay: row.due_day,
        isRecurring: row.is_recurring === 1,
        repeatInterval: row.repeat_interval || undefined,
        reminderDaysBefore: row.reminder_days_before ?? undefined,
        notes: row.notes || undefined,
        color: row.color || undefined,
        icon: row.icon || undefined,
        autoPayEnabled: row.auto_pay_enabled === 1,
        lastPaidAt: row.last_paid_at || undefined,
        lastPaidTransactionId: row.last_paid_transaction_id || undefined,
        notificationId: row.notification_id || undefined,
      }));
      set({ bills });
    } catch (e: any) {
      console.error('[billStore] Failed to load bills', e);
      set({ error: e.message || 'Failed to load bills' });
    } finally {
      set({ isLoading: false });
    }
  },

  addBill: async (billData) => {
    const id = generateId();
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      await db.execute(
        `INSERT INTO bills (id, name, amount_paise, category_id, due_day, is_recurring, repeat_interval, reminder_days_before, notes, color, icon, auto_pay_enabled, last_paid_at, notification_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          billData.name,
          billData.amountPaise,
          billData.categoryId || null,
          billData.dueDay,
          billData.isRecurring ? 1 : 0,
          billData.repeatInterval || null,
          billData.reminderDaysBefore ?? null,
          billData.notes || null,
          billData.color || null,
          billData.icon || null,
          billData.autoPayEnabled ? 1 : 0,
          billData.lastPaidAt || null,
          billData.notificationId || null,
        ]
      );
      
      set((state) => ({
        bills: [...state.bills, { ...billData, id }].sort((a, b) => a.dueDay - b.dueDay),
      }));
      return id;
    } catch (e: any) {
      console.error('[billStore] Failed to add bill', e);
      set({ error: e.message || 'Failed to add bill' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  // markPaid previously only stamped last_paid_at on the bill row — paying a
  // bill never touched `transactions`, so it counted as spending nowhere: not
  // in the Needs bucket, not in reports, not in the Money Plan. Paying now
  // inserts a linked expense; unpaying (timestamp === 0, the existing
  // convention) deletes exactly that row via last_paid_transaction_id, so
  // toggling paid/unpaid repeatedly never leaves orphaned transactions.
  markPaid: async (id, timestamp) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      const isUnpaying = timestamp === 0;
      const newTransactionId = isUnpaying ? undefined : generateTxId();

      await db.transaction(async (tx: any) => {
        const billRow = await tx.execute('SELECT * FROM bills WHERE id = ?;', [id]);
        const bill = billRow.rows?.[0] as any;
        if (!bill) throw new Error('Bill not found');

        if (isUnpaying) {
          if (bill.last_paid_transaction_id) {
            await tx.execute('DELETE FROM transactions WHERE id = ?;', [bill.last_paid_transaction_id]);
          }
          await tx.execute(
            'UPDATE bills SET last_paid_at = ?, last_paid_transaction_id = NULL WHERE id = ?;',
            [timestamp, id],
          );
        } else {
          // AddBillSheet has no category picker, so category_id is null on
          // almost every bill in practice. useMoneyPlanIntelligence's bucket
          // queries INNER JOIN categories — a null category_id expense would
          // match none of them and silently vanish from Needs/Wants/Savings,
          // which defeats the point of linking bills to spending at all.
          const categoryId = bill.category_id || (await resolveCategoryId(tx, bill.name, undefined));
          await tx.execute(
            `INSERT INTO transactions
               (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
             VALUES (?, ?, 'expense', ?, NULL, ?, ?, NULL, NULL, NULL)`,
            [newTransactionId, bill.amount_paise, categoryId, bill.name, timestamp],
          );
          await tx.execute(
            'UPDATE bills SET last_paid_at = ?, last_paid_transaction_id = ? WHERE id = ?;',
            [timestamp, newTransactionId, id],
          );
        }
      });

      set((state) => ({
        bills: state.bills.map(b =>
          b.id === id
            ? { ...b, lastPaidAt: timestamp || undefined, lastPaidTransactionId: newTransactionId }
            : b
        ),
      }));
    } catch (e: any) {
      console.error('[billStore] Failed to mark bill as paid', e);
      set({ error: e.message || 'Failed to mark bill as paid' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBill: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      await db.execute('DELETE FROM bills WHERE id = ?;', [id]);
      
      set((state) => ({
        bills: state.bills.filter(b => b.id !== id),
      }));
    } catch (e: any) {
      console.error('[billStore] Failed to delete bill', e);
      set({ error: e.message || 'Failed to delete bill' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateNotificationId: async (id, notificationId) => {
    try {
      const db = getDb();
      await db.execute('UPDATE bills SET notification_id = ? WHERE id = ?;', [notificationId, id]);
      
      set((state) => ({
        bills: state.bills.map(b => b.id === id ? { ...b, notificationId } : b),
      }));
    } catch (e: any) {
      console.error('[billStore] Failed to update notification id', e);
    }
  }
}));
