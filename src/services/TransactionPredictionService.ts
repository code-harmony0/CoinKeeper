import { MerchantLearningService } from './MerchantLearningService';
import { TransactionDraft } from '../types/transactionDraft';
import { getDb } from '../store/database';

export interface PredictionResult {
  categoryId: string | null;
  accountId: string | null;
  isRecurring: boolean;
  isDuplicate: boolean;
  predictionReason: string | null;
  confidence: number;
}

export const TransactionPredictionService = {
  /**
   * Analyzes a draft in real-time to predict missing fields and flag warnings.
   */
  async predict(draft: TransactionDraft): Promise<PredictionResult> {
    const result: PredictionResult = {
      categoryId: draft.category_id || null,
      accountId: draft.account_id || null,
      isRecurring: false,
      isDuplicate: false,
      predictionReason: null,
      confidence: 0
    };

    if (!draft.merchant_name) {
      return result;
    }

    // 1. Predict Category if missing
    if (!result.categoryId) {
      const mlPred = await MerchantLearningService.predictCategory(draft.merchant_name);
      if (mlPred.categoryId && mlPred.confidence > 50) {
        result.categoryId = mlPred.categoryId;
        result.confidence = mlPred.confidence;
        result.predictionReason = 'Based on your previous transactions at ' + draft.merchant_name;
      }
    }

    // 2. Predict Duplicate Risk
    // If the amount and merchant match a transaction from the last 48 hours
    if (draft.amount_paise && draft.merchant_name) {
      const db = getDb();
      const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
      const iso48 = new Date(fortyEightHoursAgo).toISOString();
      
      const dupCheck = await db.execute(
        `SELECT id FROM transactions 
         WHERE amount = ? AND LOWER(description) LIKE ? AND date >= ?
         LIMIT 1`,
        [draft.amount_paise / 100, `%${draft.merchant_name.toLowerCase()}%`, iso48]
      );
      
      if (dupCheck?.rows && dupCheck.rows.length > 0) {
        result.isDuplicate = true;
        result.predictionReason = result.predictionReason 
          ? result.predictionReason + '. Possible duplicate.' 
          : 'Possible duplicate transaction.';
      }
    }

    // 3. Predict Recurring Risk — match against the subscriptions table, which
    // subscriptionDetector.detectSubscriptions() keeps populated from real
    // transaction history (same merchant + amount recurring on a weekly/
    // biweekly/monthly/yearly cadence). A live full re-scan here would be too
    // expensive to run on every keystroke, so this reads the cached result.
    if (draft.merchant_name && draft.amount_paise) {
      const db = getDb();
      const subMatch = await db.execute(
        `SELECT id FROM subscriptions WHERE LOWER(name) = ? AND amount_paise = ? AND isActive = 1 LIMIT 1`,
        [draft.merchant_name.trim().toLowerCase(), draft.amount_paise]
      );
      if (subMatch?.rows && subMatch.rows.length > 0) {
        result.isRecurring = true;
        result.predictionReason = result.predictionReason
          ? result.predictionReason + '. Matches a recurring subscription.'
          : 'This looks like a recurring subscription.';
      }
    }

    return result;
  },

  /**
   * Evaluates the budget impact of a proposed draft.
   */
  async evaluateBudgetImpact(draft: TransactionDraft): Promise<{
    exceedsBudget: boolean;
    remainingAfter: number;
    budgetTotal: number;
  } | null> {
    if (!draft.amount_paise || !draft.category_id) return null;

    const db = getDb();
    
    // Check budget for this category
    const budgetRes = await db.execute(
      'SELECT monthly_limit FROM budgets WHERE category_id = ?',
      [draft.category_id]
    );

    if (!budgetRes?.rows || budgetRes.rows.length === 0) return null;
    const monthlyLimit = (budgetRes.rows[0] as any).monthly_limit * 100; // convert to paise

    // Get current spent this month for this category
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const spentRes = await db.execute(
      "SELECT SUM(amount) as total FROM transactions WHERE category = (SELECT name FROM categories WHERE id = ?) AND date >= ? AND type = 'expense'",
      [draft.category_id, startOfMonth]
    );

    const spentPaise = ((spentRes?.rows?.[0] as any)?.total || 0) * 100;
    const remainingAfter = monthlyLimit - (spentPaise + draft.amount_paise);
    
    return {
      exceedsBudget: remainingAfter < 0,
      remainingAfter,
      budgetTotal: monthlyLimit
    };
  }
};
