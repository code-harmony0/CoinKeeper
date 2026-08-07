import { groupTransactionsByDate } from '../../src/utils/groupTransactionsByDate';
import { Transaction } from '../../src/types/transaction';

const tx = (id: string, date: string): Transaction => ({
  id, amountPaise: 100, type: 'expense', category: 'Food', categoryIcon: 'food', date,
});

describe('groupTransactionsByDate', () => {
  it('groups same-day transactions under one header, preserving list order', () => {
    const input = [
      tx('1', '2026-07-31T09:00:00.000Z'),
      tx('2', '2026-07-31T18:00:00.000Z'),
      tx('3', '2026-07-30T09:00:00.000Z'),
    ];

    const result = groupTransactionsByDate(input);

    expect(result).toEqual([
      { type: 'header', label: expect.any(String), key: 'header-2026-07-31' },
      { type: 'row', tx: input[0], key: '1' },
      { type: 'row', tx: input[1], key: '2' },
      { type: 'header', label: expect.any(String), key: 'header-2026-07-30' },
      { type: 'row', tx: input[2], key: '3' },
    ]);
  });

  it('returns an empty array for no transactions', () => {
    expect(groupTransactionsByDate([])).toEqual([]);
  });
});
