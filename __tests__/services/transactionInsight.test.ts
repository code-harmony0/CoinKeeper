import { transactionInsight } from '../../src/services/transactionInsight';
import type { Transaction } from '../../src/types/transaction';

const NOW = new Date('2026-08-13T12:00:00.000Z').getTime();
const ago = (days: number): string => new Date(NOW - days * 86400000).toISOString();

let seq = 0;
const tx = (
  merchant: string,
  rupees: number,
  days: number,
  category = 'Food',
): Transaction => ({
  id: `t${seq++}`,
  amountPaise: rupees * 100,
  type: 'expense',
  category,
  categoryId: 'c1',
  categoryIcon: 'utensils',
  description: merchant,
  date: ago(days),
});

describe('transactionInsight', () => {
  it('surfaces a repeated merchant with the running total', () => {
    const swiggy = [tx('Swiggy', 350, 0), tx('Swiggy', 400, 2), tx('Swiggy', 490, 4)];
    expect(transactionInsight(swiggy[0], swiggy)).toBe(
      'Your 3rd Swiggy order this week — ₹1,240 altogether.',
    );
  });

  it('stays quiet below three, where a repeat is still a coincidence', () => {
    const swiggy = [tx('Swiggy', 350, 0), tx('Swiggy', 400, 2)];
    expect(transactionInsight(swiggy[0], swiggy)).toBeNull();
  });

  it('counts only the week leading up to that transaction', () => {
    const swiggy = [tx('Swiggy', 350, 0), tx('Swiggy', 400, 2), tx('Swiggy', 490, 30)];
    expect(transactionInsight(swiggy[0], swiggy)).toBeNull();
  });

  it('describes an old transaction by its own week, not this one', () => {
    // Three orders clustered a month ago. Opening the newest of them should
    // still report the pattern it was part of.
    const old = [tx('Swiggy', 100, 30), tx('Swiggy', 100, 32), tx('Swiggy', 100, 34)];
    expect(transactionInsight(old[0], old)).toBe(
      'Your 3rd Swiggy order this week — ₹300 altogether.',
    );
  });

  it('falls back to the category when there is no usable merchant', () => {
    const cash = [
      tx('Unknown', 100, 0),
      tx('Unknown', 200, 1),
      tx('Unknown', 300, 2),
    ];
    expect(transactionInsight(cash[0], cash)).toBe(
      'Your 3rd Food expense this week — ₹600 altogether.',
    );
  });

  it('does not mix merchants together', () => {
    const mixed = [
      tx('Swiggy', 350, 0),
      tx('Zomato', 400, 1),
      tx('Amazon', 490, 2),
    ];
    expect(transactionInsight(mixed[0], mixed)).toBeNull();
  });

  it('says nothing about income or goal transfers', () => {
    const income: Transaction = { ...tx('Salary', 50000, 0), type: 'income' };
    expect(transactionInsight(income, [income, income, income])).toBeNull();
  });

  it('writes correct ordinals past 3', () => {
    const many = Array.from({ length: 11 }, (_, i) => tx('Swiggy', 100, i * 0.5));
    expect(transactionInsight(many[0], many)).toContain('Your 11th Swiggy order');
  });

  it('never delivers a verdict, only arithmetic', () => {
    const swiggy = Array.from({ length: 8 }, (_, i) => tx('Swiggy', 900, i * 0.5));
    const line = transactionInsight(swiggy[0], swiggy) ?? '';
    expect(line).not.toMatch(/too much|excessive|should|stop|careful|warning/i);
  });
});
