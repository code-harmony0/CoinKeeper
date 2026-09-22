const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({
    execute: mockExecute,
    // op-sqlite hands the callback a transaction handle with the same execute.
    transaction: (fn: (tx: { execute: jest.Mock }) => Promise<void>) => fn({ execute: mockExecute }),
  }),
}));

import { getImportedSmsIds, useTransactionStore } from '../../src/store/transactionStore';

beforeEach(() => {
  mockExecute.mockReset();
  useTransactionStore.setState({ transactions: [], loading: false });
});

describe('transactionStore', () => {
  it('addTransaction rejects a non-positive amount and never touches the DB', async () => {
    await expect(
      useTransactionStore.getState().addTransaction({
        amountPaise: 0,
        type: 'expense',
        category: 'Food',
        categoryIcon: 'food',
      }),
    ).rejects.toThrow('Invalid amount');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('addTransaction propagates a DB failure instead of swallowing it', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('SELECT id, icon FROM categories')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('INSERT INTO categories')) return Promise.resolve({});
      if (sql.startsWith('INSERT INTO transactions')) return Promise.reject(new Error('disk full'));
      return Promise.resolve({ rows: [] });
    });

    await expect(
      useTransactionStore.getState().addTransaction({
        amountPaise: 10000,
        type: 'expense',
        category: 'Food',
        categoryIcon: 'food',
      }),
    ).rejects.toThrow('disk full');
  });

  it('addTransaction classifies a newly auto-created category with a budget_bucket', async () => {
    let insertedArgs: unknown[] = [];
    mockExecute.mockImplementation((sql: string, args: unknown[] = []) => {
      if (sql.startsWith('SELECT id, icon FROM categories')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('INSERT INTO categories')) {
        insertedArgs = args;
        return Promise.resolve({});
      }
      if (sql.startsWith('INSERT INTO transactions')) return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await useTransactionStore.getState().addTransaction({
      amountPaise: 10000,
      type: 'expense',
      category: 'Rent',
      categoryIcon: 'home',
    });

    // args: [id, normalized, icon, budget_bucket] — 'Rent' should classify as 'needs'
    expect(insertedArgs[3]).toBe('needs');
  });

  describe('SMS inbox import', () => {
    const sms = (smsId: string, amountPaise = 10000) => ({
      amountPaise,
      type: 'expense' as const,
      category: 'Food',
      categoryIcon: 'food',
      smsId,
    });

    const okDb = () =>
      mockExecute.mockImplementation((sql: string) =>
        Promise.resolve(sql.startsWith('SELECT id, icon FROM categories') ? { rows: [{ id: 'food' }] } : { rows: [] }),
      );

    it('addTransactions saves every row with one ledger event, not one per row', async () => {
      okDb();
      const { financialEventBus } = require('../../src/services/EventBus');
      const emit = jest.spyOn(financialEventBus, 'emit').mockImplementation(() => undefined);

      const saved = await useTransactionStore.getState().addTransactions([sms('1'), sms('2'), sms('3')]);

      expect(saved).toBe(3);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(useTransactionStore.getState().transactions).toHaveLength(3);
      emit.mockRestore();
    });

    it('records which inbox message each import came from', async () => {
      okDb();
      await useTransactionStore.getState().addTransactions([sms('42')]);

      const insert = mockExecute.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO transactions'));
      expect(insert![1]).toContain('sms:42');
    });

    it('addTransactions stops at the first failure and reports how many were saved', async () => {
      let inserts = 0;
      mockExecute.mockImplementation((sql: string) => {
        if (sql.startsWith('INSERT INTO transactions') && ++inserts === 2) return Promise.reject(new Error('disk full'));
        return Promise.resolve({ rows: [{ id: 'food' }] });
      });

      expect(await useTransactionStore.getState().addTransactions([sms('1'), sms('2'), sms('3')])).toBe(1);
    });

    it('deleteImportedSmsTransactions removes only the SMS-imported rows', async () => {
      // Counted before deleting: op-sqlite reports no rowsAffected for this
      // statement, which had the app announcing "0 removed" after clearing
      // hundreds of rows.
      mockExecute.mockImplementation((sql: string) =>
        Promise.resolve(
          sql.startsWith('SELECT COUNT(*)') ? { rows: [{ total: 531 }] } : { rows: [] },
        ),
      );

      const removed = await useTransactionStore.getState().deleteImportedSmsTransactions();

      expect(removed).toBe(531);
      const [sql] = mockExecute.mock.calls.find(([s]) => s.startsWith('DELETE FROM transactions'))!;
      expect(sql).toContain("sms_hash LIKE 'sms:%'");
    });

    it('getImportedSmsIds returns the message ids already saved', async () => {
      mockExecute.mockResolvedValue({ rows: [{ sms_hash: 'sms:7' }, { sms_hash: 'sms:9' }] });

      expect(await getImportedSmsIds()).toEqual(new Set(['7', '9']));
    });
  });

  it('deleteTransaction propagates a DB failure', async () => {
    mockExecute.mockRejectedValue(new Error('locked'));
    await expect(useTransactionStore.getState().deleteTransaction('tx1')).rejects.toThrow('locked');
  });

  it('loadTransactions maps the category color through to the Transaction shape', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.includes('FROM transactions t')) {
        return Promise.resolve({
          rows: [
            {
              id: 'tx1',
              amount_paise: 45000,
              type: 'expense',
              category: 'Groceries',
              categoryIcon: 'ShoppingCart',
              categoryColor: '#FFB86B',
              description: null,
              occurred_at: Date.now(),
              paymentMethod: null,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await useTransactionStore.getState().loadTransactions();

    expect(useTransactionStore.getState().transactions[0].categoryColor).toBe('#FFB86B');
  });

  it('searchTransactions filters by description and category, case-insensitively', () => {
    useTransactionStore.setState({
      transactions: [
        { id: '1', amountPaise: 5000, type: 'expense', category: 'Food', categoryId: 'food', categoryIcon: 'food', description: 'Swiggy order', date: '2026-01-01T00:00:00.000Z' },
        { id: '2', amountPaise: 2000, type: 'expense', category: 'Transport', categoryId: 'transport', categoryIcon: 'car', description: 'Uber ride', date: '2026-01-02T00:00:00.000Z' },
      ],
      loading: false,
    });

    expect(useTransactionStore.getState().searchTransactions('swig').map(t => t.id)).toEqual(['1']);
    expect(useTransactionStore.getState().searchTransactions('transport').map(t => t.id)).toEqual(['2']);
    expect(useTransactionStore.getState().searchTransactions('').map(t => t.id)).toEqual(['1', '2']);
  });
});
