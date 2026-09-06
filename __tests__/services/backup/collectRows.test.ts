const mockExecute = jest.fn();
jest.mock('../../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

import { collectRows } from '../../../src/services/backup/collectRows';

describe('collectRows', () => {
  beforeEach(() => mockExecute.mockReset());

  it('reads every requested table', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    await collectRows(['categories', 'goals']);
    const sql = mockExecute.mock.calls.map(c => c[0]).join(' ');
    expect(sql).toContain('FROM categories');
    expect(sql).toContain('FROM goals');
  });

  it('blanks columns that point at files outside the database', async () => {
    mockExecute.mockResolvedValue({
      rows: [{ id: 'r1', image_uri: '/data/user/0/img.jpg', total_paise: 500 }],
    });
    const out = await collectRows(['receipt_history']);
    expect(out.receipt_history[0].image_uri).toBeNull();
    expect(out.receipt_history[0].total_paise).toBe(500);
  });

  it('treats a missing table as empty rather than failing the whole backup', async () => {
    mockExecute.mockRejectedValueOnce(new Error('no such table: quick_templates'));
    const out = await collectRows(['quick_templates']);
    expect(out.quick_templates).toEqual([]);
  });
});
