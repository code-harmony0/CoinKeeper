import { resolveCategory, UNKNOWN } from '../../src/services/categoryResolver';

const CATEGORIES = [
  { id: 'food', name: 'Food' },
  { id: 'transport', name: 'Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'bills', name: 'Bills' },
];

describe('resolveCategory', () => {
  it('matches a merchant that is literally a category name', () => {
    // The exact case from the shipped screenshots: typing "food" while a
    // Food category exists produced "unknown".
    expect(resolveCategory('food', CATEGORIES)?.categoryId).toBe('food');
  });

  it('is case and whitespace insensitive', () => {
    expect(resolveCategory('  FOOD ', CATEGORIES)?.categoryId).toBe('food');
  });

  it('matches a known Indian merchant via the keyword seed', () => {
    expect(resolveCategory('Swiggy', CATEGORIES)?.categoryId).toBe('food');
    expect(resolveCategory('Ola cabs', CATEGORIES)?.categoryId).toBe('transport');
  });

  it('tolerates a typo within the fuzzy threshold', () => {
    expect(resolveCategory('shoping', CATEGORIES)?.categoryId).toBe('shopping');
  });

  it('returns null rather than guessing at an unrelated string', () => {
    expect(resolveCategory('qwertyuiop', CATEGORIES)).toBeNull();
  });

  it('never resolves to the unknown bucket', () => {
    const withUnknown = [...CATEGORIES, { id: 'u1', name: UNKNOWN }];
    expect(resolveCategory('unknown', withUnknown)).toBeNull();
  });

  it('reports which rung matched so the UI can explain itself', () => {
    expect(resolveCategory('food', CATEGORIES)?.reason).toBe('name');
    expect(resolveCategory('swiggy', CATEGORIES)?.reason).toBe('keyword');
    expect(resolveCategory('shoping', CATEGORIES)?.reason).toBe('fuzzy');
  });

  it('reads a brand-prefixed service by what it actually is', () => {
    // "Jio-bp Pump" is a petrol pump. Taking the first keyword filed every
    // fill-up under Bills because the name starts with a telecom brand.
    expect(resolveCategory('Jio-bp Pump', CATEGORIES)?.categoryId).toBe('transport');
  });

  it('recognises a recharge by what the message says, not by its amount', () => {
    expect(resolveCategory('Airtel Mobile', CATEGORIES)?.categoryId).toBe('bills');
    expect(resolveCategory('Jio Prepaid Recharges', CATEGORIES)?.categoryId).toBe('bills');
    expect(resolveCategory('Airtel Wi-Fi', CATEGORIES)?.categoryId).toBe('bills');
  });

  it('skips a keyword whose category is not in this user list', () => {
    // No Health category present, so a pharmacy must not resolve anywhere else.
    expect(resolveCategory('Apollo Pharmacy', CATEGORIES)).toBeNull();
  });

  it('ignores empty and whitespace-only merchants', () => {
    expect(resolveCategory('', CATEGORIES)).toBeNull();
    expect(resolveCategory('   ', CATEGORIES)).toBeNull();
  });
});
