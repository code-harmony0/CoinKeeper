import { MerchantLearningService } from './MerchantLearningService';
import { TransactionDraftService } from './TransactionDraftService';
import { TransactionDraft } from '../types/transactionDraft';

export const FavoriteMerchantService = {
  async getFavorites(limit: number = 10) {
    return MerchantLearningService.getFavorites(limit);
  },

  /**
   * Initializes a TransactionDraft for a favorite merchant.
   */
  async startDraft(merchantName: string, categoryId: string): Promise<TransactionDraft> {
    return TransactionDraftService.createDraft('favorite', {
      merchant_name: merchantName,
      category_id: categoryId,
    });
  }
};
