import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../store/database';
import { fromPaise } from '../utils/money';
import { BudgetBucket } from '../utils/budgetBucket';

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

    const incomeResult = await db.execute(
      `SELECT SUM(amount_paise) as total FROM transactions
       WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?`,
      [lastMonthStart, monthStart],
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
           WHERE c.budget_bucket = ? AND t.type = 'expense' AND t.occurred_at >= ?`,
          [bucket, monthStart],
        ),
        db.execute(
          `SELECT SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type = 'expense' AND t.occurred_at >= ? AND t.occurred_at < ?`,
          [bucket, lastMonthStart, monthStart],
        ),
        db.execute(
          `SELECT c.name as name, SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type = 'expense' AND t.occurred_at >= ?
           GROUP BY c.id ORDER BY total DESC LIMIT 3`,
          [bucket, monthStart],
        ),
      ]);

      nextBuckets[bucket] = {
        currentSpend: fromPaise((currentRes?.rows?.[0] as any)?.total || 0),
        previousSpend: fromPaise((previousRes?.rows?.[0] as any)?.total || 0),
        topCategories: ((topRes?.rows ?? []) as any[]).map(r => r.name),
      };
    }

    setBuckets(nextBuckets);

    const goalResult = await db.execute(
      `SELECT targetAmount, currentAmount FROM goals WHERE name = 'Emergency Fund' LIMIT 1`,
    );
    const goalRow = goalResult?.rows?.[0] as any;
    setEmergencyFundGoal(
      goalRow ? { targetAmount: goalRow.targetAmount, currentAmount: goalRow.currentAmount } : null,
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { income, buckets, emergencyFundGoal, loading, reload: load };
};
