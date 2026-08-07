import type { DB } from '@op-engineering/op-sqlite';
import { migrate001Initial } from './001_initial';
import { migrate002Finance } from './002_finance';
import { migrate003Intelligence } from './003_intelligence';
import { migrate004BillsAdvanced } from './004_bills_advanced';
import { migrate005Ecosystem } from './005_ecosystem';
import { migrate006IntakeEngine } from './006_intake_engine';
import { migrate007IncomeIntelligence } from './007_income_intelligence';
import { migrate008CategoryColor } from './008_category_color';
import { migrate009BudgetBucket } from './009_budget_bucket';
import { migrate010BillPaymentLink } from './010_bill_payment_link';
import { migrate011RecurringIncome } from './011_recurring_income';
import { migrate012GoalEmergencyFundFlag } from './012_goal_emergency_fund_flag';
import { migrate015GoalContributionLink } from './015_goal_contribution_link';

/**
 * Versioned via PRAGMA user_version — the plan called for migration tests
 * (§13) but specified no versioning mechanism at all; user_version is
 * SQLite's built-in integer counter for exactly this purpose, so each
 * migration only ever runs once per database.
 */
export const runMigrations = async (db: DB): Promise<void> => {
  const versionResult = await db.execute('PRAGMA user_version;');
  const currentVersion = ((versionResult.rows?.[0] as any)?.user_version ?? 0) as number;

  if (currentVersion < 1) {
    await migrate001Initial(db);
    await db.execute('PRAGMA user_version = 1;');
  }

  if (currentVersion < 2) {
    await migrate002Finance(db);
    await db.execute('PRAGMA user_version = 2;');
  }

  if (currentVersion < 3) {
    await migrate003Intelligence(db);
    await db.execute('PRAGMA user_version = 3;');
  }

  if (currentVersion < 4) {
    await migrate004BillsAdvanced(db);
    await db.execute('PRAGMA user_version = 4;');
  }

  if (currentVersion < 5) {
    await migrate005Ecosystem(db);
    await db.execute('PRAGMA user_version = 5;');
  }

  if (currentVersion < 6) {
    await migrate006IntakeEngine(db);
    await db.execute('PRAGMA user_version = 6;');
  }

  if (currentVersion < 7) {
    await migrate007IncomeIntelligence(db);
    await db.execute('PRAGMA user_version = 7;');
  }

  if (currentVersion < 8) {
    await migrate008CategoryColor(db);
    await db.execute('PRAGMA user_version = 8;');
  }

  if (currentVersion < 9) {
    await migrate009BudgetBucket(db);
    await db.execute('PRAGMA user_version = 9;');
  }

  if (currentVersion < 10) {
    await migrate010BillPaymentLink(db);
    await db.execute('PRAGMA user_version = 10;');
  }

  if (currentVersion < 11) {
    await migrate011RecurringIncome(db);
    await db.execute('PRAGMA user_version = 11;');
  }

  if (currentVersion < 12) {
    await migrate012GoalEmergencyFundFlag(db);
    await db.execute('PRAGMA user_version = 12;');
  }

  if (currentVersion < 15) {
    await migrate015GoalContributionLink(db);
    await db.execute('PRAGMA user_version = 15;');
  }
};
