import { open } from '@op-engineering/op-sqlite';
import type { CollectedRows } from './collectRows';

export const BACKUP_FORMAT_VERSION = 1;

interface WriteBackupOptions {
  rows: CollectedRows;
  schemaVersion: number;
  path: string;
  fileName?: string;
  passphrase?: string;
}

/**
 * The backup is itself a SQLite database. The passphrase goes straight to
 * SQLCipher, which derives the key and stores its own salt in the file header —
 * so the file is openable with nothing but the passphrase. Deriving a key
 * ourselves would strand the salt inside the file it is needed to open.
 */
export const writeBackup = async ({
  rows,
  schemaVersion,
  path,
  fileName = 'coinkeeper-backup.ckbackup',
  passphrase,
}: WriteBackupOptions): Promise<string> => {
  const file = open({ name: fileName, location: path, encryptionKey: passphrase });

  try {
    await file.execute(
      `CREATE TABLE IF NOT EXISTS backup_meta (
         format_version INTEGER NOT NULL,
         schema_user_version INTEGER NOT NULL,
         created_at INTEGER NOT NULL
       );`,
    );
    await file.execute(
      'INSERT INTO backup_meta (format_version, schema_user_version, created_at) VALUES (?, ?, ?);',
      [BACKUP_FORMAT_VERSION, schemaVersion, Date.now()],
    );

    for (const [table, tableRows] of Object.entries(rows)) {
      if (tableRows.length === 0) continue;

      const columns = Object.keys(tableRows[0]);
      const quoted = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');

      await file.execute(
        `CREATE TABLE IF NOT EXISTS ${table} (${columns.join(', ')});`,
      );
      for (const row of tableRows) {
        await file.execute(
          `INSERT INTO ${table} (${quoted}) VALUES (${placeholders});`,
          columns.map(c => row[c] ?? null),
        );
      }
    }

    return `${path}/${fileName}`;
  } finally {
    try {
      file.close();
    } catch {
      // Closing a handle we are abandoning anyway must not mask the real error.
    }
  }
};
