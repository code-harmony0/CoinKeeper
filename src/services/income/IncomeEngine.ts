import { TransactionDraft } from '../../types/transactionDraft';
import { AccountRoutingService } from './AccountRoutingService';
import { IncomeRuleEngine } from './IncomeRuleEngine';
import { IncomeRoutingEngine } from './IncomeRoutingEngine';
import { IncomePredictionService } from './IncomePredictionService';
import { IncomeHealthService } from './IncomeHealthService';
import { IncomeForecastService } from './IncomeForecastService';
import { IncomeInsightsService } from './IncomeInsightsService';
import { getDb } from '../../store/database';
import { resolveCategoryId } from '../../store/transactionStore';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../../types/transaction';

/**
 * IncomeEngine is the master orchestrator for the Income Intelligence System.
 * It coordinates the atomic routing of income to accounts, goals, bills, and budgets.
 */
export const IncomeEngine = {
  /**
   * Processes a confirmed Income TransactionDraft and executes the routing cascade.
   * Runs as a single atomic transaction.
   */
  async processConfirmedIncome(
    draft: TransactionDraft,
    options?: { id?: string },
  ): Promise<void> {
    const db = getDb();

    // The entire processing and routing must be atomic.
    await db.transaction(async (tx) => {
      // 1. Create the base transaction.
      // A caller-supplied id (RecurringIncomeService's deterministic
      // `rec_<templateId>_<YYYY-MM>`) lets this run be idempotent: INSERT OR
      // IGNORE means re-running for a month that's already generated affects
      // zero rows, and the whole cascade below is skipped rather than routing
      // the same salary to accounts/goals/bills a second time.
      const transactionId = options?.id ?? uuidv4();
      const amountPaise = draft.amount_paise || 0;

      // `transactions` is the post-002 schema (transactions_v2, renamed): it has
      // amount_paise/category_id/occurred_at, NOT the amount/category/date
      // columns from migration 001. Writing the legacy column names threw
      // "no such column", rolled the whole tx back, and the error was swallowed
      // by the caller's catch — which is why income silently never saved.
      const categoryName = draft.income_type
        ? draft.income_type.charAt(0).toUpperCase() + draft.income_type.slice(1)
        : 'Income';
      const categoryId = await resolveCategoryId(tx, categoryName, 'arrow-down-circle');

      const insertResult = await tx.execute(
        `INSERT OR IGNORE INTO transactions
           (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
         VALUES (?, ?, 'income', ?, NULL, ?, ?, ?, NULL, NULL)`,
        [
          transactionId,
          amountPaise,
          categoryId,
          // account_id references `accounts`; the income flow's account comes
          // from the separate `income_accounts` table, so it must not go here.
          // The deposit itself is handled by AccountRoutingService below.
          draft.merchant_name || 'Income',
          new Date(draft.date || Date.now()).getTime(),
          draft.payment_method || 'bank_transfer',
        ]
      );

      if ((insertResult as any).rowsAffected === 0) {
        // Already generated for this id/month — nothing else to do.
        return;
      }

      // 2. Route to Primary Account First
      if (draft.account_id) {
        await AccountRoutingService.depositToAccount(tx, draft.account_id, amountPaise);
      }

      // 3. Evaluate Routing Rules
      const rules = await IncomeRuleEngine.getRulesForSource(tx, draft.income_source_id || null);
      
      // 4. Execute Cascading Distribution
      const distribution = await IncomeRoutingEngine.executeRules(tx, rules, amountPaise, transactionId);

      // 5. Update Forecasts & Predictions
      if (draft.income_source_id) {
        await IncomePredictionService.updatePattern(tx, draft.income_source_id, amountPaise, draft.date || new Date().toISOString());
        await IncomeForecastService.recalculateForecasts(tx);
      }

      // 6. Generate Insights & Health
      await IncomeInsightsService.generateInsightsOnSave(tx, draft, distribution);
      await IncomeHealthService.recalculateHealth(tx);
    });
  }
};
