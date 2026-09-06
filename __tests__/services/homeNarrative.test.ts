import {
  buildStatus,
  buildInsightPills,
  project,
  upcomingBills,
} from '../../src/services/homeNarrative';
import type { Bill } from '../../src/store/billStore';

const bill = (name: string, dueDay: number, amountPaise: number): Bill => ({
  id: name,
  name,
  amountPaise,
  dueDay,
  isRecurring: true,
});

// 15 June 2026 — mid-month, so elapsed fractions are unambiguous.
const NOW = new Date(2026, 5, 15);

describe('upcomingBills', () => {
  it('rolls a due day already past to next month instead of going negative', () => {
    const [due] = upcomingBills([bill('Rent', 3, 800000)], NOW);
    expect(due.daysAway).toBe(18); // 3 July
  });

  it('clamps a 31st due day to the last day of a short month', () => {
    const [due] = upcomingBills([bill('Card', 31, 500000)], new Date(2026, 3, 1));
    expect(due.daysAway).toBe(29); // 30 April
  });

  it('sorts by how soon, and drops anything past the window', () => {
    const due = upcomingBills(
      [bill('Far', 14, 100), bill('Soon', 17, 100)],
      NOW,
      7,
    );
    expect(due.map(d => d.name)).toEqual(['Soon']);
  });
});

describe('project', () => {
  it('extrapolates the current daily rate across the month', () => {
    // ₹3,000 over 15 of 30 days → ₹6,000 projected, ₹4,000 under a ₹10,000 plan.
    const result = project(300000, 1000000, NOW);
    expect(result?.projectedSpendPaise).toBe(600000);
    expect(result?.projectedSavingsPaise).toBe(400000);
  });

  it('refuses to extrapolate from a single day of evidence', () => {
    expect(project(50000, 1000000, new Date(2026, 5, 1))).toBeNull();
  });

  it('never projects negative savings', () => {
    expect(project(900000, 1000000, NOW)?.projectedSavingsPaise).toBe(0);
  });
});

describe('buildStatus', () => {
  const base = {
    spendPaise: 300000,
    planPaise: 1000000,
    safeTodayPaise: 50000,
    todaySpendPaise: 0,
    bills: [],
    now: NOW,
  };

  it('asks for income before it claims anything about a plan', () => {
    const status = buildStatus({ ...base, planPaise: 0 });
    expect(status.tone).toBe('neutral');
    expect(status.message).toMatch(/Add income/);
  });

  it('leads with being over plan, ahead of every other signal', () => {
    const status = buildStatus({
      ...base,
      spendPaise: 1200000,
      todaySpendPaise: 49000,
      bills: [bill('Rent', 16, 800000)],
    });
    expect(status.tone).toBe('bad');
    expect(status.message).toMatch(/₹2,000 over plan with 15 days to go/);
  });

  it('warns once today’s allowance is 60% gone', () => {
    const status = buildStatus({ ...base, todaySpendPaise: 30000 });
    expect(status.tone).toBe('warn');
    expect(status.message).toMatch(/60% of today’s budget/);
  });

  it('says today is spent rather than showing a negative allowance', () => {
    const status = buildStatus({ ...base, todaySpendPaise: 50000 });
    expect(status.tone).toBe('bad');
    expect(status.message).toMatch(/Today’s ₹500 is spent/);
  });

  it('surfaces the nearest bill when today is still fine', () => {
    const status = buildStatus({ ...base, bills: [bill('Rent', 18, 800000)] });
    expect(status.message).toBe('Rent (₹8,000) due in 3 days.');
  });

  it('states where the month lands when nothing needs attention', () => {
    const status = buildStatus(base);
    expect(status.tone).toBe('good');
    expect(status.message).toMatch(/₹7,000 under budget/);
    expect(status.message).toMatch(/finish the month with ₹4,000 unspent/);
  });

  it('says so plainly when there are no bills at all', () => {
    const status = buildStatus({ ...base, spendPaise: 990000 });
    expect(status.message).toBe('No bills due. You’re all set.');
  });
});

describe('buildInsightPills', () => {
  const base = {
    weekByCategory: [],
    bills: [],
    spendPaise: 300000,
    priorSpendSameSpanPaise: null,
    now: NOW,
  };

  it('collapses several bills into one count', () => {
    const pills = buildInsightPills({
      ...base,
      bills: [bill('Rent', 16, 100), bill('Phone', 17, 100)],
    });
    expect(pills[0].label).toBe('2 bills due this week');
  });

  it('ignores a month-on-month swing under 5%', () => {
    const pills = buildInsightPills({
      ...base,
      priorSpendSameSpanPaise: 310000,
    });
    expect(pills.find(p => p.id === 'vs-last-month')).toBeUndefined();
  });

  it('reports a real drop as good news', () => {
    const pills = buildInsightPills({
      ...base,
      priorSpendSameSpanPaise: 400000,
    });
    const pill = pills.find(p => p.id === 'vs-last-month');
    expect(pill?.tone).toBe('good');
    expect(pill?.label).toBe('₹1,000 less than last month');
  });

  it('takes only the top three categories of the week', () => {
    const pills = buildInsightPills({
      ...base,
      weekByCategory: [
        { name: 'food', amountPaise: 400 },
        { name: 'travel', amountPaise: 300 },
        { name: 'unknown', amountPaise: 200 },
        { name: 'bills', amountPaise: 100 },
      ],
    });
    const categories = pills.filter(p => p.id.startsWith('cat-'));
    expect(categories).toHaveLength(3);
    expect(categories[0].label).toMatch(/^Food/);
    expect(categories[2].label).toMatch(/^Uncategorized/);
  });
});

/**
 * The plan bar reports the month, the status line reports today, and they are
 * allowed to disagree. This shipped wrong twice: first coloured from unrelated
 * logic, then over-corrected into a single shared tone that painted the month
 * bar red because one day's allowance was gone. Both are regressions worth
 * catching.
 */
describe('span scoping: today vs the month', () => {
  it('reports today as spent while the month is still healthy', () => {
    const status = buildStatus({
      spendPaise: 495000, // ₹4,950 of a ₹48,800 plan — 10%
      planPaise: 4880000,
      safeTodayPaise: 244000,
      todaySpendPaise: 244000, // today's allowance fully used
      bills: [],
      now: NOW,
    });

    // Today is genuinely bad...
    expect(status.tone).toBe('bad');
    // ...and that must not be read as a verdict on the month, which has 90%
    // of its plan untouched. The plan bar derives its own tone from pace.
    expect(project(495000, 4880000, NOW)?.projectedSavingsPaise).toBeGreaterThan(0);
  });
});
