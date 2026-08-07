import { create } from 'zustand';
import { getDb } from './database';

export interface Goal {
  id: string;
  name: string;
  /** Note: Goals store amounts in whole INR (Rupees), NOT paise! (Legacy table schema) */
  targetAmount: number;
  /** Note: Goals store amounts in whole INR (Rupees), NOT paise! (Legacy table schema) */
  currentAmount: number;
  deadline?: string;
  /**
   * Optional on input to addGoal — omitted, it's derived case-insensitively
   * from `name`. Always a real boolean on goals loaded from the DB.
   */
  isEmergencyFund?: boolean;
}

interface GoalStoreState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  loadGoals: () => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<string>;
  updateGoalProgress: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  getEmergencyFundTarget: () => Promise<void>;
}

let idCounter = 0;
const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${idCounter++}`;

export const useGoalStore = create<GoalStoreState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  loadGoals: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      const result = await db.execute('SELECT * FROM goals ORDER BY rowid ASC;');
      const goals = (result.rows || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        targetAmount: row.targetAmount,
        currentAmount: row.currentAmount,
        deadline: row.deadline || undefined,
        isEmergencyFund: row.is_emergency_fund === 1,
      }));
      set({ goals });
    } catch (e: any) {
      console.error('[goalStore] Failed to load goals', e);
      set({ error: e.message || 'Failed to load goals' });
    } finally {
      set({ isLoading: false });
    }
  },

  addGoal: async (goalData) => {
    const id = generateId();
    // Case-insensitive by design — "Emergency fund" and "EMERGENCY FUND" were
    // previously invisible to every read site that string-matched the exact
    // capitalization "Emergency Fund". isEmergencyFund lets a caller force it
    // either way; when omitted it falls back to the name check, so nothing
    // that already relies on typing that name to get special treatment breaks.
    const isEmergencyFund =
      goalData.isEmergencyFund ?? goalData.name.trim().toLowerCase() === 'emergency fund';
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      await db.execute(
        `INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, is_emergency_fund)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          id,
          goalData.name,
          goalData.targetAmount,
          goalData.currentAmount,
          goalData.deadline || null,
          isEmergencyFund ? 1 : 0,
        ]
      );

      set((state) => ({
        goals: [...state.goals, { ...goalData, id, isEmergencyFund }],
      }));
      return id;
    } catch (e: any) {
      console.error('[goalStore] Failed to add goal', e);
      set({ error: e.message || 'Failed to add goal' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  updateGoalProgress: async (id, amount) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      const targetGoal = get().goals.find(g => g.id === id);
      if (!targetGoal) throw new Error('Goal not found');
      
      const newAmount = targetGoal.currentAmount + amount;
      
      await db.execute('UPDATE goals SET currentAmount = ? WHERE id = ?;', [newAmount, id]);
      
      set((state) => ({
        goals: state.goals.map(g => g.id === id ? { ...g, currentAmount: newAmount } : g),
      }));
    } catch (e: any) {
      console.error('[goalStore] Failed to update goal', e);
      set({ error: e.message || 'Failed to update goal' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteGoal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      await db.execute('DELETE FROM goals WHERE id = ?;', [id]);
      
      set((state) => ({
        goals: state.goals.filter(g => g.id !== id),
      }));
    } catch (e: any) {
      console.error('[goalStore] Failed to delete goal', e);
      set({ error: e.message || 'Failed to delete goal' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  getEmergencyFundTarget: async () => {
    try {
      const db = getDb();
      
      // Calculate average monthly expenses over the last 6 months
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
      
      const expenseResult = await db.execute(
        "SELECT SUM(amount_paise) as total FROM transactions WHERE type = 'expense' AND occurred_at >= ?",
        [sixMonthsAgo]
      );
      
      const totalPaise = (expenseResult.rows?.[0] as any)?.total || 0;
      // targetAmount stays in paise, same unit as currentAmount — this used to
      // divide by 100 (rupees) while currentAmount stayed in paise, silently
      // making every emergency fund's progress math 100x wrong.
      const targetAmount = Math.max(totalPaise, 5000000); // Floor of ₹50,000
      
      // Find or create emergency fund goal
      const efGoal = get().goals.find(g => g.isEmergencyFund);
      if (efGoal) {
        await db.execute('UPDATE goals SET targetAmount = ? WHERE id = ?', [targetAmount, efGoal.id]);
        set((state) => ({
          goals: state.goals.map(g => g.id === efGoal.id ? { ...g, targetAmount } : g)
        }));
      } else {
        // Only auto-create if no goals exist at all
        if (get().goals.length === 0) {
          await get().addGoal({
            name: 'Emergency Fund',
            targetAmount,
            currentAmount: 0,
            isEmergencyFund: true,
          });
        }
      }
      
    } catch (e: any) {
      console.error('[goalStore] Failed to calculate emergency fund target', e);
    }
  }
}));
