import type { DB } from '@op-engineering/op-sqlite';

/**
 * getGoalContributions() (FinancialLedgerService) queries transactions by
 * goal_id for every goal on every Goals-screen load — without an index this
 * table-scans transactions, which only gets worse as ledger history grows.
 */
export const migrate016GoalIdIndex = async (db: DB): Promise<void> => {
  await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON transactions(goal_id);');
};
