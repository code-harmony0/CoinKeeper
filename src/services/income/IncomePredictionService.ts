import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { v4 as uuidv4 } from 'uuid';

export const IncomePredictionService = {
  /**
   * Updates the income_patterns table and generates a new prediction for the next payday.
   */
  async updatePattern(tx: SQLiteTransaction, sourceId: string, amountPaise: number, dateStr: string): Promise<void> {
    const result = await tx.execute('SELECT * FROM income_patterns WHERE source_id = ?', [sourceId]);
    const now = Date.now();
    
    // Simplistic prediction logic for now: assumes monthly if not present
    let nextExpectedDate = new Date(dateStr);
    nextExpectedDate.setMonth(nextExpectedDate.getMonth() + 1);
    const nextExpectedStr = nextExpectedDate.toISOString();

    if (!result.rows || result.rows.length === 0) {
      await tx.execute(
        `INSERT INTO income_patterns (id, source_id, frequency, variance_paise, average_amount_paise, last_payment_date, next_expected_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), sourceId, 'monthly', 0, amountPaise, dateStr, nextExpectedStr, now, now]
      );
    } else {
      const pattern = (result.rows as any)[0];
      const newAverage = Math.floor((pattern.average_amount_paise + amountPaise) / 2);
      
      await tx.execute(
        `UPDATE income_patterns 
         SET average_amount_paise = ?, last_payment_date = ?, next_expected_date = ?, updated_at = ?
         WHERE source_id = ?`,
        [newAverage, dateStr, nextExpectedStr, now, sourceId]
      );
    }

    // Update predictions
    await tx.execute('DELETE FROM income_predictions WHERE source_id = ?', [sourceId]);
    await tx.execute(
      `INSERT INTO income_predictions (id, source_id, predicted_date, predicted_amount_paise, confidence_score, prediction_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), sourceId, nextExpectedStr, amountPaise, 85, 'Based on previous monthly payment', now]
    );
  }
};
