import { getDb } from '../store/database';

export interface DetectedSubscription {
  merchant: string;
  amountPaise: number;
  frequencyCount: number;
  lastDate: number;
  intervalDays: number;
}

let idCounter = 0;
const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${idCounter++}`;

export const detectSubscriptions = async (): Promise<DetectedSubscription[]> => {
  const subscriptions: DetectedSubscription[] = [];
  const db = getDb();
  
  // Look back 120 days
  const now = new Date();
  const cutoffMs = now.getTime() - (120 * 24 * 60 * 60 * 1000);

  try {
    // 1. Find potential recurring transactions
    // Same description, same amount, amount between 49 and 5000 INR (4900 to 500000 paise)
    // At least 2 occurrences
    const result = await db.execute(`
      SELECT description as merchant, amount_paise, COUNT(*) as frequencyCount, MAX(occurred_at) as lastDate
      FROM transactions
      WHERE type = 'expense' 
        AND occurred_at >= ?
        AND description IS NOT NULL
        AND amount_paise BETWEEN 4900 AND 500000
      GROUP BY description, amount_paise
      HAVING frequencyCount >= 2
    `, [cutoffMs]);

    if (!result.rows || result.rows.length === 0) return [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i] as any;
      
      // 2. Fetch all occurrences for this specific merchant and amount to check intervals
      const txResult = await db.execute(`
        SELECT occurred_at 
        FROM transactions 
        WHERE type = 'expense' 
          AND occurred_at >= ? 
          AND description = ? 
          AND amount_paise = ?
        ORDER BY occurred_at DESC
      `, [cutoffMs, row.merchant, row.amount_paise]);

      const occurrences = (txResult.rows || []).map((r: any) => r.occurred_at as number);
      
      if (occurrences.length < 2) continue;

      let totalIntervals = 0;
      let intervalCount = 0;

      for (let j = 0; j < occurrences.length - 1; j++) {
        const diffMs = occurrences[j] - occurrences[j+1];
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        totalIntervals += diffDays;
        intervalCount++;
      }

      const avgInterval = totalIntervals / intervalCount;

      // 3. Check against §7.10 interval bands
      const isWeekly = Math.abs(avgInterval - 7) <= 2;
      const isBiweekly = Math.abs(avgInterval - 14) <= 3;
      const isMonthly = Math.abs(avgInterval - 30) <= 5;
      const isYearly = Math.abs(avgInterval - 365) <= 15;

      if (isWeekly || isBiweekly || isMonthly || isYearly) {
        let cycle = 'monthly';
        if (isWeekly) cycle = 'weekly';
        else if (isBiweekly) cycle = 'biweekly';
        else if (isYearly) cycle = 'yearly';

        const sub = {
          merchant: row.merchant,
          amountPaise: row.amount_paise,
          frequencyCount: row.frequencyCount,
          lastDate: row.lastDate,
          intervalDays: avgInterval,
        };
        subscriptions.push(sub);

        // 4. Save to subscriptions table
        // Avoid inserting if it already exists. We use name + amount as unique.
        const existing = await db.execute(
          'SELECT id FROM subscriptions WHERE name = ? AND amount_paise = ?', 
          [sub.merchant, sub.amountPaise]
        );

        if (!existing.rows || existing.rows.length === 0) {
          // Calculate next due date (approximate based on last date + avg interval)
          const nextDueDate = new Date(sub.lastDate + (avgInterval * 24 * 60 * 60 * 1000)).toISOString();
          await db.execute(`
            INSERT INTO subscriptions (id, name, amount_paise, cycle, nextDueDate, isAutoDetected, isActive)
            VALUES (?, ?, ?, ?, ?, 1, 1)
          `, [
            generateId(),
            sub.merchant,
            sub.amountPaise,
            cycle,
            nextDueDate
          ]);
        }
      }
    }
  } catch (e) {
    console.error('[subscriptionDetector] Error:', e);
  }

  return subscriptions;
};
