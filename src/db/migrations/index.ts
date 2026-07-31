import type { DB } from '@op-engineering/op-sqlite';
import { migrate001Initial } from './001_initial';
import { migrate002Finance } from './002_finance';

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
};
