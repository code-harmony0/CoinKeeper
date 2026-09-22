import { InsightEngine } from '../../src/services/InsightEngine';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
}));

describe('InsightEngine.generateDailyInsights', () => {
  let mockExecute: jest.Mock;
  let inserted: any[][];

  const rows = {
    bills: [{ count: 0 }] as any[],
    weekly: [] as any[],
  };

  const titles = () => inserted.map(params => params[2]);
  const insightFor = (title: string) => inserted.find(params => params[2] === title);

  beforeEach(() => {
    inserted = [];
    rows.bills = [{ count: 0 }];
    rows.weekly = [];

    mockExecute = jest.fn(async (query: string) => {
      if (query.includes('FROM bills')) return { rows: rows.bills };
      // The whole-ledger habits query also joins on category_id; answer it
      // first so the weekly-anomaly rows are not mistaken for a ledger.
      if (query.includes('awaiting_return')) return { rows: [] };
      if (query.includes('category_id')) return { rows: rows.weekly };
      return { rows: [] };
    });

    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
      transaction: async (fn: any) =>
        fn({
          execute: async (_q: string, params: any[]) => {
            inserted.push(params);
            return { rows: [] };
          },
        }),
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('produces no insights when there is nothing to report', async () => {
    await InsightEngine.generateDailyInsights();

    expect(inserted).toHaveLength(0);
  });

  it('flags a category whose spending rose sharply against last week', async () => {
    rows.weekly = [
      { category: 'Food', this_week: 400000, last_week: 200000 },
    ];

    await InsightEngine.generateDailyInsights();

    const anomaly = insightFor('Food spending is up');
    expect(anomaly).toBeDefined();
    expect(anomaly![3]).toContain('100%');
    expect(anomaly![1]).toBe('anomaly');
  });

  it('ignores a category that only rose slightly', async () => {
    rows.weekly = [{ category: 'Food', this_week: 210000, last_week: 200000 }];

    await InsightEngine.generateDailyInsights();

    expect(titles()).toHaveLength(0);
  });

  it('ignores a brand-new category with no prior week to compare against', async () => {
    rows.weekly = [{ category: 'Travel', this_week: 500000, last_week: 0 }];

    await InsightEngine.generateDailyInsights();

    expect(titles()).toHaveLength(0);
  });

  it('still reports bills due in the next five days', async () => {
    rows.bills = [{ count: 2 }];

    await InsightEngine.generateDailyInsights();

    expect(titles()).toContain('Upcoming Bills');
  });
});
