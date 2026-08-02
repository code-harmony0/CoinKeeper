import { normalizedSimilarity, findMergeCandidates } from '../../src/utils/categorySimilarity';

describe('normalizedSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(normalizedSimilarity('Food', 'Food')).toBe(1);
  });

  it('returns a high score for near-identical names', () => {
    expect(normalizedSimilarity('Dining', 'Dinning')).toBeGreaterThan(0.7);
  });

  it('returns a low score for unrelated names', () => {
    expect(normalizedSimilarity('Food', 'Rent')).toBeLessThan(0.4);
  });
});

describe('findMergeCandidates', () => {
  it('pairs up categories above the similarity threshold', () => {
    const categories = [
      { id: 'a', name: 'Dining' },
      { id: 'b', name: 'Restaurants' },
      { id: 'c', name: 'Travel' },
    ];
    const pairs = findMergeCandidates(categories, 0.6);
    expect(pairs).toEqual([]);
  });

  it('flags a genuinely close pair', () => {
    const categories = [
      { id: 'a', name: 'Grocery' },
      { id: 'b', name: 'Groceries' },
      { id: 'c', name: 'Travel' },
    ];
    const pairs = findMergeCandidates(categories, 0.6);
    expect(pairs).toEqual([{ a: 'a', b: 'b', score: expect.any(Number) }]);
  });
});
