import { useGoalStore } from '../../src/store/goalStore';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
}));

describe('goalStore', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    useGoalStore.setState({
      goals: [],
      isLoading: false,
      error: null,
    });
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calculates emergency fund target from last 6 months of expenses', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 60000000 }] // ₹600,000 paise
    });
    mockExecute.mockResolvedValueOnce({}); // INSERT

    await useGoalStore.getState().getEmergencyFundTarget();

    // The average is 1,00,000 per month.
    // The target is 6 * 1,00,000 = 6,00,000.
    // In our simplified logic we just take the 6 months sum directly.
    expect(useGoalStore.getState().goals[0]).toEqual(expect.objectContaining({
      name: 'Emergency Fund',
      targetAmount: 600000,
      currentAmount: 0,
    }));
  });

  it('updates existing emergency fund target', async () => {
    // isEmergencyFund is what getEmergencyFundTarget actually keys off of now
    // (is_emergency_fund in the DB, populated by loadGoals/addGoal) — the old
    // name === 'Emergency Fund' match this replaced was case-sensitive and
    // silently invisible to a goal named e.g. "Emergency fund".
    useGoalStore.setState({
      goals: [{ id: 'ef1', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 0, isEmergencyFund: true }],
    });

    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 120000000 }] // ₹1,200,000 paise
    });
    mockExecute.mockResolvedValueOnce({}); // UPDATE

    await useGoalStore.getState().getEmergencyFundTarget();

    expect(useGoalStore.getState().goals[0]).toEqual(expect.objectContaining({
      name: 'Emergency Fund',
      targetAmount: 1200000,
    }));
    expect(mockExecute).toHaveBeenCalledWith(
      'UPDATE goals SET targetAmount = ? WHERE id = ?',
      [1200000, 'ef1']
    );
  });

  it('adds progress to a goal', async () => {
    useGoalStore.setState({
      goals: [{ id: 'g1', name: 'Car', targetAmount: 500000, currentAmount: 10000 }],
    });

    mockExecute.mockResolvedValueOnce({});

    await useGoalStore.getState().updateGoalProgress('g1', 5000);

    expect(useGoalStore.getState().goals[0].currentAmount).toBe(15000);
    expect(mockExecute).toHaveBeenCalledWith(
      'UPDATE goals SET currentAmount = ? WHERE id = ?;',
      [15000, 'g1']
    );
  });
});
