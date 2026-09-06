import {
  generateInsights,
  getPrimaryGoal,
} from '../../src/services/insightsEngine';
import { getDb } from '../../src/store/database';
import { useGoalStore } from '../../src/store/goalStore';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
  getPreference: jest.fn().mockResolvedValue(null),
  setPreference: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/FinancialLedgerService', () => ({
  FinancialLedgerService: {
    getGoalContributions: jest.fn().mockResolvedValue([]),
  },
}));

describe('insightsEngine', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-07-31T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calculates safe spending when income exceeds expenses', async () => {
    mockExecute.mockImplementation(query => {
      if (query.includes('budget_settings')) {
        return Promise.resolve({
          rows: [{ wants_percent: 30, needs_percent: 50, savings_percent: 20 }],
        });
      }
      if (query.includes("type = 'income'")) {
        return Promise.resolve({ rows: [{ total: 10000000 }] }); // ₹100,000
      }
      if (query.includes("type = 'expense'")) {
        return Promise.resolve({ rows: [{ total: 2000000 }] }); // ₹20,000
      }
      return Promise.resolve({ rows: [] });
    });

    const insights = await generateInsights();

    const safeSpendInsight = insights.find(i => i.id === 'safe-spending');
    expect(safeSpendInsight).toBeDefined();
    expect(safeSpendInsight?.title).toBe("Today's Plan Limit");
    // Days left in July from 31st = 1
    // Income left = 80000
    // Safe daily = 80000 / 1 = 80000
    expect(safeSpendInsight?.value).toBe('₹80,000');
  });

  it('warns when there is no income', async () => {
    mockExecute.mockImplementation(query => {
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
    mockExecute.mockImplementation((query, args) => {
      if (query.includes("type = 'income'")) {
        return Promise.resolve({ rows: [{ total: 5000000 }] }); // ₹50,000
      }
      if (query.includes('budget_bucket')) {
        // Needs + Wants bucket spend of ₹62,000 total against a ₹40,000 plan.
        if (args?.[0] === 'needs')
          return Promise.resolve({ rows: [{ total: 3100000 }] });
        if (args?.[0] === 'wants')
          return Promise.resolve({ rows: [{ total: 3100000 }] });
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const insights = await generateInsights();

    const overBudgetInsight = insights.find(i => i.id === 'over-budget');
    expect(overBudgetInsight).toBeDefined();
    expect(overBudgetInsight?.title).toBe('Over Budget');
    // ₹62,000 spent on needs+wants vs ₹40,000 plan = ₹22,000 over
    expect(overBudgetInsight?.message).toContain('₹22,000');
  });
});

describe('getPrimaryGoal', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    // getPrimaryGoal reads the goal store first and only hits the DB when it's
    // empty — without a reset, a previous test's loaded goals leak into the
    // "no goals" case and make it return a stale goal instead of null.
    useGoalStore.setState({ goals: [], isLoading: false, error: null });
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-07-31T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns the emergency fund even when another goal is closer to completion', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: 'car',
          name: 'Car',
          targetAmount: 100000,
          currentAmount: 90000,
          is_emergency_fund: 0,
        },
        {
          id: 'ef',
          name: 'Emergency Fund',
          targetAmount: 100000,
          currentAmount: 1000,
          is_emergency_fund: 1,
        },
      ],
    });

    const result = await getPrimaryGoal();

    expect(result?.id).toBe('ef');
  });

  it('returns null when there are no goals', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    expect(await getPrimaryGoal()).toBeNull();
  });
});
