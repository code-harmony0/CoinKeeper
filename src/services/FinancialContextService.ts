import { getDb } from '../store/database';

export interface FinancialContext {
  totalBalancePaise: number;
  monthlyIncomePaise: number;
  monthlyExpensesPaise: number;
  upcomingBillsPaise: number;
  safeToSpendPaise: number;
  recentTransactions: {
    amount: number;
    merchant: string;
    category: string;
    date: string;
  }[];
}

export const FinancialContextService = {
  /**
   * Aggregates current financial state for AI prompts.
   */
  async buildContext(): Promise<FinancialContext> {
    const db = getDb();
    
    // Hardcoded for now. In a real app, query `transactions` and `bills`.
    // This provides the structural foundation for the LLM context payload.
    const result = await db.execute(`
      SELECT amount_paise, type, category_id, description, occurred_at 
      FROM transactions 
      ORDER BY occurred_at DESC 
      LIMIT 10
    `);
    
    const recentTx = ((result?.rows ?? []) as any[]).map(row => ({
      amount: row.amount_paise / 100,
      merchant: row.description,
      category: row.category_id,
      date: new Date(row.occurred_at).toISOString().split('T')[0],
      type: row.type
    }));

    let expenses = 0;
    let income = 0;
    recentTx.forEach(t => {
      if (t.type === 'expense') expenses += t.amount;
      if (t.type === 'income') income += t.amount;
    });

    // Mock calculations for safe to spend
    const upcomingBills = 4500; // Mock derived from `bills` table
    const totalBalance = 24000;
    const safeToSpend = totalBalance - upcomingBills;

    return {
      totalBalancePaise: totalBalance * 100,
      monthlyIncomePaise: income * 100,
      monthlyExpensesPaise: expenses * 100,
      upcomingBillsPaise: upcomingBills * 100,
      safeToSpendPaise: safeToSpend * 100,
      recentTransactions: recentTx.map(t => ({
        amount: t.amount,
        merchant: t.merchant,
        category: t.category,
        date: t.date
      }))
    };
  }
};
