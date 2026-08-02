import { renderHook, waitFor } from '@testing-library/react-native';
import { useCategoryIntelligence } from '../../src/hooks/useCategoryIntelligence';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

describe('useCategoryIntelligence', () => {
  beforeEach(() => mockExecute.mockReset());

  it('classifies a zero-usage category as unused', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ id: 'travel', name: 'Travel', icon: 'Plane', color: null, usageCount: 0, currentMonthSpendPaise: 0 }] })
      .mockResolvedValueOnce({ rows: [] }) // top merchants
      .mockResolvedValueOnce({ rows: [] }) // 6-month trend
      .mockResolvedValueOnce({ rows: [{ avgSpendPaise: 0 }] }); // trailing average

    const { result } = renderHook(() => useCategoryIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories[0].health).toBe('unused');
  });

  it('classifies a category spending well above its trailing average as over_budget', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ id: 'food', name: 'Food', icon: 'Utensils', color: null, usageCount: 10, currentMonthSpendPaise: 500000 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ avgSpendPaise: 200000 }] }); // 3-month avg ₹2000, this month ₹5000

    const { result } = renderHook(() => useCategoryIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories[0].health).toBe('over_budget');
  });

  it('surfaces a merge suggestion for near-identical category names', async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          { id: 'grocery', name: 'Grocery', icon: 'ShoppingBag', color: null, usageCount: 5, currentMonthSpendPaise: 50000 },
          { id: 'groceries', name: 'Groceries', icon: 'ShoppingBag', color: null, usageCount: 3, currentMonthSpendPaise: 30000 },
        ],
      })
      .mockResolvedValue({ rows: [] }); // all per-row queries for both categories

    const { result } = renderHook(() => useCategoryIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mergeSuggestions).toHaveLength(1);
    expect(result.current.mergeSuggestions[0].categoryId).toBe('grocery');
    expect(result.current.mergeSuggestions[0].suggestedWithName).toBe('Groceries');
  });
});
