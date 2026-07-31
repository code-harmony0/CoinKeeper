const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

import { suggestCategoryForMerchant, recordMerchantCategory } from '../../src/services/categorizationService';

describe('categorizationService', () => {
  beforeEach(() => mockExecute.mockReset());

  it('returns null for an empty merchant name without querying the DB', async () => {
    expect(await suggestCategoryForMerchant('')).toBeNull();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns the mapped category when merchant_category_map has a match', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ id: 'transport', name: 'Transport', icon: 'car' }],
    });

    const result = await suggestCategoryForMerchant('Uber');

    expect(result).toEqual({ id: 'transport', name: 'Transport', icon: 'car' });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('merchant_category_map'),
      ['uber'],
    );
  });

  it('returns null when no mapping exists, without throwing', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    expect(await suggestCategoryForMerchant('Some New Shop')).toBeNull();
  });

  it('recordMerchantCategory upserts by merchant name, lowercased', async () => {
    mockExecute.mockResolvedValueOnce({});
    await recordMerchantCategory('Uber', 'transport');

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO merchant_category_map'),
      ['uber', 'transport', expect.any(Number)],
    );
  });
});
