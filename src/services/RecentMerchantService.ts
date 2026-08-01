import { MerchantLearningService } from './MerchantLearningService';
import { TransactionDraftService } from './TransactionDraftService';
import { TransactionDraft } from '../types/transactionDraft';

export const RecentMerchantService = {
  async getRecent(limit: number = 10) {
    return MerchantLearningService.getRecent(limit);
  },

  /**
   * Initializes a TransactionDraft for a recent merchant.
   */
  async startDraft(merchantName: string, categoryId: string): Promise<TransactionDraft> {
    return TransactionDraftService.createDraft('recent', {
      merchant_name: merchantName,
      category_id: categoryId,
    });
  }
};
