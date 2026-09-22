import { projectMonthEnd } from '../../src/services/monthEndForecast';

const spend = (date: string, amountPaise: number) => ({
  id: date + amountPaise, amountPaise, type: 'expense' as const, description: 'x', date,
});

describe('projectMonthEnd', () => {
  it('returns null with no plan set', () => {
    const now = new Date(2026, 8, 10); // 10 Sep
    const tx = [spend('2026-09-01', 100000), spend('2026-09-05', 100000)];
    expect(projectMonthEnd(tx, 0, 0, now)).toBeNull();
  });

  it('returns null before three days of the month have elapsed', () => {
    const now = new Date(2026, 8, 2); // 2 Sep — only 2 days elapsed
    expect(projectMonthEnd([spend('2026-09-01', 50000)], 500000, 0, now)).toBeNull();
  });

  it('projects under plan when the pace is light', () => {
    // 4 days elapsed, ₹400 spent so far -> ₹100/day -> 30-day month projects ₹3,000.
    const now = new Date(2026, 8, 4); // 4 Sep, September has 30 days
    const tx = [spend('2026-09-01', 40000)];
    const result = projectMonthEnd(tx, 500000, 0, now);
    expect(result).toMatchObject({ projectedSpendPaise: 300000, status: 'under', diffPaise: 200000 });
  });

  it('projects over plan when the pace is heavy', () => {
    const now = new Date(2026, 8, 4);
    const tx = [spend('2026-09-01', 200000)];
    const result = projectMonthEnd(tx, 300000, 0, now);
    expect(result).toMatchObject({ status: 'over' });
    expect(result!.projectedSpendPaise).toBe(1500000);
  });

  it('adds unpaid bills on top of the paced projection, without double-counting', () => {
    const now = new Date(2026, 8, 4);
    const tx = [spend('2026-09-01', 40000)]; // paces to ₹3,000
    const result = projectMonthEnd(tx, 500000, 100000, now); // +₹1,000 unpaid bill
    expect(result!.projectedSpendPaise).toBe(400000); // 3000 + 1000, not more
  });

  it('ignores income and goal transfers when pacing spend', () => {
    const now = new Date(2026, 8, 4);
    const tx = [
      spend('2026-09-01', 40000),
      { id: 'sal', amountPaise: 5000000, type: 'income' as const, description: 'x', date: '2026-09-02' },
    ];
    const result = projectMonthEnd(tx, 500000, 0, now);
    expect(result!.projectedSpendPaise).toBe(300000);
  });
});
