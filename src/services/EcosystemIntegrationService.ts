import { TransactionDraft } from '../types/transactionDraft';

/**
 * Ecosystem Integration Stub for Draft Engine
 * Hooks the transaction drafts into the wider CoinKeeper ecosystem
 */
export const EcosystemIntegrationService = {
  async notifyDraftSaved(draft: TransactionDraft) {
    // 1. Notify Budget
    // (Budget is already checked during predict, but we'd invalidate cache here)
    
    // 2. Notify Bills
    if (draft.is_recurring_candidate) {
      // Create a pending bill detection
      console.log('Notifying Bills Service of recurring candidate', draft.merchant_name);
    }

    // 3. Notify Goals
    // E.g. "You saved ₹500 on Starbucks, allocate to travel goal?"
    
    // 4. Notify InsightEngine
    // Invalidate monthly stats or category trends

    // 5. Notify AI Coach
    // Could send a prompt to AI Coach: "User just spent 5000 on Food. Warn them."
    console.log('Ecosystem notified of new transaction draft saved:', draft.id);
  }
};
