import {
  matchesAmountDateFilter,
  normalizeFilter,
  describeFilter,
  isFilterActive,
} from '../../src/utils/transactionFilters';
import { Transaction } from '../../src/types/transaction';

const tx = (date: string, amountPaise = 10000): Transaction => ({
  id: date,
  amountPaise,
  type: 'expense',
  category: 'food',
  categoryId: 'food',
  categoryIcon: 'food',
  date,
});

/** A timestamp at a given local hour on a given local day. */
const at = (y: number, m: number, d: number, hour: number): string =>
  new Date(y, m, d, hour, 30).toISOString();

describe('matchesAmountDateFilter — date range', () => {
  /**
   * The regression this exists for. A picker returns the chosen day carrying
   * the current time, so comparing raw instants made "From = To = today" a
   * range one instant wide that matched nothing — the single most obvious use
   * of a date filter returned an empty list.
   */
  it('includes the whole day when From and To are the same date', () => {
    const filter = {
      dateFromIso: at(2026, 7, 9, 17),
      dateToIso: at(2026, 7, 9, 17),
    };

    expect(matchesAmountDateFilter(tx(at(2026, 7, 9, 0)), filter)).toBe(true);
    expect(matchesAmountDateFilter(tx(at(2026, 7, 9, 12)), filter)).toBe(true);
    expect(matchesAmountDateFilter(tx(at(2026, 7, 9, 23)), filter)).toBe(true);
  });

  it('excludes the days either side of that range', () => {
    const filter = {
      dateFromIso: at(2026, 7, 9, 17),
      dateToIso: at(2026, 7, 9, 17),
    };

    expect(matchesAmountDateFilter(tx(at(2026, 7, 8, 23)), filter)).toBe(false);
    expect(matchesAmountDateFilter(tx(at(2026, 7, 10, 0)), filter)).toBe(false);
  });

  it('is inclusive at both ends of a multi-day range', () => {
    const filter = {
      dateFromIso: at(2026, 7, 8, 15),
      dateToIso: at(2026, 7, 10, 9),
    };

    expect(matchesAmountDateFilter(tx(at(2026, 7, 8, 0)), filter)).toBe(true);
    expect(matchesAmountDateFilter(tx(at(2026, 7, 10, 23)), filter)).toBe(true);
    expect(matchesAmountDateFilter(tx(at(2026, 7, 11, 0)), filter)).toBe(false);
  });

  it('still filters on amount', () => {
    expect(matchesAmountDateFilter(tx(at(2026, 7, 9, 9), 5000), { minAmountPaise: 10000 })).toBe(false);
    expect(matchesAmountDateFilter(tx(at(2026, 7, 9, 9), 20000), { maxAmountPaise: 10000 })).toBe(false);
    expect(matchesAmountDateFilter(tx(at(2026, 7, 9, 9), 10000), { minAmountPaise: 10000 })).toBe(true);
  });
});

describe('normalizeFilter', () => {
  it('swaps an inverted date range rather than matching nothing', () => {
    const result = normalizeFilter({
      dateFromIso: at(2026, 7, 20, 9),
      dateToIso: at(2026, 7, 10, 9),
    });
    expect(new Date(result.dateFromIso!).getDate()).toBe(10);
    expect(new Date(result.dateToIso!).getDate()).toBe(20);
  });

  it('swaps an inverted amount range', () => {
    const result = normalizeFilter({ minAmountPaise: 50000, maxAmountPaise: 1000 });
    expect(result.minAmountPaise).toBe(1000);
    expect(result.maxAmountPaise).toBe(50000);
  });

  it('drops a bound that is not a usable number', () => {
    // Money.toPaise('abc') is 0 — a min of 0 filters nothing and a max of 0
    // filters everything, so neither is a bound worth keeping.
    const result = normalizeFilter({ minAmountPaise: 0, maxAmountPaise: 0 });
    expect(result.minAmountPaise).toBeUndefined();
    expect(result.maxAmountPaise).toBeUndefined();
  });

  it('leaves a single-sided range alone', () => {
    const result = normalizeFilter({ minAmountPaise: 5000 });
    expect(result.minAmountPaise).toBe(5000);
    expect(result.maxAmountPaise).toBeUndefined();
  });
});

describe('describeFilter', () => {
  const money = (p: number) => `₹${p / 100}`;

  it('says nothing when the filter does nothing', () => {
    expect(describeFilter({}, money)).toBeNull();
    expect(isFilterActive({})).toBe(false);
  });

  it('reads a single day as "on", not a range', () => {
    const iso = at(2026, 7, 9, 12);
    expect(describeFilter({ dateFromIso: iso, dateToIso: iso }, money)).toMatch(/^on /);
  });

  it('describes open-ended bounds in plain words', () => {
    expect(describeFilter({ minAmountPaise: 5000 }, money)).toBe('over ₹50');
    expect(describeFilter({ maxAmountPaise: 5000 }, money)).toBe('under ₹50');
  });
});

describe('matchesCategory', () => {
  const { matchesCategory } = require('../../src/utils/transactionFilters');
  const tx = (category: string) => ({ category }) as any;

  it('keeps everything when no category is selected', () => {
    expect(matchesCategory(tx('Food'), null)).toBe(true);
    expect(matchesCategory(tx('Food'), '')).toBe(true);
  });

  it('matches the category exactly', () => {
    expect(matchesCategory(tx('Food'), 'Food')).toBe(true);
    expect(matchesCategory(tx('Transport'), 'Food')).toBe(false);
  });

  it('ignores case and surrounding space', () => {
    expect(matchesCategory(tx('Food'), ' food ')).toBe(true);
  });

  it('does not match on a partial name', () => {
    // Drilling into "Food" must not drag in "Food Court" or vice versa —
    // that looseness is why seeding the search box was the wrong shortcut.
    expect(matchesCategory(tx('Food Court'), 'Food')).toBe(false);
  });

  it('treats a transaction with no category as uncategorised, not a match', () => {
    expect(matchesCategory({} as any, 'Food')).toBe(false);
  });
});
