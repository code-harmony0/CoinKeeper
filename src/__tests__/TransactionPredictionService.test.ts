import { TransactionPredictionService } from '../services/TransactionPredictionService';
import { MerchantLearningService } from '../services/MerchantLearningService';
import { getDb } from '../store/database';
import { TransactionDraft } from '../types/transactionDraft';

jest.mock('../store/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('../services/MerchantLearningService', () => ({
  MerchantLearningService: {
    predictCategory: jest.fn()
  }
}));

describe('TransactionPredictionService', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    jest.clearAllMocks();
  });

  describe('predict', () => {
    it('predicts category from MerchantLearningService if missing', async () => {
      (MerchantLearningService.predictCategory as jest.Mock).mockResolvedValue({
        categoryId: 'food',
        confidence: 85
      });
      // dup check mock
      mockExecute.mockResolvedValue({ rows: [] });

      const draft: TransactionDraft = {
        id: '1',
        source: 'manual',
        merchant_name: 'Zomato',
        draft_status: 'editing'
      };

      const result = await TransactionPredictionService.predict(draft);
      
      expect(result.categoryId).toBe('food');
      expect(result.confidence).toBe(85);
      expect(result.predictionReason).toContain('Based on your previous transactions at Zomato');
      expect(result.isDuplicate).toBe(false);
    });

    it('flags duplicate if exact amount and merchant seen recently', async () => {
      (MerchantLearningService.predictCategory as jest.Mock).mockResolvedValue({
        categoryId: null,
        confidence: 0
      });
      
      mockExecute.mockResolvedValue({ rows: [{ id: 'duplicate-tx-123' }] });

      const draft: TransactionDraft = {
        id: '2',
        source: 'manual',
        amount_paise: 50000, // 500 INR
        merchant_name: 'Netflix',
        draft_status: 'editing'
      };

      const result = await TransactionPredictionService.predict(draft);
      
      expect(result.isDuplicate).toBe(true);
      expect(result.predictionReason).toContain('Possible duplicate');
    });
  });

  describe('evaluateBudgetImpact', () => {
    it('returns exceedsBudget true if draft pushes category over limit', async () => {
      // mock budget lookup
      mockExecute.mockResolvedValueOnce({ rows: [{ monthly_limit: 1000 }] }); // 1000 INR
      // mock current spent
      mockExecute.mockResolvedValueOnce({ rows: [{ total: 950 }] }); // 950 INR spent

      const draft: TransactionDraft = {
        id: '3',
        source: 'manual',
        amount_paise: 6000, // 60 INR -> Total 1010, exceeds 1000
        category_id: 'food',
        draft_status: 'editing'
      };

      const result = await TransactionPredictionService.evaluateBudgetImpact(draft);
      
      expect(result).not.toBeNull();
      expect(result?.exceedsBudget).toBe(true);
      expect(result?.budgetTotal).toBe(100000); // 100000 paise
      expect(result?.remainingAfter).toBe(-1000); // -10 INR in paise
    });
  });
});
