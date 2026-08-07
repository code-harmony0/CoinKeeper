import { getDb, getPreference, setPreference } from '../store/database';
import { Money } from '../utils/money';
import { detectSubscriptions } from './subscriptionDetector';
import { FinancialIntelligenceEngine } from './FinancialIntelligenceEngine';
import { computeGoalHealth, rankGoalPriority } from './goalIntelligence';
import { FinancialLedgerService } from './FinancialLedgerService';
import type { Goal } from '../store/goalStore';

export interface Insight {
  id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  value?: string;
  actionable?: boolean;
}

// Re-exported (not redeclared) so existing external imports of `Goal` from
// this module keep working — goalStore.ts is the single source of truth for
// this shape now that computeGoalHealth/rankGoalPriority (below) consume it
// directly; a second, structurally-identical local definition was exactly
// the "two definitions of a goal" problem getPrimaryGoal's refactor was
// meant to eliminate, just moved from logic into the type declaration.
export type { Goal };

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

/**
 * All queries here read `transactions` in its post-Task-1.3 shape:
 * amount_paise (integer), occurred_at (unix ms), category_id (FK). Every sum
 * uses paise logic.
 */

/** Count consecutive days (ending today) where spend stayed under the daily budget */
export const getBudgetStreak = async (): Promise<number> => {
  const db = getDb();

  try {
    const today = new Date();
    const snapshot = await FinancialIntelligenceEngine.getCurrentSnapshot();
    
    // If no real income data, streak calculation is meaningless. Return 0.
    if (snapshot.income === 0) return 0;
    
    // Calculate expected daily safe spend based on the snapshot
    const daysInMonth = getDaysInMonth(today.getFullYear(), today.getMonth() + 1);
    const safeDailyPaise = Math.floor(snapshot.safeToSpend / daysInMonth);

    const sixtyDaysAgo = today.getTime() - (60 * 24 * 60 * 60 * 1000);
    const dailyResult = await db.execute(`
      SELECT date(occurred_at / 1000, 'unixepoch') as day, SUM(amount_paise) as total_paise
      FROM transactions
      WHERE type = 'expense' AND occurred_at >= ?
      GROUP BY day
      ORDER BY day DESC
    `, [sixtyDaysAgo]);

    const rows = (dailyResult.rows ?? []) as { day: string; total_paise: number }[];
    if (rows.length === 0) return 0;
    
    const spendByDay = new Map(rows.map((r) => [r.day, r.total_paise]));

    let streak = 0;
    const cursor = new Date(today);
    for (let i = 0; i < 60; i++) {
      const key = cursor.toISOString().slice(0, 10);
      const spentPaise = spendByDay.get(key) ?? 0;
      if (spentPaise > safeDailyPaise) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  } catch (error) {
    console.error('Streak calculation error:', error);
    return 0;
  }
};

/** Fetch the user's primary savings goal, if one has been created */
export const getPrimaryGoal = async (): Promise<Goal | null> => {
  const db = getDb();

  try {
    const result = await db.execute(
      'SELECT id, name, targetAmount, currentAmount, deadline, is_emergency_fund FROM goals;',
    );
    const rows = (result.rows || []) as any[];
    if (rows.length === 0) return null;

    const goals: Goal[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
      deadline: row.deadline || undefined,
      isEmergencyFund: row.is_emergency_fund === 1,
    }));

    const now = Date.now();
    const entries = await Promise.all(
      goals.map(async goal => ({
        goal,
        health: computeGoalHealth(goal, await FinancialLedgerService.getGoalContributions(goal.id), now),
      })),
    );

    return rankGoalPriority(entries)[0]?.goal ?? null;
  } catch (error) {
    console.error('Goal fetch error:', error);
    return null;
  }
};

export const generateInsights = async (): Promise<Insight[]> => {
  const insights: Insight[] = [];
  const db = getDb();
  const today = new Date();

  try {
    // 1. Daily Safe Spending (Task 4.2)
    const snapshot = await FinancialIntelligenceEngine.getCurrentSnapshot();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

    if (snapshot.income === 0) {
      insights.push({
        id: 'no-income',
        type: 'info',
        title: 'No Income Recorded',
        message: 'Add your income to see your plan-based safe-to-spend limit.',
        actionable: true,
      });
    } else {
      const spentOnNeedsWants = snapshot.buckets.needs.currentSpend + snapshot.buckets.wants.currentSpend;
      
      if (spentOnNeedsWants > snapshot.safeToSpend) {
        insights.push({
          id: 'over-budget',
          type: 'alert',
          title: 'Over Budget',
          message: `You have exceeded your plan's monthly limit by ${Money.format(spentOnNeedsWants - snapshot.safeToSpend, { zeroDecimals: true })}.`,
        });
      } else {
        const daysInMonth = getDaysInMonth(today.getFullYear(), today.getMonth() + 1);
        const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
        
        insights.push({
          id: 'safe-spending',
          type: 'success',
          title: "Today's Plan Limit",
          message: `Budget Left: ${Money.format(snapshot.monthlyRemaining, { zeroDecimals: true })}\nDays Left: ${daysLeft}`,
          value: `${Money.format(snapshot.safeToSpendToday, { zeroDecimals: true })}`,
        });
      }
    }

    // 2. Weekend vs Weekday Spend
    // SQLite strftime('%w', ...) -> '0' is Sunday, '6' is Saturday
    const weekendResult = await db.execute(`
      SELECT
        SUM(CASE WHEN strftime('%w', occurred_at / 1000, 'unixepoch') IN ('0', '6') THEN amount_paise ELSE 0 END) as weekend_paise,
        SUM(CASE WHEN strftime('%w', occurred_at / 1000, 'unixepoch') NOT IN ('0', '6') THEN amount_paise ELSE 0 END) as weekday_paise
      FROM transactions
      WHERE type = 'expense' AND occurred_at >= ?
    `, [startOfMonth]);

    const weekendSpendPaise = (weekendResult.rows?.[0] as any)?.weekend_paise || 0;
    const weekdaySpendPaise = (weekendResult?.rows?.[0] as any)?.weekday_paise || 0;

    if (weekendSpendPaise > weekdaySpendPaise && weekendSpendPaise > 200000) {
      const pct = Math.round(((weekendSpendPaise - weekdaySpendPaise) / weekdaySpendPaise) * 100);
      insights.push({
        id: 'weekend-high',
        type: 'warning',
        title: 'Weekend Spikes',
        message: `You spend ${pct}% more on weekends. Consider planning your weekend outings to save more.`,
      });
    }

    // 3. Duplicate Payment Detection (Last 7 days)
    const sevenDaysAgo = today.getTime() - 7 * 24 * 60 * 60 * 1000;
    const dupResult = await db.execute(`
      SELECT description AS merchant, amount_paise, COUNT(*) as count
      FROM transactions
      WHERE occurred_at >= ? AND type = 'expense'
      GROUP BY description, amount_paise
      HAVING count > 1
    `, [sevenDaysAgo]);

    if (dupResult.rows && dupResult.rows.length > 0) {
      const dup = dupResult.rows[0] as any;
      insights.push({
        id: 'duplicate-payment',
        type: 'warning',
        title: 'Duplicate Payment?',
        message: `Looks like you paid ${Money.format(dup.amount_paise, { zeroDecimals: true })} twice to ${dup.merchant} recently.`,
        actionable: true,
      });
    }

    // 4. Overspending Alert (Category based compared to last month)
    // Simplified for demo: Just flag any category exceeding 5000
    const catResult = await db.execute(`
      SELECT c.name as category, SUM(t.amount_paise) as total_paise
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.type = 'expense' AND t.occurred_at >= ?
      GROUP BY t.category_id
      ORDER BY total_paise DESC LIMIT 1
    `, [startOfMonth]);

    if (catResult.rows && catResult.rows.length > 0) {
      const topCat = catResult.rows[0] as any;
      const topCatTotalPaise = topCat.total_paise;
      if (topCatTotalPaise > 500000 && topCat.category !== 'Other' && topCat.category !== null) {
        insights.push({
          id: 'category-overspend',
          type: 'alert',
          title: `${topCat.category} Alert`,
          message: `You've spent ${Money.format(topCatTotalPaise, { zeroDecimals: true })} on ${topCat.category} this month.`,
        });
      }
    }

    // 5. Detected Subscriptions (Task 4.5 & Product Audit Fix)
    const todayStr = today.toISOString().slice(0, 10);
    const lastSubScan = await getPreference('last_subscription_scan');
    
    if (lastSubScan !== todayStr) {
      const subs = await detectSubscriptions();
      if (subs.length > 0) {
        insights.push({
          id: 'new-subscriptions',
          type: 'info',
          title: 'Subscriptions Detected',
          message: `Found ${subs.length} recurring payments (e.g. ${subs[0].merchant}). Consider adding them to your Bills to track them.`,
        });
      }
      await setPreference('last_subscription_scan', todayStr);
    } else {
      // If we already scanned today, we can just query the subscriptions table for any autodetected ones
      const recentSubsResult = await db.execute('SELECT * FROM subscriptions LIMIT 1');
      if (recentSubsResult.rows && recentSubsResult.rows.length > 0) {
         insights.push({
          id: 'new-subscriptions',
          type: 'info',
          title: 'Subscriptions Detected',
          message: `Found recurring payments. Consider adding them to your Bills to track them.`,
        });
      }
    }

    // 6. Goal Progress Notifications
    const primaryGoal = await getPrimaryGoal();
    if (primaryGoal && primaryGoal.targetAmount > 0) {
      const progress = (primaryGoal.currentAmount / primaryGoal.targetAmount) * 100;
      if (progress >= 50 && progress < 100) {
        // Only show if not recently shown to avoid spamming
        const lastGoalNotif = await getPreference(`goal_notif_${primaryGoal.id}`);
        const currentMilestone = Math.floor(progress / 25) * 25; // 50 or 75
        
        if (lastGoalNotif !== currentMilestone.toString()) {
          insights.push({
            id: 'goal-progress',
            type: 'success',
            title: 'Goal Milestone!',
            message: `You are ${currentMilestone}% of the way to your ${primaryGoal.name} goal! Keep it up.`,
          });
          await setPreference(`goal_notif_${primaryGoal.id}`, currentMilestone.toString());
        }
      }
    }

  } catch (error) {
    console.error('Insights generation error:', error);
  }

  return insights;
};
