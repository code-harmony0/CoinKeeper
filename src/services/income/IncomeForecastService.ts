import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { v4 as uuidv4 } from 'uuid';

export const IncomeForecastService = {
  /**
   * Recalculates the income forecast for the current and next month based on predictions.
   */
  async recalculateForecasts(tx: SQLiteTransaction): Promise<void> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Sum predictions for the current month
    const result = await tx.execute(
      `SELECT SUM(predicted_amount_paise) as total 
       FROM income_predictions 
       WHERE predicted_date LIKE ?`, 
      [`${currentMonth}%`]
    );
    
    const totalExpected = (result.rows?.[0] as any)?.total || 0;
    
    // Check if forecast exists
    const existing = await tx.execute('SELECT id FROM income_forecasts WHERE forecast_month = ?', [currentMonth]);
    
    if (existing.rows && existing.rows.length > 0) {
      await tx.execute(
        `UPDATE income_forecasts SET total_expected_paise = ?, updated_at = ? WHERE forecast_month = ?`,
        [totalExpected, Date.now(), currentMonth]
      );
    } else {
      await tx.execute(
        `INSERT INTO income_forecasts (id, forecast_month, total_expected_paise, safe_to_spend_projected_paise, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), currentMonth, totalExpected, totalExpected, Date.now(), Date.now()]
      );
    }
  }
};
