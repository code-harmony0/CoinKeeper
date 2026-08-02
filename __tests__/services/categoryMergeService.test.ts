const mockExecute = jest.fn();
const mockTransaction = jest.fn(async (fn: any) => fn({ execute: mockExecute }));
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute, transaction: mockTransaction }),
}));

import { mergeCategories } from '../../src/services/categoryMergeService';

describe('mergeCategories', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockTransaction.mockClear();
  });

  it('reassigns transactions and all four merchant-learning tables before deleting the source category', async () => {
    mockExecute.mockResolvedValue({});

    await mergeCategories('source-id', 'target-id');

    const sql = mockExecute.mock.calls.map(c => c[0]);
    expect(sql.some(s => s.includes('UPDATE transactions'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE merchant_learning'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE favorite_merchants'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE recent_merchants'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE merchant_category_map'))).toBe(true);
    expect(sql.some(s => s.includes('DELETE FROM categories'))).toBe(true);
  });

  it('runs inside a single transaction', async () => {
    mockExecute.mockResolvedValue({});
    await mergeCategories('source-id', 'target-id');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('propagates a failure instead of swallowing it', async () => {
    mockExecute.mockRejectedValue(new Error('locked'));
    await expect(mergeCategories('source-id', 'target-id')).rejects.toThrow('locked');
  });
});
