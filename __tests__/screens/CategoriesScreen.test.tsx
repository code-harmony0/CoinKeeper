import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CategoriesScreen } from '../../src/screens/user/CategoriesScreen';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

// CategoryIntelligenceShell's delete confirmation runs the actual DELETE from
// the destructive button's onPress — auto-press it here so the confirm flow
// can be exercised without a real native Alert UI.
jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
  const destructive = buttons?.find(b => b.style === 'destructive');
  destructive?.onPress?.();
});

const navigation = { goBack: jest.fn() } as any;

const rowFor = (overrides: Partial<Record<string, any>>) => ({
  id: 'food',
  name: 'Food',
  icon: 'Utensils',
  color: null,
  usageCount: 0,
  currentMonthSpendPaise: 0,
  ...overrides,
});

describe('CategoriesScreen', () => {
  beforeEach(() => mockExecute.mockReset());

  it('lists categories with their transaction counts', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [rowFor({ id: 'food', name: 'Food', usageCount: 12 }), rowFor({ id: 'transport', name: 'Transport', icon: 'Car' })] })
      .mockResolvedValue({ rows: [] });

    const { findByText } = render(<CategoriesScreen navigation={navigation} route={{} as any} />);

    expect(await findByText('Food')).toBeTruthy();
    expect(await findByText('Transport')).toBeTruthy();
  });

  it('blocks deleting a category still in use, allows deleting an unused one', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [rowFor({ id: 'food', name: 'Food', usageCount: 12 }), rowFor({ id: 'transport', name: 'Transport', icon: 'Car' })] })
      .mockResolvedValue({ rows: [] });

    const { findByTestId } = render(<CategoriesScreen navigation={navigation} route={{} as any} />);

    const deleteUsed = await findByTestId('delete-category-food');
    await act(async () => fireEvent.press(deleteUsed));
    // usageCount 12 -> blocked, no DELETE call issued
    expect(mockExecute.mock.calls.some(c => String(c[0]).includes('DELETE FROM categories'))).toBe(false);

    const deleteUnused = await findByTestId('delete-category-transport');
    await act(async () => fireEvent.press(deleteUnused));
    expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM categories'), ['transport']);
  });
});
