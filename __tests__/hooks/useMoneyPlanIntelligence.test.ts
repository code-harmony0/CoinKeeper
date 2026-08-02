import { renderHook, waitFor } from '@testing-library/react-native';
import { useMoneyPlanIntelligence } from '../../src/hooks/useMoneyPlanIntelligence';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

describe('useMoneyPlanIntelligence', () => {
  beforeEach(() => mockExecute.mockReset());

  it('loads income and per-bucket totals with top categories', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 5000000 }] }) // last month income (paise)
      .mockResolvedValueOnce({ rows: [{ total: 1500000 }] }) // needs: this month
      .mockResolvedValueOnce({ rows: [{ total: 1000000 }] }) // needs: previous month
      .mockResolvedValueOnce({ rows: [{ name: 'Rent', total: 1000000 }, { name: 'Groceries', total: 500000 }] }) // needs: top categories
      .mockResolvedValueOnce({ rows: [{ total: 800000 }] }) // wants: this month
      .mockResolvedValueOnce({ rows: [{ total: 800000 }] }) // wants: previous month
      .mockResolvedValueOnce({ rows: [{ name: 'Dining', total: 800000 }] }) // wants: top categories
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // savings: this month
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // savings: previous month
      .mockResolvedValueOnce({ rows: [] }) // savings: top categories
      .mockResolvedValueOnce({ rows: [] }); // emergency fund goal

    const { result } = renderHook(() => useMoneyPlanIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.income).toBe(50000);
    expect(result.current.buckets.needs.currentSpend).toBe(15000);
    expect(result.current.buckets.needs.previousSpend).toBe(10000);
    expect(result.current.buckets.needs.topCategories).toEqual(['Rent', 'Groceries']);
    expect(result.current.emergencyFundGoal).toBeNull();
  });

  it('surfaces the Emergency Fund goal when one exists', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'g1', targetAmount: 100000, currentAmount: 25000 }] });

    const { result } = renderHook(() => useMoneyPlanIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.emergencyFundGoal).toEqual({ targetAmount: 100000, currentAmount: 25000 });
  });
});
