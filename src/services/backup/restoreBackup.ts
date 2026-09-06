import { getDb } from '../../store/database';
import { BACKUP_TABLES } from './backupTables';
import type { CollectedRows } from './collectRows';

export type RestoreMode = 'replace' | 'merge';

/**
 * One transaction for the whole restore: a failure part-way through must leave
 * the user exactly as they were, never half-overwritten.
 *
 * Merge inserts with OR IGNORE so existing rows always win. An upsert would let
 * an old backup silently overwrite newer edits and double-count goal totals.
 */
export const restoreBackup = async (
  rows: CollectedRows,
  mode: RestoreMode,
): Promise<void> => {
  await getDb().transaction(async tx => {
    for (const table of BACKUP_TABLES) {
      const tableRows = rows[table];
      if (!tableRows?.length) continue;

      if (mode === 'replace') {
        await tx.execute(`DELETE FROM ${table};`);
      }

      const verb = mode === 'replace' ? 'INSERT' : 'INSERT OR IGNORE';
      const columns = Object.keys(tableRows[0]);
      const placeholders = columns.map(() => '?').join(', ');

      for (const row of tableRows) {
        await tx.execute(
          `${verb} INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`,
          columns.map(c => row[c] ?? null),
        );
      }
    }
  });
};
