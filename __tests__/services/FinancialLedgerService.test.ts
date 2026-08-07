const mockExecute = jest.fn();
const mockTransaction = jest.fn(async (cb: (tx: { execute: jest.Mock }) => Promise<void>) => {
  await cb({ execute: mockExecute });
});
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute, transaction: mockTransaction }),
}));
jest.mock('../../src/store/transactionStore', () => ({
  resolveCategoryId: jest.fn().mockResolvedValue('cat-savings'),
}));
jest.mock('../../src/services/EventBus', () => ({
  financialEventBus: { emit: jest.fn(), subscribe: jest.fn() },
}));

import { FinancialLedgerService } from '../../src/services/FinancialLedgerService';

describe('FinancialLedgerService.fundGoal', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockTransaction.mockClear();
  });

  it('writes goal_id on the transfer transaction it inserts', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('SELECT * FROM goals')) {
        return Promise.resolve({ rows: [{ id: 'g1', name: 'Car', currentAmount: 10000, targetAmount: 500000 }] });
      }
      return Promise.resolve({});
    });

    await FinancialLedgerService.fundGoal('g1', 5000);

    const insertCall = mockExecute.mock.calls.find(([sql]: [string]) => sql.includes('INSERT INTO transactions'));
    expect(insertCall).toBeDefined();
    const [sql, args] = insertCall as [string, unknown[]];
    expect(sql).toContain('goal_id');
    // args order must match the column list in the INSERT
    expect(args).toContain('g1');
  });
});
