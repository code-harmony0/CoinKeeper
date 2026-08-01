import { MerchantLearningService } from '../services/MerchantLearningService';
import { getDb } from '../store/database';

jest.mock('../store/database', () => ({
  getDb: jest.fn(),
}));

describe('MerchantLearningService', () => {
  let mockExecute: jest.Mock;
  let mockTransaction: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    mockTransaction = jest.fn(async (cb) => {
      await cb({ execute: mockExecute });
    });
    
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
      transaction: mockTransaction,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeMerchant', () => {
    it('removes special characters and extra spaces', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] }); // No alias found
      const result = await MerchantLearningService.normalizeMerchant(' UBER *TRIP  ');
      expect(result).toBe('uber trip');
    });

    it('returns alias if found in database', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ normalized_name: 'uber' }] });
      const result = await MerchantLearningService.normalizeMerchant('UBER *123');
      expect(result).toBe('uber');
    });
  });

  describe('predictCategory', () => {
    it('returns category from exact mapping', async () => {
      // normalize mock
      mockExecute.mockResolvedValueOnce({ rows: [] });
      // exact match mock
      mockExecute.mockResolvedValueOnce({ rows: [{ category_id: 'transport' }] });
      
      const result = await MerchantLearningService.predictCategory('Uber');
      expect(result.categoryId).toBe('transport');
      expect(result.confidence).toBe(100);
    });

    it('returns category from learning table if no exact map', async () => {
      // normalize
      mockExecute.mockResolvedValueOnce({ rows: [] });
      // map check
      mockExecute.mockResolvedValueOnce({ rows: [] });
      // learning table check
      mockExecute.mockResolvedValueOnce({ rows: [{ category_id: 'food', confidence: 90 }] });
      
      const result = await MerchantLearningService.predictCategory('Swiggy Instamart');
      expect(result.categoryId).toBe('food');
      expect(result.confidence).toBe(90);
    });

    it('falls back to heuristics', async () => {
      // normalize
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockExecute.mockResolvedValueOnce({ rows: [] });
      
      const result = await MerchantLearningService.predictCategory('Zomato Limited');
      expect(result.categoryId).toBe('food');
      expect(result.confidence).toBe(80);
    });
  });
});
