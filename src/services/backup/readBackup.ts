import { open } from '@op-engineering/op-sqlite';
import { BACKUP_TABLES } from './backupTables';
import { readSchemaVersion } from './schemaVersion';
import type { CollectedRows } from './collectRows';

export class BackupEncryptedError extends Error {
  constructor() {
    super('This backup is protected. Enter the passphrase used when it was created.');
  }
}

export class BackupTooNewError extends Error {
  constructor(found: number) {
    super(
      `This backup was made by a newer version of CoinKeeper (v${found}). Update the app, then restore.`,
    );
  }
}

export interface BackupMeta {
  format_version: number;
  schema_user_version: number;
  created_at: number;
}

export const readBackup = async (
  path: string,
  passphrase?: string,
): Promise<{ meta: BackupMeta; rows: CollectedRows }> => {
  const separator = path.lastIndexOf('/');
  const location = path.slice(0, separator);
  const name = path.slice(separator + 1);

  let file;
  try {
    file = open({ name, location, encryptionKey: passphrase });
  } catch {
    // SQLCipher cannot distinguish "encrypted" from "wrong key" — both surface
    // as an unreadable file, and both are answered by asking for the passphrase.
    throw new BackupEncryptedError();
  }

  try {
    const metaResult = await file.execute('SELECT * FROM backup_meta LIMIT 1;');
    const meta = metaResult?.rows?.[0] as BackupMeta | undefined;
    if (!meta) throw new BackupEncryptedError();

    const deviceVersion = await readSchemaVersion();
    if (meta.schema_user_version > deviceVersion) {
      throw new BackupTooNewError(meta.schema_user_version);
    }

    const rows: CollectedRows = {};
    for (const table of BACKUP_TABLES) {
      try {
        const result = await file.execute(`SELECT * FROM ${table};`);
        rows[table] = (result?.rows ?? []) as CollectedRows[string];
      } catch {
        rows[table] = [];
      }
    }

    return { meta, rows };
  } finally {
    try {
      file.close();
    } catch {
      // Nothing useful to do; the real error must survive.
    }
  }
};
