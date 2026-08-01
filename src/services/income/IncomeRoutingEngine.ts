import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { IncomeRuleEngine } from './IncomeRuleEngine';
import { IncomeRule, IncomeDestinationType } from '../../types/income';
import { v4 as uuidv4 } from 'uuid';

export interface IncomeDistribution {
  destination_type: IncomeDestinationType;
  destination_id: string | null;
  amount_paise: number;
}

export const IncomeRoutingEngine = {
  /**
   * Evaluates the rules and cascades the income amount, updating virtual balances 
   * on goals, bills, and budgets, while leaving the remainder in Safe to Spend.
   */
  async executeRules(
    tx: SQLiteTransaction, 
    rules: IncomeRule[], 
    totalIncomePaise: number,
    transactionId: string
  ): Promise<IncomeDistribution[]> {
    let remainingPaise = totalIncomePaise;
    const distribution: IncomeDistribution[] = [];

    // Process all explicit rules first
    for (const rule of rules) {
      if (remainingPaise <= 0) break;

      const allocatedPaise = IncomeRuleEngine.evaluateRule(rule, totalIncomePaise, remainingPaise);
      
      if (allocatedPaise > 0) {
        // Log allocation
        await tx.execute(
          `INSERT INTO income_allocations (id, transaction_id, rule_id, destination_type, destination_id, allocated_amount_paise, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), transactionId, rule.id, rule.destination_type, rule.destination_id, allocatedPaise, Date.now()]
        );

        // Execute virtual allocation
        await this.routeVirtualBalance(tx, rule.destination_type, rule.destination_id, allocatedPaise);

        distribution.push({
          destination_type: rule.destination_type,
          destination_id: rule.destination_id,
          amount_paise: allocatedPaise
        });

        remainingPaise -= allocatedPaise;
      }
    }

    // Anything remaining automatically goes to Safe to Spend
    if (remainingPaise > 0) {
      distribution.push({
        destination_type: 'safe_to_spend',
        destination_id: null,
        amount_paise: remainingPaise
      });
      // We don't need a rule ID for the default fallback, but we can log it if we create a default rule concept
    }

    return distribution;
  },

  /**
   * Handles the actual update to the destination's balance.
   * Architecture Decision: Virtual allocation by default (no ledger entries for goals/bills yet).
   */
  async routeVirtualBalance(
    tx: SQLiteTransaction, 
    destinationType: IncomeDestinationType, 
    destinationId: string | null, 
    amountPaise: number
  ): Promise<void> {
    switch (destinationType) {
      case 'goal':
        if (destinationId) {
          // Virtual allocation to a Goal
          await tx.execute(
            `UPDATE goals SET current_amount = current_amount + ? WHERE id = ?`,
            [amountPaise / 100, destinationId]
          );
        }
        break;
      case 'bill':
        // Bills reserve is often global or per bill
        if (destinationId) {
          // Virtual allocation to a specific Bill
          await tx.execute(
            `UPDATE bills SET paidAmount = paidAmount + ? WHERE id = ?`,
            [amountPaise / 100, destinationId] // Assuming paidAmount tracks the reserve
          );
        }
        break;
      case 'budget':
        if (destinationId) {
          // Increase budget allocation
          await tx.execute(
            `UPDATE budgets SET amount = amount + ? WHERE id = ?`,
            [amountPaise / 100, destinationId]
          );
        }
        break;
      case 'safe_to_spend':
        // Implicitly handled as the remainder of the bank account balance minus other reserves
        break;
    }
  }
};
