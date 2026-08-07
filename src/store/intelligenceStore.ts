import { create } from 'zustand';
import { getDb } from './database';
import { BudgetBucket } from '../utils/budgetBucket';
import { financialEventBus } from '../services/EventBus';
import { useBudgetStore } from './budgetStore';
import { FinancialIntelligenceEngine } from '../services/FinancialIntelligenceEngine';

export interface BucketStats {
  currentSpend: number; // paise
  previousSpend: number; // paise
  budgetLimit: number; // paise
  topCategories: string[];
}

export interface EmergencyFundGoal {
  targetAmount: number; // paise
  currentAmount: number; // paise
}

export interface FinancialIntelligenceState {
  // Global Monthly Stats
  income: number; // paise
  totalExpenses: number; // paise
  safeToSpend: number; // paise (income * (needs% + wants%))
  savingsBudget: number; // paise (income * savings%)
  
  // Breakdown
  buckets: Record<BudgetBucket, BucketStats>;
  emergencyFundGoal: EmergencyFundGoal | null;
  
  // Status
  loading: boolean;
  
  // Actions
  loadIntelligence: () => Promise<void>;
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

const emptyBucket = (): BucketStats => ({
  currentSpend: 0,
  previousSpend: 0,
  budgetLimit: 0,
  topCategories: [],
});

export const useIntelligenceStore = create<FinancialIntelligenceState>((set, get) => ({
  income: 0,
  totalExpenses: 0,
  safeToSpend: 0,
  savingsBudget: 0,
  
  buckets: {
    needs: emptyBucket(),
    wants: emptyBucket(),
    savings: emptyBucket(),
  },
  emergencyFundGoal: null,
  loading: true,

  loadIntelligence: async () => {
    set({ loading: true });
    try {
      const snapshot = await FinancialIntelligenceEngine.getCurrentSnapshot();
      set({
        ...snapshot,
        loading: false,
      });
    } catch (e) {
      console.error('[intelligenceStore] Error loading:', e);
      set({ loading: false });
    }
  },
}));

// Subscribe to financial events to keep intelligence auto-updated
financialEventBus.subscribe(() => {
  useIntelligenceStore.getState().loadIntelligence();
});
