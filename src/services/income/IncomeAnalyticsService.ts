import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';

export const IncomeAnalyticsService = {
  /**
   * Calculates income stability based on frequency and variance.
   */
  async calculateStabilityScore(tx: SQLiteTransaction): Promise<number> {
    const result = await tx.execute('SELECT variance_paise, average_amount_paise FROM income_patterns');
    if (!result.rows || result.rows.length === 0) return 0;

    let totalScore = 0;
    for (let i = 0; i < result.rows.length; i++) {
      const pattern = (result.rows as any)[i];
      if (pattern.average_amount_paise > 0) {
        const varianceRatio = pattern.variance_paise / pattern.average_amount_paise;
        // The higher the variance, the lower the score. Max score is 100.
        const score = Math.max(0, 100 - (varianceRatio * 100));
        totalScore += score;
      }
    }
    return Math.floor(totalScore / result.rows.length);
  }
};
