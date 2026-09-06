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
    path: RNFS.DocumentDirectoryPath,
    fileName: backupFileName(),
    passphrase,
  });

  try {
    await Share.open({ url: `file://${path}` });
  } catch (error) {
    // Dismissing the share sheet rejects. The backup file is already written, so
    // that is not a failure the user needs reported as one.
    console.warn('[backup] share sheet dismissed:', error);
  }
};
