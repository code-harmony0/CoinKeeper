import { getDb } from '../store/database';
import { v4 as uuidv4 } from 'uuid';

export interface FinancialInsight {
  id: string;
  type: 'anomaly' | 'warning' | 'milestone' | 'health';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  actionRoute?: string;
}

export const InsightEngine = {
  /**
   * Generates insights based on current data and saves them to cache.
   */
  async generateDailyInsights(): Promise<void> {
    const db = getDb();
    
    // Clear old insights
    await db.execute('DELETE FROM financial_insights_cache WHERE expires_at < ?', [Date.now()]);

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

    // 2. High spending anomaly (Anomaly)
    // Mock logic for demonstration
    insights.push({
      id: uuidv4(),
      type: 'anomaly',
      title: 'High Spending in Food',
      description: 'You have spent 30% more on food this week compared to last week.',
      severity: 'high',
      actionRoute: 'Budget'
    });

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
