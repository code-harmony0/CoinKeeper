import { create } from 'zustand';
import { getDb } from './database';

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

  markPaid: async (id, timestamp) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      await db.execute('UPDATE bills SET last_paid_at = ? WHERE id = ?;', [timestamp, id]);
      
      set((state) => ({
        bills: state.bills.map(b => b.id === id ? { ...b, lastPaidAt: timestamp } : b),
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
