import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { BACKUP_TABLES } from './backupTables';
import { collectRows } from './collectRows';
import { readSchemaVersion } from './schemaVersion';
import { writeBackup } from './writeBackup';

export * from './backupTables';
export * from './collectRows';
export * from './readBackup';
export * from './restoreBackup';
export * from './schemaVersion';
export * from './writeBackup';

/** Dated so a new backup never silently overwrites yesterday's. */
const backupFileName = (): string =>
  `coinkeeper-backup-${new Date().toISOString().slice(0, 10)}.ckbackup`;

/**
 * Gathers every backed-up table, writes them to an optionally encrypted file,
 * and hands it to the share sheet. The file stays on the device unless the user
 * chooses to send it somewhere — nothing is uploaded.
 */
export const createAndShareBackup = async (passphrase?: string): Promise<void> => {
  const [rows, schemaVersion] = await Promise.all([
    collectRows(BACKUP_TABLES),
    readSchemaVersion(),
  ]);

  const path = await writeBackup({
    rows,
    schemaVersion,
    // The cache directory, not documents: react-native-share's FileProvider
    // serves cache-path and external Download/ only, so a file written to the
    // app's private files/ dir cannot be handed to the share sheet at all.
    path: RNFS.CachesDirectoryPath,
    fileName: backupFileName(),
    passphrase,
  });

  try {
    await Share.open({ url: `file://${path}` });
  } catch (error) {
    // Dismissing the sheet rejects with this exact message, and the file is
    // already written, so that is genuinely not a failure. Anything else is,
    // and must not be swallowed — doing so once hid a completely broken
    // share path behind a message that read like a user cancelling.
    const dismissed =
      error instanceof Error && /User did not share/i.test(error.message);
    if (!dismissed) throw error;
  }
};
