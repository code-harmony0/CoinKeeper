import { getDb } from '../store/database';
import { v4 as uuidv4 } from 'uuid';
import {
  categoryCoverage,
  findFees,
  findRecurring,
  findSpendingSpike,
  type AnalysableTransaction,
} from './spendingAnalysis';
import { Money } from '../utils/money';

export interface FinancialInsight {
  id: string;
  type: 'anomaly' | 'warning' | 'milestone' | 'health';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  actionRoute?: string;
}

/** A category must rise by at least this much week-on-week to be worth surfacing. */
const ANOMALY_RISE_PCT = 40;

export const InsightEngine = {
  /**
   * Generates insights based on current data and saves them to cache.
   */
  async generateDailyInsights(): Promise<void> {
    const db = getDb();
    
    // The whole cache, not just the expired part. This regenerates every
    // insight below, so leaving the still-valid ones behind stacked a second
    // identical "Upcoming Bills" card on the screen each time it was opened.
    await db.execute('DELETE FROM financial_insights_cache');

    const insights: FinancialInsight[] = [];

    // 1. Check for upcoming bills (Warning)
    const billsResult = await db.execute('SELECT COUNT(*) as count FROM bills WHERE due_day > ? AND due_day <= ?', [
      new Date().getDate(),
      new Date().getDate() + 5
    ]);
    const billCount = ((billsResult?.rows?.[0] as any)?.count ?? 0) as number;
    
    if (billCount > 0) {
      insights.push({
        id: uuidv4(),
        type: 'warning',
        title: 'Upcoming Bills',
        description: `You have ${billCount} bill(s) due in the next 5 days. Ensure you have enough balance.`,
        severity: 'medium',
        actionRoute: 'Bills'
      });
    }

    // 2. Categories whose spending jumped against the previous week.
    // Derived from the ledger — never asserted. A category with no prior week
    // has nothing to compare against, so it is not an anomaly.
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const thisWeekStart = Date.now() - weekMs;
    const lastWeekStart = thisWeekStart - weekMs;

    const spendResult = await db.execute(
      `SELECT c.name AS category,
              SUM(CASE WHEN t.occurred_at >= ? THEN t.amount_paise ELSE 0 END) AS this_week,
              SUM(CASE WHEN t.occurred_at < ? THEN t.amount_paise ELSE 0 END) AS last_week
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'expense' AND t.occurred_at >= ?
       GROUP BY t.category_id;`,
      [thisWeekStart, thisWeekStart, lastWeekStart],
    );

    for (const row of ((spendResult?.rows ?? []) as any[])) {
      const lastWeek = row.last_week ?? 0;
      const thisWeek = row.this_week ?? 0;
      if (lastWeek <= 0 || thisWeek <= lastWeek) continue;

      const risePct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      if (risePct < ANOMALY_RISE_PCT) continue;

      insights.push({
        id: uuidv4(),
        type: 'anomaly',
        title: `${row.category ?? 'Uncategorised'} spending is up`,
        description: `You have spent ${risePct}% more on ${row.category ?? 'uncategorised items'} this week than last week.`,
        severity: risePct >= 100 ? 'high' : 'medium',
        actionRoute: 'Budget',
      });
    }

    // 3. Habits worked out from the whole ledger: what repeats, what the bank
    // took, which month broke pattern, and how much the app cannot yet explain.
    // Money lent out or coming back is left out — it is neither spending nor income.
    const ledgerResult = await db.execute(
      `SELECT t.id, t.amount_paise, t.type, c.name AS category, t.description, t.occurred_at
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE COALESCE(t.awaiting_return, 0) = 0 AND t.settlement_of IS NULL;`,
    );
    const ledger: AnalysableTransaction[] = ((ledgerResult?.rows ?? []) as any[]).map(row => ({
      id: row.id,
      amountPaise: row.amount_paise,
      type: row.type,
      category: row.category ?? undefined,
      description: row.description ?? undefined,
      date: new Date(row.occurred_at).toISOString(),
    }));
    const inr = (paise: number) => Money.format(paise, { zeroDecimals: true });

    const fees = findFees(ledger);
    if (fees.count > 0) {
      const biggest = fees.examples[0];
      insights.push({
        id: uuidv4(),
        type: 'warning',
        title: `${inr(fees.totalPaise)} went on bank charges`,
        description:
          `${fees.count} charge${fees.count === 1 ? '' : 's'} you never chose to spend on` +
          (biggest ? ` — the largest was ${inr(biggest.amountPaise)} for ${biggest.description}.` : '.'),
        severity: fees.totalPaise >= 100000 ? 'high' : 'medium',
        actionRoute: 'Transactions',
      });
    }

    const recurring = findRecurring(ledger);
    if (recurring.length > 0) {
      const top = recurring.slice(0, 3);
      insights.push({
        id: uuidv4(),
        type: 'health',
        title: `${recurring.length} payment${recurring.length === 1 ? '' : 's'} keep repeating`,
        description: top
          .map(r => `${r.payee}: ${inr(r.amountPaise)} × ${r.times} (${inr(r.totalPaise)} so far)`)
          .join('\n'),
        severity: 'medium',
        actionRoute: 'SuggestBills',
      });
    }

    const spike = findSpendingSpike(ledger);
    if (spike) {
      const times = Math.round(spike.month.spentPaise / spike.medianPaise);
      insights.push({
        id: uuidv4(),
        type: 'anomaly',
        title: `Spending is ${times}× your usual month`,
        description: `${inr(spike.month.spentPaise)} this month, against a typical ${inr(spike.medianPaise)}.`,
        severity: times >= 4 ? 'high' : 'medium',
        actionRoute: 'Reports',
      });
    }

    const coverage = categoryCoverage(ledger);
    if (coverage.unnamedShare >= 0.5) {
      insights.push({
        id: uuidv4(),
        type: 'warning',
        title: `${Math.round(coverage.unnamedShare * 100)}% of your spending has no category`,
        description:
          `${inr(coverage.unnamedPaise)} can't be broken down yet — most of it went to people rather than shops. ` +
          'Categorise your biggest payees and the app can tell you where your money really goes.',
        severity: 'low',
        actionRoute: 'Transactions',
      });
    }

    if (insights.length === 0) return;

    // Save to cache
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    await db.transaction(async tx => {
      for (const insight of insights) {
        await tx.execute(
          `INSERT INTO financial_insights_cache (id, type, title, description, severity, action_route, created_at, expires_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            insight.id,
            insight.type,
            insight.title,
            insight.description,
            insight.severity,
            insight.actionRoute || null,
            Date.now(),
            expiresAt
          ]
        );
      }
    });
  },

  /**
   * Fetches cached insights for the UI.
   */
  async getCachedInsights(): Promise<FinancialInsight[]> {
    const db = getDb();
    const result = await db.execute(
      'SELECT id, type, title, description, severity, action_route FROM financial_insights_cache WHERE expires_at > ? ORDER BY severity DESC',
      [Date.now()]
    );
    
    return ((result?.rows ?? []) as any[]).map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      severity: row.severity,
      actionRoute: row.action_route || undefined
    }));
  }
};
