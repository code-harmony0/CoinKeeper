import { useCallback, useEffect, useState } from 'react';
import { useGoalStore } from '../store/goalStore';
import { FinancialLedgerService } from '../services/FinancialLedgerService';
import { FinancialIntelligenceEngine } from '../services/FinancialIntelligenceEngine';
import { computeGoalHealth, rankGoalPriority, RankedGoal } from '../services/goalIntelligence';
import { financialEventBus } from '../services/EventBus';

export interface GoalIntelligence {
  rankedGoals: RankedGoal[];
  savingsBudgetRemainingPaise: number;
  loading: boolean;
  reload: () => Promise<void>;
}

export const useGoalIntelligence = (): GoalIntelligence => {
  const { goals } = useGoalStore();
  const [rankedGoals, setRankedGoals] = useState<RankedGoal[]>([]);
  const [savingsBudgetRemainingPaise, setSavingsBudgetRemainingPaise] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const now = Date.now();

    const [snapshot, contributionsByGoal] = await Promise.all([
      FinancialIntelligenceEngine.getCurrentSnapshot(),
      Promise.all(goals.map(goal => FinancialLedgerService.getGoalContributions(goal.id))),
    ]);

    const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const contributedThisMonthPaise = contributionsByGoal
      .flat()
      .filter(c => c.occurredAtMs >= monthStart)
      .reduce((sum, c) => sum + c.amountPaise, 0);

    const entries = goals.map((goal, index) => ({
      goal,
      health: computeGoalHealth(goal, contributionsByGoal[index], now),
    }));

    setRankedGoals(rankGoalPriority(entries));
    setSavingsBudgetRemainingPaise(Math.max(0, snapshot.savingsBudget - contributedThisMonthPaise));
    setLoading(false);
  }, [goals]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = financialEventBus.subscribe(load);
    return () => unsubscribe();
  }, [load]);

  return { rankedGoals, savingsBudgetRemainingPaise, loading, reload: load };
};
