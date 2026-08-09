import { TransactionPredictionService } from '../services/TransactionPredictionService';
import { MerchantLearningService } from '../services/MerchantLearningService';
import { getDb } from '../store/database';
import { FinancialIntelligenceEngine } from '../services/FinancialIntelligenceEngine';
import { TransactionDraft } from '../types/transactionDraft';

jest.mock('../store/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('../services/MerchantLearningService', () => ({
  MerchantLearningService: {
    predictCategory: jest.fn()
  }
}));

jest.mock('../services/FinancialIntelligenceEngine', () => ({
  FinancialIntelligenceEngine: {
    getCurrentSnapshot: jest.fn(),
  },
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

  /**
   * These previously mocked a `budgets` table with a `monthly_limit` column.
   * No migration has ever created that table and this app has no per-category
   * budgets — the mock was validating behaviour that could not exist against a
   * real database. Budget impact is measured against the category's bucket
   * (needs/wants/savings) from budget_settings, via the intelligence snapshot.
   */
  describe('evaluateBudgetImpact', () => {
    const draftInFood: TransactionDraft = {
      id: '3',
      source: 'manual',
      amount_paise: 6000, // ₹60
      category_id: 'food',
      draft_status: 'editing',
    };

    it('flags a draft that pushes its bucket over the limit', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ budget_bucket: 'needs' }] });
      (FinancialIntelligenceEngine.getCurrentSnapshot as jest.Mock).mockResolvedValue({
        buckets: { needs: { budgetLimit: 100000, currentSpend: 95000 } },
      });

      const result = await TransactionPredictionService.evaluateBudgetImpact(draftInFood);

      expect(result).not.toBeNull();
      expect(result?.exceedsBudget).toBe(true);
      expect(result?.budgetTotal).toBe(100000);
      expect(result?.remainingAfter).toBe(-1000); // 100000 - (95000 + 6000)
    });

    it('does not flag a draft that stays within the bucket', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ budget_bucket: 'needs' }] });
      (FinancialIntelligenceEngine.getCurrentSnapshot as jest.Mock).mockResolvedValue({
        buckets: { needs: { budgetLimit: 100000, currentSpend: 10000 } },
      });

      const result = await TransactionPredictionService.evaluateBudgetImpact(draftInFood);

      expect(result?.exceedsBudget).toBe(false);
      expect(result?.remainingAfter).toBe(84000);
    });

    it('returns null when the category has no bucket to measure against', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await TransactionPredictionService.evaluateBudgetImpact(draftInFood);

      expect(result).toBeNull();
    });
  });
});
