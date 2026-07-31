import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CategoriesScreen } from '../../src/screens/user/CategoriesScreen';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

const navigation = { goBack: jest.fn() } as any;

describe('CategoriesScreen', () => {
  beforeEach(() => mockExecute.mockReset());

  it('lists categories with their transaction counts', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { id: 'food', name: 'Food', icon: 'food', usageCount: 12 },
        { id: 'transport', name: 'Transport', icon: 'car', usageCount: 0 },
      ],
    });

    const { findByText } = render(<CategoriesScreen navigation={navigation} route={{} as any} />);

    expect(await findByText('Food')).toBeTruthy();
    expect(await findByText('Transport')).toBeTruthy();
  });

  it('blocks deleting a category still in use, allows deleting an unused one', async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          { id: 'food', name: 'Food', icon: 'food', usageCount: 12 },
          { id: 'transport', name: 'Transport', icon: 'car', usageCount: 0 },
        ],
      })
      .mockResolvedValueOnce({}); // the DELETE for the unused one

    const { findByTestId } = render(<CategoriesScreen navigation={navigation} route={{} as any} />);

    const deleteUsed = await findByTestId('delete-category-food');
    await act(async () => fireEvent.press(deleteUsed));
    expect(mockExecute).toHaveBeenCalledTimes(1); // only the initial SELECT — DELETE was blocked

    const deleteUnused = await findByTestId('delete-category-transport');
    await act(async () => fireEvent.press(deleteUnused));
    expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM categories'), ['transport']);
  });
});
