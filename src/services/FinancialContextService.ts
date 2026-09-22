import { getDb } from '../store/database';
import { FinancialIntelligenceEngine } from './FinancialIntelligenceEngine';
import { billsSummary } from './billSchedule';
import type { Bill } from '../store/billStore';

export interface FinancialContext {
  totalBalancePaise: number;
  monthlyIncomePaise: number;
  monthlyExpensesPaise: number;
  upcomingBillsPaise: number;
  safeToSpendPaise: number;
  recentTransactions: {
    amountPaise: number;
    merchant: string;
    category: string;
    date: string;
  }[];
}

const monthStart = (now: Date): number =>
  new Date(now.getFullYear(), now.getMonth(), 1).getTime();

export const FinancialContextService = {
  /**
   * Aggregates current financial state — the only payload that ever describes
   * the user's money to a summarising layer. Every figure is read from the
   * database so it agrees with what the rest of the app shows.
   */
  async buildContext(): Promise<FinancialContext> {
    const db = getDb();
    const now = new Date();

    const [recent, totals, bills, accounts, snapshot] = await Promise.all([
      db.execute(
        `SELECT amount_paise, type, category_id, description, occurred_at
         FROM transactions
         ORDER BY occurred_at DESC
         LIMIT 10;`,
      ),
      db.execute(
        `SELECT type, SUM(amount_paise) AS total
         FROM transactions
         WHERE occurred_at >= ?
         GROUP BY type;`,
        [monthStart(now)],
      ),
      db.execute('SELECT * FROM bills;'),
      db.execute('SELECT SUM(balance_paise) AS total FROM income_accounts;'),
      FinancialIntelligenceEngine.getCurrentSnapshot(),
    ]);

    let monthlyIncomePaise = 0;
    let monthlyExpensesPaise = 0;
    for (const row of (totals?.rows ?? []) as any[]) {
      if (row.type === 'income') monthlyIncomePaise = row.total ?? 0;
      if (row.type === 'expense') monthlyExpensesPaise = row.total ?? 0;
    }

    const billRows = ((bills?.rows ?? []) as any[]).map(
      (row): Bill => ({
        id: row.id,
        name: row.name,
        amountPaise: row.amount_paise,
        dueDay: row.due_day,
        isRecurring: row.is_recurring === 1,
        lastPaidAt: row.last_paid_at ?? undefined,
      }),
    );

    return {
      totalBalancePaise: ((accounts?.rows ?? []) as any[])[0]?.total ?? 0,
      monthlyIncomePaise,
      monthlyExpensesPaise,
      upcomingBillsPaise: billsSummary(billRows, now).unpaidPaise,
      safeToSpendPaise: snapshot.safeToSpend,
      recentTransactions: ((recent?.rows ?? []) as any[]).map(row => ({
        amountPaise: row.amount_paise,
        merchant: row.description,
        category: row.category_id,
        date: new Date(row.occurred_at).toISOString().split('T')[0],
      })),
    };
  },
};
