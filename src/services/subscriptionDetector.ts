import { getDb } from '../store/database';

export interface DetectedSubscription {
  merchant: string;
  amount: number;
  frequencyCount: number;
  lastDate: string;
}

export const detectSubscriptions = async (): Promise<DetectedSubscription[]> => {
  const subscriptions: DetectedSubscription[] = [];
  const db = getDb();
  
  // Look back 90 days to find recurring identical amounts
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString();

  try {
    const result = await db.execute(`
      SELECT merchant, amount, COUNT(*) as frequencyCount, MAX(date) as lastDate
      FROM personal_transactions
      WHERE type = 'debit' AND date >= ?
      GROUP BY merchant, amount
      HAVING frequencyCount >= 2
      ORDER BY lastDate DESC
    `, [cutoff]);

    if (result.rows && result.rows.length > 0) {
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i] as any;
        
        // Filter out common high frequency low-value items like local shops
        // Usually subscriptions are > 50 and <= 5000, and merchants are known brands.
        // A simple heuristic for now.
        if (row.amount >= 49 && row.amount <= 5000) {
          subscriptions.push({
            merchant: row.merchant,
            amount: row.amount,
            frequencyCount: row.frequencyCount,
            lastDate: row.lastDate,
          });
        }
      }
    }
  } catch (e) {
    console.error('Subscription detection error:', e);
  }

  return subscriptions;
};
