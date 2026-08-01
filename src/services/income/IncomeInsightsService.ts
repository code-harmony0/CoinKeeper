import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { TransactionDraft } from '../../types/transactionDraft';
import { IncomeDistribution } from './IncomeRoutingEngine';
import { v4 as uuidv4 } from 'uuid';

export const IncomeInsightsService = {
  /**
   * Generates automatic insights when new income is saved.
   */
  async generateInsightsOnSave(
    tx: SQLiteTransaction, 
    draft: TransactionDraft, 
    distribution: IncomeDistribution[]
  ): Promise<void> {
    if (!draft.income_source_id) return;

    // Check previous pattern to see if income increased
    const result = await tx.execute('SELECT average_amount_paise FROM income_patterns WHERE source_id = ?', [draft.income_source_id]);
    if (result.rows && result.rows.length > 0) {
      const prevAvg = (result.rows as any)[0].average_amount_paise;
      const current = draft.amount_paise || 0;

      if (current > prevAvg * 1.1) {
        await tx.execute(
          `INSERT INTO income_insights_cache (id, insight_type, title, description, severity, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uuidv4(), 'salary_increased', 'Income Increased!', 'Your recent income was higher than your average.', 'success', Date.now()]
        );
      } else if (current < prevAvg * 0.9) {
        await tx.execute(
          `INSERT INTO income_insights_cache (id, insight_type, title, description, severity, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uuidv4(), 'income_dropped', 'Income Dropped', 'Your recent income was lower than your average.', 'warning', Date.now()]
        );
      }
    }
  }
};
