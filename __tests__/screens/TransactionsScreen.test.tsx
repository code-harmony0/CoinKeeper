import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TransactionsScreen } from '../../src/screens/user/TransactionsScreen';

// useSecureScreen calls useFocusEffect(useNavigation()) internally, which
// needs a real NavigationContainer ancestor — irrelevant to what this suite
// exercises (search/swipe/undo/multi-select), so it's mocked out like the
// data hook below.
jest.mock('../../src/hooks/useSecureScreen', () => ({
  useSecureScreen: () => {},
}));

// Same reasoning as useSecureScreen above — needs a real provider ancestor
// this standalone screen render doesn't have, and this suite doesn't
// exercise tab-bar auto-hide behavior.
jest.mock('../../src/context/TabBarScrollContext', () => ({
  useTabBarScroll: () => ({ scrollY: { value: 0 } }),
}));

const mockDelete = jest.fn(async () => {});
jest.mock('../../src/context/TransactionsContext', () => ({
  useTransactionsContext: () => ({
    transactions: [
      { id: '1', amount: 100, type: 'expense', category: 'Food', categoryIcon: 'food', description: 'Lunch', date: '2026-07-31T09:00:00.000Z' },
      { id: '2', amount: 5000, type: 'income', category: 'Salary', categoryIcon: 'salary', description: 'Paycheck', date: '2026-07-30T09:00:00.000Z' },
      { id: '3', amountPaise: 20000, type: 'expense', category: 'Streaming', categoryIcon: 'Tv', categoryColor: '#7C6CF6', description: 'Netflix', date: '2026-07-29T09:00:00.000Z' },
    ],
    deleteTransaction: mockDelete,
  }),
}));

const navigation = { goBack: jest.fn() } as any;

describe('TransactionsScreen', () => {
  beforeEach(() => mockDelete.mockClear());

  it('filters the list by search query across description and category', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );

    fireEvent.changeText(getByPlaceholderText('Search transactions'), 'salary');

    expect(getByText('Paycheck')).toBeTruthy();
    expect(queryByText('Lunch')).toBeNull();
  });

  it('shows an undo banner after a swipe-delete and restores the row on undo', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );

    await act(async () => {
      fireEvent(getByTestId('swipe-delete-1'), 'press');
    });

    expect(queryByText('Lunch')).toBeNull();
    expect(getByText(/undo/i)).toBeTruthy();

    fireEvent.press(getByText(/undo/i));
    expect(getByText('Lunch')).toBeTruthy();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('commits the delete if undo is not pressed within the window', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<TransactionsScreen navigation={navigation} route={{} as any} />);

    await act(async () => {
      fireEvent(getByTestId('swipe-delete-1'), 'press');
    });

    act(() => jest.advanceTimersByTime(5000));

    expect(mockDelete).toHaveBeenCalledWith('1');
    jest.useRealTimers();
  });

  it('enters multi-select on long-press and deletes the selection', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );

    fireEvent(getByTestId('row-1'), 'longPress');
    fireEvent.press(getByTestId('row-2'));
    fireEvent.press(getByText(/delete/i));

    await act(async () => {});

    expect(mockDelete).toHaveBeenCalledWith('1');
    expect(mockDelete).toHaveBeenCalledWith('2');
    expect(queryByText('Lunch')).toBeNull();
    expect(queryByText('Paycheck')).toBeNull();
  });

  it('commits the first delete immediately when a second swipe arrives inside the window', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );

    // Swipe tx '1'
    await act(async () => {
      fireEvent(getByTestId('swipe-delete-1'), 'press');
    });

    // Swipe tx '2' before the 5-second window for '1' expires
    await act(async () => {
      fireEvent(getByTestId('swipe-delete-2'), 'press');
    });

    // '1' must be committed immediately when the second swipe arrives
    expect(mockDelete).toHaveBeenCalledWith('1');

    // '2' commits after its own 5-second window
    act(() => jest.advanceTimersByTime(5000));
    expect(mockDelete).toHaveBeenCalledWith('2');
    expect(mockDelete).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('renders a custom category (not one of the 8 defaults) with its own icon and color, not a generic fallback', () => {
    const { getByTestId } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );
    const iconWrap = getByTestId('row-icon-3');
    expect(iconWrap.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#7C6CF6' })]),
    );
  });
});
