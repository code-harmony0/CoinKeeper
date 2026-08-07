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

  it('calculates emergency fund target from last 6 months of expenses, staying in paise', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 60000000 }] // ₹6,00,000 in paise
    });
    mockExecute.mockResolvedValueOnce({}); // INSERT

    await useGoalStore.getState().getEmergencyFundTarget();

    // targetAmount must stay in paise, like currentAmount — no /100 anywhere.
    expect(useGoalStore.getState().goals[0]).toEqual(expect.objectContaining({
      name: 'Emergency Fund',
      targetAmount: 60000000,
      currentAmount: 0,
    }));
  });

  it('floors the target at ₹50,000 (5000000 paise) when expenses are low', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 1200000 }] // ₹12,000 in paise — below the floor
    });
    mockExecute.mockResolvedValueOnce({}); // INSERT

    await useGoalStore.getState().getEmergencyFundTarget();

    expect(useGoalStore.getState().goals[0].targetAmount).toBe(5000000);
  });

  it('updates existing emergency fund target, staying in paise', async () => {
    useGoalStore.setState({
      goals: [{ id: 'ef1', name: 'Emergency Fund', targetAmount: 10000000, currentAmount: 0, isEmergencyFund: true }],
    });

    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 120000000 }] // ₹12,00,000 in paise
    });
    mockExecute.mockResolvedValueOnce({}); // UPDATE

    await useGoalStore.getState().getEmergencyFundTarget();

    expect(useGoalStore.getState().goals[0]).toEqual(expect.objectContaining({
      name: 'Emergency Fund',
      targetAmount: 120000000,
    }));
    expect(mockExecute).toHaveBeenCalledWith(
      'UPDATE goals SET targetAmount = ? WHERE id = ?',
      [120000000, 'ef1']
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
