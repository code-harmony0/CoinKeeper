import { TransactionDraft } from '../../types/transactionDraft';
import { AccountRoutingService } from './AccountRoutingService';
import { IncomeRuleEngine } from './IncomeRuleEngine';
import { IncomeRoutingEngine } from './IncomeRoutingEngine';
import { IncomePredictionService } from './IncomePredictionService';
import { IncomeHealthService } from './IncomeHealthService';
import { IncomeForecastService } from './IncomeForecastService';
import { IncomeInsightsService } from './IncomeInsightsService';
import { getDb } from '../../store/database';
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
  async processConfirmedIncome(draft: TransactionDraft): Promise<void> {
    const db = getDb();

    // The entire processing and routing must be atomic.
    await db.transaction(async (tx) => {
      // 1. Create the base transaction
      const transactionId = uuidv4();
      const amountPaise = draft.amount_paise || 0;
      
      await tx.execute(
        `INSERT INTO transactions (id, amount, type, category, categoryIcon, date, description, paymentMethod)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId, 
          amountPaise / 100, // Legacy fallback
          'income', 
          draft.income_type || 'other', 
          'arrow-down-circle', 
          draft.date || new Date().toISOString(),
          draft.merchant_name || 'Income',
          draft.payment_method || 'bank_transfer'
        ]
      );

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
