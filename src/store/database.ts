import { initEncryptedDb, getDb } from '../db';

export { getDb };

/**
 * Table creation and seeding now live in src/db/migrations/ (001_initial.ts
 * for the tables this used to create inline, 002_finance.ts for the schema
 * fix — see docs/plans/2026-07-29-coinkeeper-finance.md Task 1.3).
 * initEncryptedDb() runs them before resolving, so by the time this returns
 * the schema is current.
 */
export const initDatabase = async (): Promise<void> => {
  try {
    await initEncryptedDb();
  } catch (error) {
    console.error('[database] initDatabase error:', error);
    throw error;
  }
};

export const getPreference = async (key: string): Promise<string | null> => {
  try {
    const database = getDb();
    const result = await database.execute(
      'SELECT value FROM preferences WHERE key = ?;',
      [key],
    );
    const row = result.rows?.[0] as { value?: string } | undefined;
    return row?.value ?? null;
  } catch (error) {
    console.error('[database] getPreference error:', error);
    return null;
  }
};

export const setPreference = async (
  key: string,
  value: string,
): Promise<void> => {
  try {
    const database = getDb();
    await database.execute(
      'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?);',
      [key, value],
    );
  } catch (error) {
    console.error('[database] setPreference error:', error);
  }
};
