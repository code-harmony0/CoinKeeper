const mockBackupExecute = jest.fn();
const mockClose = jest.fn();
const mockOpen = jest.fn(() => ({ execute: mockBackupExecute, close: mockClose }));

// The factory is hoisted above the consts above, so it must reach mockOpen
// lazily at call time rather than capturing it at module-evaluation time.
jest.mock('@op-engineering/op-sqlite', () => ({
  open: (...args: unknown[]) => mockOpen(...(args as [])),
}));

import { writeBackup, BACKUP_FORMAT_VERSION } from '../../../src/services/backup/writeBackup';

describe('writeBackup', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    mockBackupExecute.mockReset().mockResolvedValue({ rows: [] });
    mockClose.mockClear();
  });

  const rows = { categories: [{ id: 'c1', name: 'Food' }] };

  it('passes the passphrase to SQLCipher as the encryption key', async () => {
    await writeBackup({ rows, schemaVersion: 16, path: '/tmp', passphrase: 'hunter2' });
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ encryptionKey: 'hunter2' }),
    );
  });

  it('writes an unencrypted file when no passphrase is given', async () => {
    await writeBackup({ rows, schemaVersion: 16, path: '/tmp' });
    expect(mockOpen.mock.calls[0][0].encryptionKey).toBeUndefined();
  });

  it('records the schema version so restore can refuse a newer file', async () => {
    await writeBackup({ rows, schemaVersion: 16, path: '/tmp' });
    const sql = mockBackupExecute.mock.calls.map(c => c[0]).join(' ');
    expect(sql).toContain('backup_meta');
    const params = mockBackupExecute.mock.calls.flatMap(c => c[1] ?? []);
    expect(params).toContain(16);
    expect(params).toContain(BACKUP_FORMAT_VERSION);
  });

  it('closes the file even when writing throws', async () => {
    mockBackupExecute.mockRejectedValue(new Error('disk full'));
    await expect(
      writeBackup({ rows, schemaVersion: 16, path: '/tmp' }),
    ).rejects.toThrow('disk full');
    expect(mockClose).toHaveBeenCalled();
  });
});
