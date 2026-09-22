import { SmsMissLog, MISS_LOG_LIMIT } from '../../src/services/sms/smsMissLog';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({ getDb: jest.fn() }));

describe('SmsMissLog', () => {
  let executed: { query: string; params: any[] }[];
  let selectRows: any[];

  beforeEach(() => {
    executed = [];
    selectRows = [];
    (getDb as jest.Mock).mockReturnValue({
      execute: jest.fn(async (query: string, params: any[] = []) => {
        executed.push({ query, params });
        return { rows: query.trim().toUpperCase().startsWith('SELECT') ? selectRows : [] };
      }),
    });
  });

  afterEach(() => jest.clearAllMocks());

  const inserts = () => executed.filter(e => /INSERT/i.test(e.query));

  describe('record', () => {
    it('stores a message no tier could parse', async () => {
      await SmsMissLog.record({ id: '1', body: 'Some odd bank format', sender: 'HDFCBK', receivedAt: 5 });

      expect(inserts()).toHaveLength(1);
      expect(inserts()[0].params).toContain('Some odd bank format');
    });

    it('does not store the same message twice', async () => {
      // The unique index makes the write idempotent; the query must say so
      // rather than throwing on the second inbox scan.
      await SmsMissLog.record({ id: '1', body: 'Repeat', sender: 'X', receivedAt: 5 });

      expect(inserts()[0].query).toMatch(/OR IGNORE|ON CONFLICT/i);
    });

    it('ignores an empty message', async () => {
      await SmsMissLog.record({ id: '1', body: '   ', sender: 'X', receivedAt: 5 });

      expect(inserts()).toHaveLength(0);
    });

    it('does not trim on every single message', async () => {
      // An inbox scan records hundreds of misses in a row. Trimming inside
      // each one turns a scan into hundreds of correlated-subquery deletes,
      // which is what made a deep scan crawl on a real phone.
      await SmsMissLog.record({ id: '1', body: 'Odd one', sender: 'X', receivedAt: 5 });
      await SmsMissLog.record({ id: '2', body: 'Odd two', sender: 'X', receivedAt: 6 });

      expect(executed.filter(e => /DELETE/i.test(e.query))).toHaveLength(0);
    });
  });

  describe('trim', () => {
    it('caps the log at the limit when called once after a scan', async () => {
      await SmsMissLog.trim();

      const trim = executed.find(e => /DELETE/i.test(e.query));
      expect(trim).toBeDefined();
      expect(trim!.params).toContain(MISS_LOG_LIMIT);
    });
  });

  describe('list', () => {
    it('returns the stored misses newest first', async () => {
      selectRows = [
        { id: 'a', body: 'one', sender: 'HDFCBK', received_at: 20, logged_at: 21 },
        { id: 'b', body: 'two', sender: 'ICICI', received_at: 10, logged_at: 11 },
      ];

      const rows = await SmsMissLog.list();

      expect(rows.map(r => r.body)).toEqual(['one', 'two']);
      expect(executed[0].query).toMatch(/ORDER BY .*DESC/is);
    });

    it('returns an empty list when nothing has been missed', async () => {
      expect(await SmsMissLog.list()).toEqual([]);
    });
  });

  describe('count', () => {
    it('reports how many messages went unparsed', async () => {
      selectRows = [{ total: 7 }];

      expect(await SmsMissLog.count()).toBe(7);
    });

    it('reports zero when the table is empty', async () => {
      selectRows = [{ total: null }];

      expect(await SmsMissLog.count()).toBe(0);
    });
  });

  describe('clear', () => {
    it('deletes every stored message', async () => {
      await SmsMissLog.clear();

      expect(executed.some(e => /DELETE FROM sms_parse_misses/i.test(e.query))).toBe(true);
    });
  });
});
