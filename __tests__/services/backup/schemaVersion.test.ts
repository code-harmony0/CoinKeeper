const mockExecute = jest.fn();
jest.mock('../../../src/store/database', () => ({ getDb: () => ({ execute: mockExecute }) }));

import { readSchemaVersion } from '../../../src/services/backup/schemaVersion';

describe('readSchemaVersion', () => {
  beforeEach(() => mockExecute.mockReset());

  it('reads the version from the database rather than a constant', async () => {
    mockExecute.mockResolvedValue({ rows: [{ user_version: 16 }] });
    expect(await readSchemaVersion()).toBe(16);
  });

  it('survives the column coming back under a different key', async () => {
    mockExecute.mockResolvedValue({ rows: [{ 'PRAGMA user_version': 9 }] });
    expect(await readSchemaVersion()).toBe(9);
  });

  it('returns 0 when the pragma yields nothing', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    expect(await readSchemaVersion()).toBe(0);
  });
});
