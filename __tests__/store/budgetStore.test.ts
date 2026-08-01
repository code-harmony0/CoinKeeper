import { useBudgetStore } from '../../src/store/budgetStore';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
}));

describe('budgetStore', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    useBudgetStore.setState({
      settings: { needsPercent: 50, wantsPercent: 30, savingsPercent: 20 },
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads budget successfully from existing row', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ needs_percent: 60, wants_percent: 20, savings_percent: 20 }],
    });

    await useBudgetStore.getState().loadBudget();
    
    expect(mockExecute).toHaveBeenCalledWith(
      'SELECT needs_percent, wants_percent, savings_percent FROM budget_settings WHERE id = 1;'
    );
    expect(useBudgetStore.getState().settings).toEqual({
      needsPercent: 60,
      wantsPercent: 20,
      savingsPercent: 20,
    });
  });

  it('inserts default budget if table is empty', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // empty select
    mockExecute.mockResolvedValueOnce({}); // successful insert

    await useBudgetStore.getState().loadBudget();

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      'INSERT OR IGNORE INTO budget_settings (id, needs_percent, wants_percent, savings_percent) VALUES (1, 50, 30, 20);'
    );
    expect(useBudgetStore.getState().settings).toEqual({
      needsPercent: 50,
      wantsPercent: 30,
      savingsPercent: 20,
    });
  });

  it('saves budget successfully when sum is 100', async () => {
    mockExecute.mockResolvedValueOnce({});

    await useBudgetStore.getState().saveBudget({
      needsPercent: 60,
      wantsPercent: 30,
      savingsPercent: 10,
    });

    expect(mockExecute).toHaveBeenCalled();
    const query = mockExecute.mock.calls[0][0];
    expect(query).toContain('ON CONFLICT(id) DO UPDATE SET');
    expect(useBudgetStore.getState().settings).toEqual({
      needsPercent: 60,
      wantsPercent: 30,
      savingsPercent: 10,
    });
  });

  it('rejects budget when sum is not 100', async () => {
    await expect(
      useBudgetStore.getState().saveBudget({
        needsPercent: 60,
        wantsPercent: 40,
        savingsPercent: 10, // sums to 110
      })
    ).rejects.toThrow('Budget percentages must sum to exactly 100.');

    expect(mockExecute).not.toHaveBeenCalled();
    expect(useBudgetStore.getState().error).toBe('Budget percentages must sum to exactly 100.');
  });
});
