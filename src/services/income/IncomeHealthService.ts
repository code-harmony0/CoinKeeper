import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { v4 as uuidv4 } from 'uuid';
import { IncomeAnalyticsService, NOT_ENOUGH_DATA } from './IncomeAnalyticsService';

/**
 * Factor weights. A factor that can't be measured yet is dropped and the
 * remaining weights are renormalised, so a new user's overall score reflects
 * what is actually known instead of being dragged down by unmeasured factors.
 */
const WEIGHTS = { stability: 0.5, diversity: 0.25, growth: 0.25 };

export const IncomeHealthService = {
  /**
   * Recalculates the overarching Income Health Score (0-100).
   */
  async recalculateHealth(tx: SQLiteTransaction): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const [stabilityScore, diversityScore, growthScore, recurringShare] =
      await Promise.all([
        IncomeAnalyticsService.calculateStabilityScore(tx),
        IncomeAnalyticsService.calculateDiversityScore(tx),
        IncomeAnalyticsService.calculateGrowthScore(tx),
        IncomeAnalyticsService.calculateRecurringShare(tx),
      ]);

    const measured = [
      { score: stabilityScore, weight: WEIGHTS.stability },
      { score: diversityScore, weight: WEIGHTS.diversity },
      { score: growthScore, weight: WEIGHTS.growth },
    ].filter(f => f.score !== NOT_ENOUGH_DATA);

    const totalWeight = measured.reduce((sum, f) => sum + f.weight, 0);
    const overallScore =
      totalWeight > 0
        ? Math.floor(
            measured.reduce((sum, f) => sum + f.score * f.weight, 0) /
              totalWeight,
          )
        : NOT_ENOUGH_DATA;

    const metricsJson = JSON.stringify({
      recurring_percentage: recurringShare,
      measured_factors: measured.length,
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
