import { getDb } from '../../store/database';

/**
 * PRAGMA user_version, read live. Drivers disagree about what they name the
 * returned column, so take the single value rather than a fixed key.
 */
export const readSchemaVersion = async (): Promise<number> => {
  const result = await getDb().execute('PRAGMA user_version;');
  const row = result?.rows?.[0] as Record<string, number> | undefined;
  if (!row) return 0;
  return Object.values(row)[0] ?? 0;
};
