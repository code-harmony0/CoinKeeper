const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

import { useTransactionStore } from '../../src/store/transactionStore';

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
