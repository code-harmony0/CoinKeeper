import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { IncomeRule } from '../../types/income';

export const IncomeRuleEngine = {
  /**
   * Fetches the rules applicable to a specific income source,
   * merging any global rules.
   */
  async getRulesForSource(tx: SQLiteTransaction, sourceId: string | null): Promise<IncomeRule[]> {
    const query = sourceId 
      ? 'SELECT * FROM income_rules WHERE (source_id = ? OR source_id IS NULL) AND is_active = 1 ORDER BY priority_order ASC'
      : 'SELECT * FROM income_rules WHERE source_id IS NULL AND is_active = 1 ORDER BY priority_order ASC';
      
    const params = sourceId ? [sourceId] : [];
    const result = await tx.execute(query, params);
    
    return (result.rows || []) as any as IncomeRule[];
  },

  /**
   * Evaluates a single rule against the remaining unallocated balance.
   * Returns the exact paise amount that should be allocated based on the rule type.
   */
  evaluateRule(rule: IncomeRule, totalIncomePaise: number, remainingPaise: number): number {
    // Skip if income is below threshold
    if (rule.threshold_paise > 0 && totalIncomePaise < rule.threshold_paise) {
      return 0;
    }

    let allocation = 0;

    switch (rule.rule_type) {
      case 'fixed':
        allocation = Math.min(rule.value, remainingPaise);
        break;
      case 'percentage':
        // value is percentage * 100 (e.g., 20% = 2000)
        const pct = rule.value / 10000; 
        allocation = Math.min(Math.floor(totalIncomePaise * pct), remainingPaise);
        break;
      case 'remaining':
        allocation = remainingPaise;
        break;
      case 'priority':
        // Priority acts like fixed, but guarantees it fills up to its target first
        allocation = Math.min(rule.value, remainingPaise);
        break;
      case 'threshold_skip':
        // If we didn't skip above, act like a fixed rule
        allocation = Math.min(rule.value, remainingPaise);
        break;
    }

    return allocation;
  }
};
