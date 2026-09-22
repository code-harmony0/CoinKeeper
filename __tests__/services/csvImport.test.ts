import { importTransactionsFromCsv } from '../../src/services/csv/importTransactions';
import { CSV_HEADER } from '../../src/services/csv/transactionCsv';
import { getDb } from '../../src/store/database';
import { financialEventBus } from '../../src/services/EventBus';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('../../src/store/transactionStore', () => ({
  resolveCategoryId: jest.fn(async (_db: any, name: string) => `cat-${name.toLowerCase()}`),
}));

describe('importTransactionsFromCsv', () => {
  let inserts: any[][];
  let existing: Set<string>;

  beforeEach(() => {
    inserts = [];
    existing = new Set();

    const execute = jest.fn(async (query: string, params: any[] = []) => {
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        const key = `${params[0]}|${params[1]}`;
        return { rows: existing.has(key) ? [{ id: 'dupe' }] : [] };
      }
      inserts.push(params);
      return { rows: [] };
    });

    (getDb as jest.Mock).mockReturnValue({ execute });
  });

  afterEach(() => jest.clearAllMocks());

  const csv = (...lines: string[]) => CSV_HEADER + lines.join('\n') + '\n';

  it('imports a valid row into the transactions table', async () => {
    const result = await importTransactionsFromCsv(
      csv('2026-07-14,1250.50,expense,Food,Swiggy,'),
    );

    expect(result.imported).toBe(1);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toContain(125050);
  });

  it('resolves the category name to a category id', async () => {
    await importTransactionsFromCsv(csv('2026-07-14,100.00,expense,Food,Swiggy,'));

    expect(inserts[0]).toContain('cat-food');
  });

  it('skips a row that already exists rather than duplicating it', async () => {
    existing.add(`${Date.parse('2026-07-14')}|10000`);

    const result = await importTransactionsFromCsv(
      csv('2026-07-14,100.00,expense,Food,Swiggy,'),
    );

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(inserts).toHaveLength(0);
  });

  it('reports bad rows but still imports the good ones', async () => {
    const result = await importTransactionsFromCsv(
      csv(
        '2026-07-14,100.00,expense,Food,Swiggy,',
        '2026-07-15,oops,expense,Food,Zomato,',
      ),
    );

    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('notifies the app once when anything was imported', async () => {
    const emit = jest.spyOn(financialEventBus, 'emit');

    await importTransactionsFromCsv(csv('2026-07-14,100.00,expense,Food,Swiggy,'));

    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('does not notify the app when nothing was imported', async () => {
    const emit = jest.spyOn(financialEventBus, 'emit');

    await importTransactionsFromCsv(csv('2026-07-14,oops,expense,Food,Swiggy,'));

    expect(emit).not.toHaveBeenCalled();
  });

  it('imports nothing when the header is wrong', async () => {
    const result = await importTransactionsFromCsv('Foo,Bar\n1,2\n');

    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});
