import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../src/services/FinancialLedgerService', () => ({
  FinancialLedgerService: { getGoalContributions: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../../src/services/FinancialIntelligenceEngine', () => ({
  FinancialIntelligenceEngine: {
    getCurrentSnapshot: jest.fn().mockResolvedValue({ savingsBudget: 500000 }),
  },
}));
jest.mock('../../src/store/goalStore', () => ({
  useGoalStore: jest.fn(),
}));

import { useGoalStore } from '../../src/store/goalStore';
import { FinancialLedgerService } from '../../src/services/FinancialLedgerService';
import { useGoalIntelligence } from '../../src/hooks/useGoalIntelligence';

describe('useGoalIntelligence', () => {
  beforeEach(() => {
    (useGoalStore as unknown as jest.Mock).mockReturnValue({
      goals: [
        { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 20000 },
      ],
    });
  });

  it('returns a ranked list with health attached for each goal', async () => {
    (FinancialLedgerService.getGoalContributions as jest.Mock).mockResolvedValue([
      { amountPaise: 5000, occurredAtMs: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    ]);

    const { result } = renderHook(() => useGoalIntelligence());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rankedGoals).toHaveLength(1);
    expect(result.current.rankedGoals[0].goal.id).toBe('g1');
    expect(result.current.rankedGoals[0].health.state).toBe('healthy');
    expect(result.current.savingsBudgetRemainingPaise).toBe(495000);
  });
});
