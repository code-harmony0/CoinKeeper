import { groupTransactionsByDate } from '../../src/utils/groupTransactionsByDate';
import { Transaction } from '../../src/types/transaction';

const tx = (id: string, date: string): Transaction => ({
  id, amountPaise: 100, type: 'expense', category: 'Food', categoryId: 'food', categoryIcon: 'food', date,
});

/** A timestamp at a given local hour on a given local day. */
const atLocalHour = (y: number, m: number, d: number, hour: number): string =>
  new Date(y, m, d, hour, 30).toISOString();

describe('groupTransactionsByDate', () => {
  it('groups same-day transactions under one header, preserving list order', () => {
    const input = [
      tx('1', atLocalHour(2026, 6, 31, 9)),
      tx('2', atLocalHour(2026, 6, 31, 18)),
      tx('3', atLocalHour(2026, 6, 30, 9)),
    ];

    const result = groupTransactionsByDate(input);

    expect(result.filter(r => r.type === 'header')).toHaveLength(2);
    expect(result.map(r => (r.type === 'row' ? r.tx.id : 'H'))).toEqual([
      'H', '1', '2', 'H', '3',
    ]);
  });

  /**
   * The regression this file exists for. The key was sliced off the UTC date
   * while the label was formatted in local time, so in any timezone east of
   * UTC an evening transaction and the following morning's landed in two
   * groups carrying the identical label — the list rendered "9 August 2026"
   * twice, one directly above the other.
   */
  it('never emits two headers for the same local day', () => {
    const input = [
      tx('late', atLocalHour(2026, 7, 9, 0)), // 00:30 local
      tx('mid', atLocalHour(2026, 7, 9, 10)), // 10:30 local
      tx('night', atLocalHour(2026, 7, 9, 23)), // 23:30 local
    ];

    const headers = groupTransactionsByDate(input).filter(
      r => r.type === 'header',
    );

    expect(headers).toHaveLength(1);
  });

  it('never emits two headers carrying the same label', () => {
    const input = [
      tx('a', atLocalHour(2026, 7, 9, 23)),
      tx('b', atLocalHour(2026, 7, 9, 1)),
      tx('c', atLocalHour(2026, 7, 8, 23)),
      tx('d', atLocalHour(2026, 7, 8, 1)),
    ];

    const labels = groupTransactionsByDate(input)
      .filter(r => r.type === 'header')
      .map(r => (r.type === 'header' ? r.label : ''));

    expect(new Set(labels).size).toBe(labels.length);
  });

  it('calls the user’s own day "Today", not the UTC day', () => {
    // 23:30 local is already tomorrow in UTC for any timezone east of ~UTC+1.
    const now = new Date(2026, 7, 9, 23, 45);
    const result = groupTransactionsByDate(
      [tx('t', atLocalHour(2026, 7, 9, 23))],
      now,
    );

    expect(result[0]).toMatchObject({ type: 'header', label: 'Today' });
  });

  it('returns an empty array for no transactions', () => {
    expect(groupTransactionsByDate([])).toEqual([]);
  });
});
