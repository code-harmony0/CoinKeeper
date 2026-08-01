import { create } from 'zustand';
import { getDb } from './database';

interface BudgetSettings {
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
}

interface BudgetStoreState {
  settings: BudgetSettings;
  isLoading: boolean;
  error: string | null;
  loadBudget: () => Promise<void>;
  saveBudget: (settings: BudgetSettings) => Promise<void>;
}

const DEFAULT_SETTINGS: BudgetSettings = {
  needsPercent: 50,
  wantsPercent: 30,
  savingsPercent: 20,
};

export const useBudgetStore = create<BudgetStoreState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  loadBudget: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      const result = await db.execute('SELECT needs_percent, wants_percent, savings_percent FROM budget_settings WHERE id = 1;');
      
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0] as any;
        set({
          settings: {
            needsPercent: row.needs_percent,
            wantsPercent: row.wants_percent,
            savingsPercent: row.savings_percent,
          },
        });
      } else {
        // DB row might not exist yet if fresh, insert default
        await db.execute(
          'INSERT OR IGNORE INTO budget_settings (id, needs_percent, wants_percent, savings_percent) VALUES (1, 50, 30, 20);'
        );
        set({ settings: DEFAULT_SETTINGS });
      }
    } catch (e: any) {
      console.error('[budgetStore] Failed to load budget settings', e);
      set({ error: e.message || 'Failed to load budget settings' });
    } finally {
      set({ isLoading: false });
    }
  },

  saveBudget: async (settings: BudgetSettings) => {
    const { needsPercent, wantsPercent, savingsPercent } = settings;
    
    // Validate constraint before hitting DB
    if (needsPercent + wantsPercent + savingsPercent !== 100) {
      const errorMsg = 'Budget percentages must sum to exactly 100.';
      set({ error: errorMsg });
      throw new Error(errorMsg);
    }

    set({ isLoading: true, error: null });
    try {
      const db = getDb();
      await db.execute(
        `INSERT INTO budget_settings (id, needs_percent, wants_percent, savings_percent) 
         VALUES (1, ?, ?, ?) 
         ON CONFLICT(id) DO UPDATE SET 
         needs_percent = excluded.needs_percent,
         wants_percent = excluded.wants_percent,
         savings_percent = excluded.savings_percent;`,
        [needsPercent, wantsPercent, savingsPercent]
      );
      
      set({ settings });
    } catch (e: any) {
      console.error('[budgetStore] Failed to save budget settings', e);
      set({ error: e.message || 'Failed to save budget settings' });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
}));
