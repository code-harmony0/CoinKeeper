import { FinancialContextService } from '../../src/services/FinancialContextService';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('../../src/services/FinancialIntelligenceEngine', () => ({
  FinancialIntelligenceEngine: {
    getCurrentSnapshot: jest.fn().mockResolvedValue({ safeToSpend: 123400 }),
  },
}));

describe('FinancialContextService.buildContext', () => {
  let mockExecute: jest.Mock;

  const rows = {
    transactions: [] as any[],
    monthTotals: [] as any[],
    bills: [] as any[],
    accounts: [] as any[],
  };

  beforeEach(() => {
    rows.transactions = [];
    rows.monthTotals = [];
    rows.bills = [];
    rows.accounts = [];

    mockExecute = jest.fn(async (query: string) => {
      if (query.includes('FROM bills')) return { rows: rows.bills };
      if (query.includes('FROM income_accounts')) return { rows: rows.accounts };
      if (query.includes('GROUP BY type')) return { rows: rows.monthTotals };
      return { rows: rows.transactions };
    });
    (getDb as jest.Mock).mockReturnValue({ execute: mockExecute });

    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('sums unpaid bills from the bills table instead of a fixed amount', async () => {
    rows.bills = [
      // due on the 20th, not yet paid this cycle
      { id: 'b1', name: 'Rent', amount_paise: 5000000, due_day: 20, is_recurring: 1 },
      // due on the 10th, already paid this cycle
      {
        id: 'b2',
        name: 'Internet',
        amount_paise: 100000,
        due_day: 10,
        is_recurring: 1,
        last_paid_at: new Date('2026-07-11T00:00:00Z').getTime(),
      },
    ];

    const ctx = await FinancialContextService.buildContext();

    expect(ctx.upcomingBillsPaise).toBe(5000000);
  });

  it('reports zero upcoming bills when none are tracked', async () => {
    const ctx = await FinancialContextService.buildContext();

    expect(ctx.upcomingBillsPaise).toBe(0);
  });

  it('sums real account balances instead of a fixed amount', async () => {
    rows.accounts = [{ total: 3450099 }];

    const ctx = await FinancialContextService.buildContext();

    expect(ctx.totalBalancePaise).toBe(3450099);
  });

  it('totals income and expenses for the whole month, not just recent rows', async () => {
    rows.monthTotals = [
      { type: 'income', total: 8000000 },
      { type: 'expense', total: 2537550 },
    ];
    // Only two recent rows exist; the monthly totals must not be derived from them.
    rows.transactions = [
      {
        amount_paise: 20000,
        type: 'expense',
        category_id: 'food',
        description: 'Chai',
        occurred_at: new Date('2026-07-14T09:00:00Z').getTime(),
      },
    ];

    const ctx = await FinancialContextService.buildContext();

    expect(ctx.monthlyIncomePaise).toBe(8000000);
    expect(ctx.monthlyExpensesPaise).toBe(2537550);
  });

  it('keeps sub-rupee precision on recent transaction amounts', async () => {
    rows.transactions = [
      {
        amount_paise: 12550,
        type: 'expense',
        category_id: 'food',
        description: 'Chai',
        occurred_at: new Date('2026-07-14T09:00:00Z').getTime(),
      },
    ];

    const ctx = await FinancialContextService.buildContext();

    expect(ctx.recentTransactions).toEqual([
      {
        amountPaise: 12550,
        merchant: 'Chai',
        category: 'food',
        date: '2026-07-14',
      },
    ]);
  });

  it('passes safe-to-spend through from the intelligence snapshot', async () => {
    const ctx = await FinancialContextService.buildContext();

    expect(ctx.safeToSpendPaise).toBe(123400);
  });
});
