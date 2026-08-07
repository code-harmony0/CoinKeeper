import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../store/database';
import { fromPaise } from '../utils/money';
import { BudgetBucket } from '../utils/budgetBucket';
import { financialEventBus } from '../services/EventBus';

export interface BucketIntelligence {
  currentSpend: number;
  previousSpend: number;
  topCategories: string[];
}

export interface EmergencyFundGoal {
  targetAmount: number;
  currentAmount: number;
}

export interface MoneyPlanIntelligence {
  income: number;
  buckets: Record<BudgetBucket, BucketIntelligence>;
  emergencyFundGoal: EmergencyFundGoal | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

const emptyBucket = (): BucketIntelligence => ({ currentSpend: 0, previousSpend: 0, topCategories: [] });

export const useMoneyPlanIntelligence = (): MoneyPlanIntelligence => {
  const [income, setIncome] = useState(0);
  const [buckets, setBuckets] = useState<Record<BudgetBucket, BucketIntelligence>>({
    needs: emptyBucket(),
    wants: emptyBucket(),
    savings: emptyBucket(),
  });
  const [emergencyFundGoal, setEmergencyFundGoal] = useState<EmergencyFundGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const db = getDb();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    // Income is scoped to the CURRENT month, matching the expense window below.
    // This previously read [lastMonthStart, monthStart) — last month — so income
    // logged today never appeared and the plan showed "No income set" / ₹0.
    const incomeResult = await db.execute(
      `SELECT SUM(amount_paise) as total FROM transactions
       WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?`,
      [monthStart, nextMonthStart],
    );
    setIncome(fromPaise((incomeResult?.rows?.[0] as any)?.total || 0));

    const nextBuckets: Record<BudgetBucket, BucketIntelligence> = {
      needs: emptyBucket(),
      wants: emptyBucket(),
      savings: emptyBucket(),
    };

    for (const bucket of BUCKETS) {
      const [currentRes, previousRes, topRes] = await Promise.all([
        db.execute(
          `SELECT SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type IN ('expense', 'transfer_to_goal')
             AND t.occurred_at >= ? AND t.occurred_at < ?`,
          [bucket, monthStart, nextMonthStart],
        ),
        db.execute(
          `SELECT SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type IN ('expense', 'transfer_to_goal') AND t.occurred_at >= ? AND t.occurred_at < ?`,
          [bucket, lastMonthStart, monthStart],
        ),
        db.execute(
          `SELECT c.name as name, SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type IN ('expense', 'transfer_to_goal')
             AND t.occurred_at >= ? AND t.occurred_at < ?
           GROUP BY c.id ORDER BY total DESC LIMIT 3`,
          [bucket, monthStart, nextMonthStart],
        ),
      ]);

      nextBuckets[bucket] = {
        currentSpend: fromPaise((currentRes?.rows?.[0] as any)?.total || 0),
        previousSpend: fromPaise((previousRes?.rows?.[0] as any)?.total || 0),
        topCategories: ((topRes?.rows ?? []) as any[]).map(r => r.name),
      };
    }

    setBuckets(nextBuckets);

    // is_emergency_fund, not a name match — "Emergency fund" (lowercase f)
    // previously matched nothing here and the Money Plan silently showed no
    // emergency fund progress at all.
    const goalResult = await db.execute(
      `SELECT targetAmount, currentAmount FROM goals WHERE is_emergency_fund = 1 LIMIT 1`,
    );
    const goalRow = goalResult?.rows?.[0] as any;
    setEmergencyFundGoal(
      goalRow ? { targetAmount: goalRow.targetAmount, currentAmount: goalRow.currentAmount } : null,
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = financialEventBus.subscribe(() => {
      load();
    });
    return unsubscribe;
  }, [load]);

  return { income, buckets, emergencyFundGoal, loading, reload: load };
};
