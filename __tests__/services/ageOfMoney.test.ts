import { computeAgeOfMoney } from '../../src/services/ageOfMoney';
import type { Transaction } from '../../src/types/transaction';

const NOW = new Date('2026-08-13T12:00:00.000Z');

let seq = 0;
const tx = (
  type: Transaction['type'],
  rupees: number,
  isoDate: string,
): Transaction => ({
  id: `t${seq++}`,
  amountPaise: rupees * 100,
  type,
  category: 'Food',
  categoryId: 'c1',
  categoryIcon: 'utensils',
  date: isoDate,
});

/** Salary on the 1st, then `count` small expenses on the given day. */
const salaryThenSpends = (spendDay: string, count: number): Transaction[] => [
  tx('income', 50000, '2026-08-01T09:00:00.000Z'),
  ...Array.from({ length: count }, () => tx('expense', 500, spendDay)),
];

describe('computeAgeOfMoney', () => {
  it('reports the days between income arriving and being spent', () => {
    const result = computeAgeOfMoney(
      salaryThenSpends('2026-08-11T09:00:00.000Z', 4),
      NOW,
    );
    expect(result?.days).toBe(10);
  });

  it('says nothing when there are too few expenses to call it a trend', () => {
    expect(
      computeAgeOfMoney(salaryThenSpends('2026-08-11T09:00:00.000Z', 2), NOW),
    ).toBeNull();
  });

  it('says nothing when no income is on record', () => {
    const spendsOnly = Array.from({ length: 5 }, () =>
      tx('expense', 500, '2026-08-11T09:00:00.000Z'),
    );
    expect(computeAgeOfMoney(spendsOnly, NOW)).toBeNull();
  });

  it('skips spending it cannot trace to recorded income, rather than scoring it zero', () => {
    // ₹1,000 of income against ₹3,000 of spending: only the first two ₹500
    // expenses are funded, which is under MIN_SAMPLES, so no claim is made.
    const result = computeAgeOfMoney(
      [
        tx('income', 1000, '2026-08-01T09:00:00.000Z'),
        ...Array.from({ length: 6 }, () =>
          tx('expense', 500, '2026-08-11T09:00:00.000Z'),
        ),
      ],
      NOW,
    );
    expect(result).toBeNull();
  });

  it('draws from the oldest income first', () => {
    // Two lots 20 days apart. A ₹600 expense eats all of the ₹500 lot from the
    // 1st and ₹100 of the lot from the 21st, so its age is weighted toward the
    // older money: (500*20 + 100*0) / 600 ≈ 16.7 days.
    const result = computeAgeOfMoney(
      [
        tx('income', 500, '2026-08-01T00:00:00.000Z'),
        tx('income', 500, '2026-08-21T00:00:00.000Z'),
        tx('expense', 600, '2026-08-21T00:00:00.000Z'),
        tx('expense', 100, '2026-08-21T00:00:00.000Z'),
        tx('expense', 100, '2026-08-21T00:00:00.000Z'),
      ],
      new Date('2026-08-22T00:00:00.000Z'),
    );
    // (16.67 + 0 + 0) / 3 ≈ 5.6 → 6
    expect(result?.days).toBe(6);
  });

  it('does not count money moved into a goal as spending', () => {
    const withTransfer: Transaction[] = [
      ...salaryThenSpends('2026-08-11T09:00:00.000Z', 4),
      tx('transfer_to_goal', 10000, '2026-08-02T09:00:00.000Z'),
    ];
    expect(computeAgeOfMoney(withTransfer, NOW)?.days).toBe(10);
  });

  it('ignores transactions dated in the future', () => {
    const withFuture: Transaction[] = [
      ...salaryThenSpends('2026-08-11T09:00:00.000Z', 4),
      tx('expense', 500, '2026-09-30T09:00:00.000Z'),
    ];
    expect(computeAgeOfMoney(withFuture, NOW)?.days).toBe(10);
  });

  describe('tone', () => {
    const at = (spendDay: string) =>
      computeAgeOfMoney(salaryThenSpends(spendDay, 4), new Date('2026-10-01T00:00:00.000Z'));

    it('is bad inside a week', () => {
      expect(at('2026-08-04T09:00:00.000Z')?.tone).toBe('bad');
    });

    it('is a warning between a week and a month', () => {
      expect(at('2026-08-15T09:00:00.000Z')?.tone).toBe('warn');
    });

    it('is good at a month or more of buffer', () => {
      expect(at('2026-09-05T09:00:00.000Z')?.tone).toBe('good');
    });
  });

  it('writes a singular label for one day', () => {
    const result = computeAgeOfMoney(
      salaryThenSpends('2026-08-02T09:00:00.000Z', 4),
      NOW,
    );
    expect(result?.label).toBe('Money is 1 day old');
  });
});
