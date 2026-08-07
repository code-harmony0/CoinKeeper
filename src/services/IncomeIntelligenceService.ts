import { getDb } from '../store/database';
import { Money } from '../utils/money';

export type IncomeSourceType = 'salary' | 'freelance' | 'business' | 'bonus' | 'interest' | 'cashback' | 'refund' | 'investment' | 'gift' | 'tax_refund' | 'government' | 'rental' | 'other';

export interface IncomeHealth {
  overallScore: number;
  stabilityScore: number;
  diversityScore: number;
  growthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient_data';
}

export interface IncomePrediction {
  sourceName: string;
  expectedAmountPaise: number;
  expectedDate: string;
  confidence: 'high' | 'medium' | 'low';
}

export const IncomeIntelligenceService = {
  /**
   * Evaluates the health and stability of the user's income streams
   * by analyzing frequency, variance, and source diversity.
   */
  async getIncomeHealth(): Promise<IncomeHealth> {
    const db = getDb();
    
    try {
      // For now, return a placeholder heuristic. A real AI or ML engine 
      // would populate `income_health_cache` in the background.
      const result = await db.execute(`
        SELECT overall_score, stability_score, diversity_score, growth_score 
        FROM income_health_cache 
        ORDER BY date DESC LIMIT 1
      `);
      
      const row = result.rows?.[0] as any;
      if (row) {
        return {
          overallScore: row.overall_score,
          stabilityScore: row.stability_score,
          diversityScore: row.diversity_score,
          growthScore: row.growth_score,
          status: row.overall_score > 80 ? 'excellent' : row.overall_score > 60 ? 'good' : 'fair'
        };
      }
    } catch (e) {
      console.warn('Income health cache unavailable:', e);
    }
    
    return {
      overallScore: 0,
      stabilityScore: 0,
      diversityScore: 0,
      growthScore: 0,
      status: 'insufficient_data'
    };
  },
  
  /**
   * Predicts upcoming income events based on historical patterns stored in SQLite
   */
  async getUpcomingIncome(): Promise<IncomePrediction[]> {
    const db = getDb();
    
    try {
      const result = await db.execute(`
        SELECT s.name, p.average_amount_paise, p.next_expected_date, p.variance_paise
        FROM income_patterns p
        JOIN income_sources s ON p.source_id = s.id
        WHERE p.next_expected_date >= date('now')
        ORDER BY p.next_expected_date ASC
        LIMIT 3
      `);
      
      const rows = result.rows as any[];
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          sourceName: r.name,
          expectedAmountPaise: r.average_amount_paise,
          expectedDate: r.next_expected_date,
          // If variance is low, confidence is high
          confidence: (r.variance_paise / Math.max(1, r.average_amount_paise)) < 0.1 ? 'high' : 'medium'
        }));
      }
    } catch (e) {
      console.warn('Income patterns table unavailable:', e);
    }
    
    return [];
  }
};
