interface WriteBackupCall {
  path: string;
  schemaVersion: number;
  fileName?: string;
  passphrase?: string;
}

const mockCollectRows = jest.fn(async () => ({ categories: [{ id: 'c1' }] }));
const mockWriteBackup = jest.fn(
  async (_options: WriteBackupCall) => '/docs/coinkeeper-backup-2026-09-06.ckbackup',
);
const mockReadSchemaVersion = jest.fn(async () => 16);
const mockShareOpen = jest.fn(async (_options: { url: string }) => ({ success: true }));

// `import` is hoisted above the const declarations above, so each factory must
// defer to its mock at call time rather than capture it at module-eval time.
jest.mock('../../../src/services/backup/collectRows', () => ({
  collectRows: () => mockCollectRows(),
}));
jest.mock('../../../src/services/backup/writeBackup', () => ({
  writeBackup: (options: WriteBackupCall) => mockWriteBackup(options),
  BACKUP_FORMAT_VERSION: 1,
}));
jest.mock('../../../src/services/backup/schemaVersion', () => ({
  readSchemaVersion: () => mockReadSchemaVersion(),
}));
jest.mock('react-native-share', () => ({
  open: (options: { url: string }) => mockShareOpen(options),
}));
jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/caches',
  DocumentDirectoryPath: '/docs',
}));

import { createAndShareBackup } from '../../../src/services/backup';

describe('createAndShareBackup', () => {
  beforeEach(() => {
    mockCollectRows.mockClear();
    mockWriteBackup.mockClear();
    mockReadSchemaVersion.mockClear();
    mockShareOpen.mockClear();
  });

  it('stamps the backup with the device schema version, not a constant', async () => {
    mockReadSchemaVersion.mockResolvedValueOnce(9);
    await createAndShareBackup();
    expect(mockWriteBackup).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 9 }),
    );
  });

  it('passes the passphrase through so the file is encrypted', async () => {
    await createAndShareBackup('hunter2');
    expect(mockWriteBackup).toHaveBeenCalledWith(
      expect.objectContaining({ passphrase: 'hunter2' }),
    );
  });

  it('writes an unencrypted file when no passphrase is given', async () => {
    await createAndShareBackup();
    expect(mockWriteBackup.mock.calls[0][0].passphrase).toBeUndefined();
  });

  it('names the file by date so backups do not overwrite each other', async () => {
    await createAndShareBackup();
    expect(mockWriteBackup.mock.calls[0][0].fileName).toMatch(
      /^coinkeeper-backup-\d{4}-\d{2}-\d{2}\.ckbackup$/,
    );
  });

  it('shares the exact path writeBackup reported', async () => {
    await createAndShareBackup();
    expect(mockShareOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///docs/coinkeeper-backup-2026-09-06.ckbackup',
      }),
    );
  });

  it('writes into the cache directory, the only root the share sheet serves', async () => {
    // react-native-share's FileProvider declares cache-path and external
    // Download/ only. A file in the app's private files/ dir cannot be shared.
    await createAndShareBackup();
    expect(mockWriteBackup.mock.calls[0][0].path).toBe('/caches');
  });

  it('does not treat a cancelled share sheet as a failure', async () => {
    mockShareOpen.mockRejectedValueOnce(new Error('User did not share'));
    await expect(createAndShareBackup()).resolves.toBeUndefined();
  });

  it('surfaces a real share failure instead of calling it a dismissal', async () => {
    // Swallowing every share error is how a totally broken share path looked
    // like a user cancelling on the device.
    mockShareOpen.mockRejectedValueOnce(
      new Error("Attempt to invoke virtual method 'Uri.getScheme()' on a null object"),
    );
    await expect(createAndShareBackup()).rejects.toThrow(/getScheme/);
  });

  it('surfaces a real write failure instead of reporting success', async () => {
    mockWriteBackup.mockRejectedValueOnce(new Error('disk full'));
    await expect(createAndShareBackup()).rejects.toThrow('disk full');
    expect(mockShareOpen).not.toHaveBeenCalled();
  });
});
