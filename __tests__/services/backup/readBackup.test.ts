const mockOpen = jest.fn();
// The factory is hoisted above the const above, so it must reach mockOpen
// lazily at call time rather than capturing it at module-evaluation time.
jest.mock('@op-engineering/op-sqlite', () => ({
  open: (...args: unknown[]) => mockOpen(...(args as [])),
}));

// The device's own schema version, read at runtime — never a hardcoded constant.
jest.mock('../../../src/services/backup/schemaVersion', () => ({
  readSchemaVersion: jest.fn(async () => 16),
}));

import {
  readBackup,
  BackupEncryptedError,
  BackupTooNewError,
} from '../../../src/services/backup/readBackup';

const fileWith = (meta: any, tables: Record<string, any[]> = {}) => ({
  execute: jest.fn(async (sql: string) => {
    if (sql.includes('backup_meta')) return { rows: meta ? [meta] : [] };
    const match = sql.match(/FROM (\w+)/);
    return { rows: match ? tables[match[1]] ?? [] : [] };
  }),
  close: jest.fn(),
});

describe('readBackup', () => {
  beforeEach(() => mockOpen.mockReset());

  it('asks for a passphrase when the file will not open unencrypted', async () => {
    mockOpen.mockImplementation(() => { throw new Error('file is not a database'); });
    await expect(readBackup('/tmp/b.ckbackup')).rejects.toBeInstanceOf(BackupEncryptedError);
  });

  it('reports a wrong passphrase rather than swallowing it', async () => {
    mockOpen.mockImplementation(() => { throw new Error('file is not a database'); });
    await expect(readBackup('/tmp/b.ckbackup', 'wrong')).rejects.toBeInstanceOf(BackupEncryptedError);
  });

  it('refuses a backup newer than this app understands', async () => {
    mockOpen.mockReturnValue(
      fileWith({ format_version: 1, schema_user_version: 999, created_at: 1 }),
    );
    await expect(readBackup('/tmp/b.ckbackup')).rejects.toBeInstanceOf(BackupTooNewError);
  });

  it('returns rows from an older backup', async () => {
    mockOpen.mockReturnValue(
      fileWith(
        { format_version: 1, schema_user_version: 2, created_at: 1 },
        { categories: [{ id: 'c1', name: 'Food' }] },
      ),
    );
    const result = await readBackup('/tmp/b.ckbackup');
    expect(result.rows.categories).toHaveLength(1);
    expect(result.meta.schema_user_version).toBe(2);
  });
});
