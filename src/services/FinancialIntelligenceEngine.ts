import { getDb } from '../store/database';
import { BudgetBucket } from '../utils/budgetBucket';
import { useBudgetStore } from '../store/budgetStore';

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

export interface IntelligenceSnapshot {
  income: number; // paise
  totalExpenses: number; // paise
  safeToSpend: number; // paise
  savingsBudget: number; // paise
  buckets: Record<BudgetBucket, BucketStats>;
  emergencyFundGoal: EmergencyFundGoal | null;
  safeToSpendToday: number; // paise
  monthlyRemaining: number; // paise
  savingsProgress: number; // 0-100
  budgetHealthScore: number; // 0-100
  goalHealth: string; // 'On Track' | 'At Risk' | 'No Goals'
  cashFlow: number; // paise
}

export interface CategoryBreakdown {
  categoryName: string;
  amountPaise: number;
}

export interface TransferDetail {
  id: string;
  goalName: string;
  amountPaise: number;
  occurredAt: number;
  goalTarget: number;
  goalCurrent: number;
  goalDeadline: number | null;
}

export interface ReportSnapshot {
  totalIncome: number; // paise
  totalExpense: number; // paise
  budgetStats: {
    needs: { spent: number; target: number; percent: number };
    wants: { spent: number; target: number; percent: number };
    savings: { spent: number; target: number; percent: number };
  };
  categoryBreakdown: {
    income: CategoryBreakdown[];
    expense: CategoryBreakdown[];
    transfers: CategoryBreakdown[];
  };
  transferDetails: TransferDetail[];
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

export const FinancialIntelligenceEngine = {
  /**
   * Generates the intelligence snapshot for the dashboard and money plan.
   * Based on the current month.
   */
  async getCurrentSnapshot(): Promise<IntelligenceSnapshot> {
    const db = getDb();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    // 1. Fetch Income
    const incomeResult = await db.execute(
      `SELECT SUM(amount_paise) as total FROM transactions
       WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?`,
      [monthStart, nextMonthStart],
    );
    let incomePaise = (incomeResult?.rows?.[0] as any)?.total || 0;

    // Fallback: If no income this month, fetch the last 3 months average
    if (incomePaise <= 0) {
      const pastIncomeResult = await db.execute(
        `SELECT SUM(amount_paise) as total FROM transactions
         WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?`,
        [new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(), monthStart],
      );
      const pastIncome = (pastIncomeResult?.rows?.[0] as any)?.total || 0;
      incomePaise = Math.round(pastIncome / 3) || 0;
    }

    // 2. Fetch total regular expenses (exclude transfer_to_goal to calculate pure expense)
    const expenseResult = await db.execute(
      `SELECT SUM(amount_paise) as total FROM transactions
       WHERE type = 'expense' AND occurred_at >= ? AND occurred_at < ?`,
      [monthStart, nextMonthStart],
    );
    const totalExpensesPaise = (expenseResult?.rows?.[0] as any)?.total || 0;

    // 3. Compute Budget Derived Metrics
    const budgetSettings = useBudgetStore.getState().settings;
    const safeToSpend = Math.round(incomePaise * ((budgetSettings.needsPercent + budgetSettings.wantsPercent) / 100));
    const savingsBudget = Math.round(incomePaise * (budgetSettings.savingsPercent / 100));

    const nextBuckets: Record<BudgetBucket, BucketStats> = {
      needs: { currentSpend: 0, previousSpend: 0, budgetLimit: 0, topCategories: [] },
      wants: { currentSpend: 0, previousSpend: 0, budgetLimit: 0, topCategories: [] },
      savings: { currentSpend: 0, previousSpend: 0, budgetLimit: 0, topCategories: [] },
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

      let limit = 0;
      if (bucket === 'needs') limit = Math.round(incomePaise * (budgetSettings.needsPercent / 100));
      else if (bucket === 'wants') limit = Math.round(incomePaise * (budgetSettings.wantsPercent / 100));
      else if (bucket === 'savings') limit = Math.round(incomePaise * (budgetSettings.savingsPercent / 100));

      nextBuckets[bucket] = {
        currentSpend: (currentRes?.rows?.[0] as any)?.total || 0,
        previousSpend: (previousRes?.rows?.[0] as any)?.total || 0,
        budgetLimit: limit,
        topCategories: ((topRes?.rows ?? []) as any[]).map(r => r.name),
      };
    }

    // 5. Emergency Fund Goal
    const goalResult = await db.execute(
      `SELECT targetAmount, currentAmount FROM goals WHERE is_emergency_fund = 1 LIMIT 1`,
    );
    const goalRow = goalResult?.rows?.[0] as any;

    // 6. Compute new UI properties
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - now.getDate());
    
    // For safe spend today, we subtract Needs and Wants expenses
    const spentOnNeedsWants = nextBuckets.needs.currentSpend + nextBuckets.wants.currentSpend;
    const monthlyRemaining = Math.max(0, safeToSpend - spentOnNeedsWants);
    const safeToSpendToday = Math.floor(monthlyRemaining / daysLeft);

    const savingsProgress = savingsBudget > 0 ? Math.min(100, Math.round((nextBuckets.savings.currentSpend / savingsBudget) * 100)) : 0;
    
    const cashFlow = Math.max(0, incomePaise - totalExpensesPaise);

    // Compute basic health score based on allocations and pacing
    let budgetHealthScore = 100;
    if (spentOnNeedsWants > safeToSpend) budgetHealthScore -= 40;
    else if (spentOnNeedsWants > safeToSpend * 0.9) budgetHealthScore -= 20;
    if (budgetSettings.savingsPercent < 20) budgetHealthScore -= 10;
    if (budgetSettings.needsPercent + budgetSettings.wantsPercent + budgetSettings.savingsPercent !== 100) budgetHealthScore = 0;

    const goalHealth = nextBuckets.savings.currentSpend > 0 ? 'On Track' : (goalRow ? 'At Risk' : 'No Goals');

    return {
      income: incomePaise,
      totalExpenses: totalExpensesPaise,
      safeToSpend,
      savingsBudget,
      buckets: nextBuckets,
      emergencyFundGoal: goalRow ? { targetAmount: goalRow.targetAmount, currentAmount: goalRow.currentAmount } : null,
      safeToSpendToday,
      monthlyRemaining,
      savingsProgress,
      budgetHealthScore: Math.max(0, budgetHealthScore),
      goalHealth,
      cashFlow,
    };
  },

  /**
   * Generates the report snapshot for a specific month.
   */
  async getReportForMonth(date: Date): Promise<ReportSnapshot> {
    const db = getDb();
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();

    // Aggregates
    const [incomeRes, expenseRes, breakdownRes, budgetRes, transferRes] = await Promise.all([
      db.execute(
        `SELECT SUM(amount_paise) as total FROM transactions WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?`,
        [monthStart, nextMonthStart]
      ),
      db.execute(
        `SELECT SUM(amount_paise) as total FROM transactions WHERE type = 'expense' AND occurred_at >= ? AND occurred_at < ?`,
        [monthStart, nextMonthStart]
      ),
      db.execute(
        `SELECT c.name as categoryName, t.type, SUM(t.amount_paise) as amountPaise 
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.occurred_at >= ? AND t.occurred_at < ?
         GROUP BY c.id, t.type
         ORDER BY amountPaise DESC`,
        [monthStart, nextMonthStart]
      ),
      db.execute(
        `SELECT c.budget_bucket as bucket, SUM(t.amount_paise) as total 
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.type IN ('expense', 'transfer_to_goal') AND t.occurred_at >= ? AND t.occurred_at < ?
         GROUP BY c.budget_bucket`,
        [monthStart, nextMonthStart]
      ),
      db.execute(
        `SELECT t.id, t.amount_paise, t.occurred_at, g.name as goalName, g.targetAmount, g.currentAmount, g.deadline
         FROM transactions t
         LEFT JOIN goals g ON t.goal_id = g.id
         WHERE t.type = 'transfer_to_goal' AND t.occurred_at >= ? AND t.occurred_at < ?
         ORDER BY t.occurred_at DESC`,
        [monthStart, nextMonthStart]
      )
    ]);

    const totalIncome = (incomeRes?.rows?.[0] as any)?.total || 0;
    const totalExpense = (expenseRes?.rows?.[0] as any)?.total || 0;

    const breakdownRows = (breakdownRes?.rows || []) as any[];
    const categoryBreakdown = {
      income: breakdownRows.filter(r => r.type === 'income').map(r => ({ categoryName: r.categoryName || 'Other', amountPaise: r.amountPaise })),
      expense: breakdownRows.filter(r => r.type === 'expense').map(r => ({ categoryName: r.categoryName || 'Other', amountPaise: r.amountPaise })),
      transfers: breakdownRows.filter(r => r.type === 'transfer_to_goal').map(r => ({ categoryName: r.categoryName || 'Other', amountPaise: r.amountPaise })),
    };

    const budgetRows = (budgetRes?.rows || []) as any[];
    let needsSpent = 0;
    let wantsSpent = 0;
    
    budgetRows.forEach(r => {
      if (r.bucket === 'needs') needsSpent += r.total;
      if (r.bucket === 'wants') wantsSpent += r.total;
    });

    const settings = useBudgetStore.getState().settings;
    const needsTarget = Math.round(totalIncome * (settings.needsPercent / 100));
    const wantsTarget = Math.round(totalIncome * (settings.wantsPercent / 100));
    const savingsTarget = Math.round(totalIncome * (settings.savingsPercent / 100));
    const actualSavings = Math.max(0, totalIncome - needsSpent - wantsSpent);

    const transferDetails: TransferDetail[] = (transferRes?.rows || []).map((r: any) => ({
      id: r.id,
      goalName: r.goalName || r.description?.replace('Transfer to ', '') || 'Unknown Goal',
      amountPaise: r.amount_paise,
      occurredAt: r.occurred_at,
      goalTarget: r.targetAmount || 0,
      goalCurrent: r.currentAmount || 0,
      goalDeadline: r.deadline || null,
    }));

    return {
      totalIncome,
      totalExpense,
      budgetStats: {
        needs: { spent: needsSpent, target: needsTarget, percent: settings.needsPercent },
        wants: { spent: wantsSpent, target: wantsTarget, percent: settings.wantsPercent },
        savings: { spent: actualSavings, target: savingsTarget, percent: settings.savingsPercent },
      },
      categoryBreakdown,
      transferDetails,
    };
  }
};
