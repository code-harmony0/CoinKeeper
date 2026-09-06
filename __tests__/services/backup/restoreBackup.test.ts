const mockExecute = jest.fn();
const mockTransaction = jest.fn(async (fn: any) => fn({ execute: mockExecute }));
jest.mock('../../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute, transaction: mockTransaction }),
}));

import { restoreBackup } from '../../../src/services/backup/restoreBackup';

const rows = { categories: [{ id: 'c1', name: 'Food' }] };

describe('restoreBackup', () => {
  beforeEach(() => {
    mockExecute.mockReset().mockResolvedValue({ rows: [] });
    mockTransaction.mockClear();
  });

  it('replace mode clears a table before inserting into it', async () => {
    await restoreBackup(rows, 'replace');
    const sql = mockExecute.mock.calls.map(c => c[0]);
    const deleted = sql.findIndex(s => s.includes('DELETE FROM categories'));
    const inserted = sql.findIndex(s => s.includes('INSERT') && s.includes('categories'));
    expect(deleted).toBeGreaterThanOrEqual(0);
    expect(inserted).toBeGreaterThan(deleted);
  });

  it('merge mode never deletes and never overwrites', async () => {
    await restoreBackup(rows, 'merge');
    const sql = mockExecute.mock.calls.map(c => c[0]).join(' ');
    expect(sql).not.toContain('DELETE');
    expect(sql).not.toContain('INSERT OR REPLACE');
    expect(sql).toContain('INSERT OR IGNORE');
  });

  it('runs inside a single transaction so a failure rolls back', async () => {
    await restoreBackup(rows, 'replace');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('propagates a mid-restore failure instead of reporting success', async () => {
    mockExecute.mockRejectedValueOnce(new Error('constraint failed'));
    await expect(restoreBackup(rows, 'replace')).rejects.toThrow('constraint failed');
  });
});
