import { evaluateAmount, hasOperator } from '../../src/utils/amountExpression';
import { matchesSearch } from '../../src/utils/transactionSearch';
import { needsReview } from '../../src/utils/transactionReview';
import { groupTransactionsByDate } from '../../src/utils/groupTransactionsByDate';
import { Transaction } from '../../src/types/transaction';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: '1', amountPaise: 45000, type: 'expense', category: 'Food', categoryId: 'food',
  categoryIcon: 'food', description: 'Swiggy', paymentMethod: 'UPI', bankId: 'hdfc',
  date: new Date(2026, 9, 10, 12).toISOString(), ...over,
});

describe('evaluateAmount', () => {
  it.each([
    ['450', 450], ['450+120', 570], ['99*3-10', 287], ['1200/4', 300],
    ['10+2×3', 16], ['450+', 450], ['', 0], ['₹1,200', 1200], ['.5+.25', 0.75],
  ])('%s -> %s', (input, expected) => expect(evaluateAmount(input)).toBe(expected));

  it.each(['abc', '5+*3', '1/0', '5-9', '1.2.3'])('rejects %s', input =>
    expect(evaluateAmount(input)).toBeNull());

  it('detects an operator but not a leading minus-free number', () => {
    expect(hasOperator('450+1')).toBe(true);
    expect(hasOperator('450')).toBe(false);
  });
});

describe('matchesSearch', () => {
  it('matches merchant, category, bank and method', () => {
    ['swig', 'food', 'hdfc', 'upi'].forEach(q => expect(matchesSearch(tx(), q)).toBe(true));
  });
  it('matches by amount prefix, with rupee sign and commas', () => {
    expect(matchesSearch(tx(), '450')).toBe(true);
    expect(matchesSearch(tx({ amountPaise: 120000 }), '₹1,200')).toBe(true);
    expect(matchesSearch(tx(), '999')).toBe(false);
  });
  it('requires every word to match', () => {
    expect(matchesSearch(tx(), 'swiggy 450')).toBe(true);
    expect(matchesSearch(tx(), 'swiggy 999')).toBe(false);
  });
});

describe('needsReview', () => {
  it('flags unknown or empty categories only', () => {
    expect(needsReview(tx({ category: 'Unknown', categoryId: 'unknown' }))).toBe(true);
    expect(needsReview(tx({ category: '' }))).toBe(true);
    expect(needsReview(tx())).toBe(false);
    expect(needsReview(tx({ type: 'transfer_to_goal', category: 'Unknown' }))).toBe(false);
  });
});

describe('day net total', () => {
  it('is income minus expenses, ignoring goal transfers', () => {
    const rows = groupTransactionsByDate([
      tx({ id: 'a', type: 'income', amountPaise: 100000 }),
      tx({ id: 'b', amountPaise: 30000 }),
      tx({ id: 'c', type: 'transfer_to_goal', amountPaise: 5000 }),
    ]);
    expect(rows[0]).toMatchObject({ type: 'header', netPaise: 70000 });
  });
});
