import { generateInsights, getBudgetStreak } from '../../src/services/insightsEngine';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
}));

describe('insightsEngine', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calculates safe spending when income exceeds expenses', async () => {
    mockExecute.mockImplementation((query) => {
      if (query.includes('budget_settings')) {
        return Promise.resolve({ rows: [{ wants_percent: 30, needs_percent: 50, savings_percent: 20 }] });
      }
      if (query.includes("type = 'income'")) {
        return Promise.resolve({ rows: [{ total_paise: 10000000 }] }); // ₹100,000
      }
      if (query.includes("type = 'expense'")) {
        return Promise.resolve({ rows: [{ total_paise: 2000000 }] }); // ₹20,000
      }
      return Promise.resolve({ rows: [] });
    });

    const insights = await generateInsights();
    
    const safeSpendInsight = insights.find(i => i.id === 'safe-spending');
    expect(safeSpendInsight).toBeDefined();
    expect(safeSpendInsight?.title).toBe('Daily Safe Spending');
    // Days left in July from 31st = 1
    // Income left = 80000
    // Safe daily = 80000 / 1 = 80000
    expect(safeSpendInsight?.value).toBe('₹80,000');
  });

  it('warns when there is no income', async () => {
    mockExecute.mockImplementation((query) => {
      if (query.includes("type = 'income'")) {
        return Promise.resolve({ rows: [{ total_paise: 0 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const insights = await generateInsights();
    
    const noIncomeInsight = insights.find(i => i.id === 'no-income');
    expect(noIncomeInsight).toBeDefined();
    expect(noIncomeInsight?.title).toBe('No Income Recorded');
  });

  it('alerts when expenses exceed income', async () => {
    mockExecute.mockImplementation((query) => {
      if (query.includes("type = 'income'")) {
        return Promise.resolve({ rows: [{ total_paise: 5000000 }] }); // ₹50,000
      }
      if (query.includes("type = 'expense'")) {
        return Promise.resolve({ rows: [{ total_paise: 6000000 }] }); // ₹60,000
      }
      return Promise.resolve({ rows: [] });
    });

    const insights = await generateInsights();
    
    const overBudgetInsight = insights.find(i => i.id === 'over-budget');
    expect(overBudgetInsight).toBeDefined();
    expect(overBudgetInsight?.title).toBe('Over Budget');
    expect(overBudgetInsight?.message).toContain('₹10,000');
  });
});
