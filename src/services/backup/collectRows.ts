import type { Scalar } from '@op-engineering/op-sqlite';
import { getDb } from '../../store/database';
import { NULLED_COLUMNS } from './backupTables';

export type BackupRow = Record<string, Scalar>;
export type CollectedRows = Record<string, BackupRow[]>;

/**
 * A table absent on this device (an older install that never ran a later
 * migration) yields an empty array. One missing table must not cost the user
 * their entire backup.
 */
export const collectRows = async (tables: readonly string[]): Promise<CollectedRows> => {
  const out: CollectedRows = {};

  for (const table of tables) {
    try {
      const result = await getDb().execute(`SELECT * FROM ${table};`);
      const rows = (result?.rows ?? []) as BackupRow[];
      const blanked = NULLED_COLUMNS[table] ?? [];

      out[table] = blanked.length
        ? rows.map(row => {
            const copy = { ...row };
            for (const column of blanked) {
              copy[column] = null;
            }
            return copy;
          })
        : rows;
    } catch (error) {
      console.warn(`[backup] skipping ${table}:`, error);
      out[table] = [];
    }
  }

  return out;
};
