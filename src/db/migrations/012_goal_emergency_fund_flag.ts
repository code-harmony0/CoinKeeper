import type { DB } from '@op-engineering/op-sqlite';

/**
 * Replaces the case-sensitive `name = 'Emergency Fund'` match used across
 * goalStore, useMoneyPlanIntelligence, insightsEngine, and GoalsScreen with a
 * real flag. A goal named "Emergency fund" (lowercase f) silently matched
 * none of those — is_emergency_fund is set case-insensitively here and at
 * creation time in goalStore.addGoal, so a goal only needs to be spelled
 * consistently once, at the moment it's made.
 */
export const migrate012GoalEmergencyFundFlag = async (db: DB): Promise<void> => {
  const result = await db.execute("PRAGMA table_info('goals');");
  const existingColumns = (result.rows || []).map((col: any) => col.name);

  if (!existingColumns.includes('is_emergency_fund')) {
    await db.execute('ALTER TABLE goals ADD COLUMN is_emergency_fund INTEGER NOT NULL DEFAULT 0;');
  }

  await db.execute(
    "UPDATE goals SET is_emergency_fund = 1 WHERE lower(trim(name)) = 'emergency fund';",
  );
};
