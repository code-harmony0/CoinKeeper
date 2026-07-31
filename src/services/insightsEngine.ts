import { getDb } from '../store/database';
import { fromPaise } from '../utils/money';

export interface Insight {
  id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  value?: string;
  actionable?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

/**
 * All queries here read `transactions` in its post-Task-1.3 shape:
 * amount_paise (integer), occurred_at (unix ms), category_id (FK). Every sum
 * is converted back to rupees via fromPaise() immediately after querying, so
 * the arithmetic below stays in the same units it always was.
 */

/** Count consecutive days (ending today) where spend stayed under the daily budget */
export const getBudgetStreak = async (): Promise<number> => {
  const db = getDb();

  try {
    const budgetStr = await db.execute('SELECT value FROM preferences WHERE key = ?', ['monthly_budget']);
    const budget = budgetStr.rows && budgetStr.rows.length > 0 ? parseFloat(budgetStr.rows[0].value as string) : 30000;
    const today = new Date();
    const dailyBudget = budget / getDaysInMonth(today.getFullYear(), today.getMonth() + 1);

    const dailyResult = await db.execute(`
      SELECT date(occurred_at / 1000, 'unixepoch') as day, SUM(amount_paise) as total_paise
      FROM transactions
      WHERE type = 'expense'
      GROUP BY day
      ORDER BY day DESC
    `);

    const rows = (dailyResult.rows ?? []) as { day: string; total_paise: number }[];
    const spendByDay = new Map(rows.map((r) => [r.day, fromPaise(r.total_paise)]));

    let streak = 0;
    const cursor = new Date(today);
    for (let i = 0; i < 60; i++) {
      const key = cursor.toISOString().slice(0, 10);
      const spent = spendByDay.get(key) ?? 0;
      if (spent > dailyBudget) break;
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
    const result = await db.execute('SELECT id, name, targetAmount, currentAmount FROM goals ORDER BY rowid LIMIT 1');
    if (!result.rows || result.rows.length === 0) return null;

    const row = result.rows[0] as any;
    return {
      id: row.id,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
    };
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
    // 1. Daily Safe Spending
    const budgetStr = await db.execute('SELECT value FROM preferences WHERE key = ?', ['monthly_budget']);
    const budget = budgetStr.rows && budgetStr.rows.length > 0 ? parseFloat(budgetStr.rows[0].value as string) : 30000;

    // Get total spent this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const spentResult = await db.execute(
      "SELECT SUM(amount_paise) as total_paise FROM transactions WHERE type = 'expense' AND occurred_at >= ?",
      [startOfMonth]
    );
    const spent = fromPaise((spentResult.rows?.[0] as any)?.total_paise || 0);

    const daysLeft = getDaysInMonth(today.getFullYear(), today.getMonth() + 1) - today.getDate() + 1;
    const remaining = budget - spent;

    if (remaining > 0) {
      const safeDaily = Math.floor(remaining / daysLeft);
      insights.push({
        id: 'safe-spending',
        type: 'info',
        title: 'Daily Safe Spending',
        message: `Budget Left: ₹${remaining.toLocaleString()}\nDays Left: ${daysLeft}`,
        value: `₹${safeDaily.toLocaleString()}`,
      });
    } else {
      insights.push({
        id: 'over-budget',
        type: 'alert',
        title: 'Budget Exceeded',
        message: `You have exceeded your monthly budget of ₹${budget.toLocaleString()}.`,
      });
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

    const weekendSpend = fromPaise((weekendResult.rows?.[0] as any)?.weekend_paise || 0);
    const weekdaySpend = fromPaise((weekendResult.rows?.[0] as any)?.weekday_paise || 0);

    if (weekendSpend > weekdaySpend && weekendSpend > 2000) {
      const pct = Math.round(((weekendSpend - weekdaySpend) / weekdaySpend) * 100);
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
        message: `Looks like you paid ₹${fromPaise(dup.amount_paise)} twice to ${dup.merchant} recently.`,
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
      const topCatTotal = fromPaise(topCat.total_paise);
      if (topCatTotal > 5000 && topCat.category !== 'Other') {
        insights.push({
          id: 'category-overspend',
          type: 'alert',
          title: `${topCat.category} Alert`,
          message: `You've spent ₹${topCatTotal.toLocaleString()} on ${topCat.category} this month.`,
        });
      }
    }

  } catch (error) {
    console.error('Insights generation error:', error);
  }

  return insights;
};
