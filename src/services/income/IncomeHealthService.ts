import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { v4 as uuidv4 } from 'uuid';
import { IncomeAnalyticsService } from './IncomeAnalyticsService';

export const IncomeHealthService = {
  /**
   * Recalculates the overarching Income Health Score (0-100).
   */
  async recalculateHealth(tx: SQLiteTransaction): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate sub-scores
    const stabilityScore = await IncomeAnalyticsService.calculateStabilityScore(tx);
    const diversityScore = 80; // Placeholder for actual calculation
    const growthScore = 75; // Placeholder for actual calculation

    // Weighted average
    const overallScore = Math.floor((stabilityScore * 0.5) + (diversityScore * 0.25) + (growthScore * 0.25));

    const metricsJson = JSON.stringify({
      recurring_percentage: 85,
      savings_rate: 20
    });

    // Upsert health cache
    const existing = await tx.execute('SELECT id FROM income_health_cache WHERE date = ?', [today]);
    if (existing.rows && existing.rows.length > 0) {
      await tx.execute(
        `UPDATE income_health_cache 
         SET overall_score = ?, stability_score = ?, diversity_score = ?, growth_score = ?, metrics_json = ? 
         WHERE date = ?`,
        [overallScore, stabilityScore, diversityScore, growthScore, metricsJson, today]
      );
    } else {
      await tx.execute(
        `INSERT INTO income_health_cache (id, date, overall_score, stability_score, diversity_score, growth_score, metrics_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), today, overallScore, stabilityScore, diversityScore, growthScore, metricsJson, Date.now()]
      );
    }
  }
};
