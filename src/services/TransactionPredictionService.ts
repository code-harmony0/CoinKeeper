import { MerchantLearningService } from './MerchantLearningService';
import { TransactionDraft } from '../types/transactionDraft';
import { getDb } from '../store/database';
import { BudgetBucket } from '../utils/budgetBucket';
import { FinancialIntelligenceEngine } from './FinancialIntelligenceEngine';

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
      // occurred_at is INTEGER epoch-ms and amount_paise is paise — the
      // pre-002 column names (amount/date) threw "no such column" here, which
      // killed the whole prediction and sent every expense to 'unknown'.
      const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);

      const dupCheck = await db.execute(
        `SELECT id FROM transactions
         WHERE amount_paise = ? AND LOWER(description) LIKE ? AND occurred_at >= ?
         LIMIT 1`,
        [draft.amount_paise, `%${draft.merchant_name.toLowerCase()}%`, fortyEightHoursAgo]
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
   * Evaluates the budget impact of a proposed draft against the bucket its
   * category belongs to.
   *
   * This previously queried a `budgets` table with a `monthly_limit` column.
   * No migration has ever created that table, and this app has no per-category
   * budgets at all — the real model is `budget_settings` (one row of
   * needs/wants/savings percentages) applied to each category's
   * `budget_bucket`. The old query could only ever throw.
   */
  async evaluateBudgetImpact(draft: TransactionDraft): Promise<{
    exceedsBudget: boolean;
    remainingAfter: number;
    budgetTotal: number;
  } | null> {
    if (!draft.amount_paise || !draft.category_id) return null;

    const db = getDb();

    const bucketRes = await db.execute(
      'SELECT budget_bucket FROM categories WHERE id = ? LIMIT 1',
      [draft.category_id],
    );
    const bucket = (bucketRes?.rows?.[0] as any)?.budget_bucket as
      | BudgetBucket
      | undefined;
    if (!bucket) return null;

    const snapshot = await FinancialIntelligenceEngine.getCurrentSnapshot();
    const stats = snapshot.buckets?.[bucket];
    if (!stats || stats.budgetLimit <= 0) return null;

    const remainingAfter =
      stats.budgetLimit - (stats.currentSpend + draft.amount_paise);

    return {
      exceedsBudget: remainingAfter < 0,
      remainingAfter,
      budgetTotal: stats.budgetLimit,
    };
  }
};
