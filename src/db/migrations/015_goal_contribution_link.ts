import type { DB } from '@op-engineering/op-sqlite';

/**
 * transactions.goal_id replaces the fragile `description = 'Transfer to ' ||
 * goals.name` string match used by FinancialIntelligenceEngine's transfer
 * report query — that match breaks on goal rename and collides when two
 * goals share a name. It's also the only way to query a single goal's
 * contribution history reliably, which the new goal intelligence layer
 * (velocity/ETA/stall detection) needs.
 */
export const migrate015GoalContributionLink = async (db: DB): Promise<void> => {
  const result = await db.execute("PRAGMA table_info('transactions');");
  const existingColumns = (result.rows || []).map((col: any) => col.name);

  if (!existingColumns.includes('goal_id')) {
    await db.execute('ALTER TABLE transactions ADD COLUMN goal_id TEXT REFERENCES goals(id);');
  }

  // Best-effort backfill for existing transfer_to_goal rows, using the same
  // string match the join used to rely on — one-time, not load-bearing going
  // forward since fundGoal() writes goal_id directly from here on.
  await db.execute(`
    UPDATE transactions
    SET goal_id = (
      SELECT g.id FROM goals g WHERE transactions.description = 'Transfer to ' || g.name
      LIMIT 1
    )
    WHERE type = 'transfer_to_goal' AND goal_id IS NULL;
  `);
};
