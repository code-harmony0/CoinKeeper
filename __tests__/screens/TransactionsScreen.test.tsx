import React from 'react';
import { render, fireEvent, act, within } from '@testing-library/react-native';
import { Utensils } from 'lucide-react-native';
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

// CountUp animates toward its target via reanimated's withTiming, driven by
// performance.now() rather than jest's fake Date/timers — advancing fake
// timers doesn't reliably settle it in tests. Swapped for a synchronous
// stand-in so the period-scoping test below can assert on the final
// formatted value without depending on real animation timing.
jest.mock('../../src/components/anim', () => {
  const actual = jest.requireActual('../../src/components/anim');
  const ReactLib = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { Money } = jest.requireActual('../../src/utils/money');
  const CountUpStub = ({ value, prefix = '', isPaise, testID, style }: any) => {
    const formatted = isPaise
      ? Money.format(Math.round(value), { hideSymbol: true, zeroDecimals: true })
      : Math.round(value).toLocaleString('en-IN');
    return ReactLib.createElement(Text, { testID, style }, `${prefix}${formatted}`);
  };
  return { ...actual, CountUp: CountUpStub };
});

const mockDelete = jest.fn(async () => {});
jest.mock('../../src/context/TransactionsContext', () => ({
  useTransactionsContext: () => ({
    transactions: [
      // All dates land in August 2026 (the fixed "now" below is 2026-08-08) so
      // the default "This Month" period scoping doesn't hide rows the
      // pre-existing tests below depend on seeing.
      { id: '1', amountPaise: 10000, type: 'expense', category: 'Food', categoryId: 'food', categoryIcon: 'food', description: 'Lunch', date: '2026-08-07T09:00:00.000Z' },
      // Dated outside the trailing-7-day window from the fixed "now" (still
      // within the current month), so switching to "This Week" excludes it —
      // exercised by the period-scoping test below.
      { id: '2', amountPaise: 500000, type: 'income', category: 'Salary', categoryId: 'salary', categoryIcon: 'salary', description: 'Paycheck', date: '2026-08-01T09:00:00.000Z' },
      { id: '3', amountPaise: 20000, type: 'expense', category: 'Streaming', categoryId: 'streaming', categoryIcon: 'Tv', categoryColor: '#7C6CF6', description: 'Netflix', date: '2026-08-05T09:00:00.000Z' },
      // Real seeded default category: id 'food', name 'Food', icon 'food' (MaterialCommunityIcons-style,
      // not a valid Lucide export) — exercises the DEFAULT_ID_TO_ICON fallback branch in resolveCategoryIcon.
      { id: '4', amountPaise: 15000, type: 'expense', category: 'Food', categoryId: 'food', categoryIcon: 'food', description: 'Groceries', date: '2026-08-03T09:00:00.000Z' },
    ],
    deleteTransaction: mockDelete,
  }),
}));

const navigation = { goBack: jest.fn() } as any;

describe('TransactionsScreen', () => {
  // beforeEach (not beforeAll) so this is re-armed before every test — a
  // few tests below call jest.useRealTimers() locally once they're done
  // with their own fake-timer assertions, which would otherwise leave
  // later tests running against the real wall clock instead of this fixed
  // "now", making period-scoping assertions order-dependent.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-08T12:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

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
    // Render on real timers: the list's entering animations need them to flush,
    // and with fake timers installed first no rows mount at all. Fake timers go
    // in afterwards, which is the only part this test needs to control.
    const { getByTestId } = render(<TransactionsScreen navigation={navigation} route={{} as any} />);
    jest.useFakeTimers();

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
    // Real timers throughout: installing fake timers makes every subsequent
    // re-render mount `entering` animations that never complete, so the list
    // renders no rows at all and the second swipe target cannot be found.
    // The second swipe lands milliseconds later, which is inside the real
    // 5-second window — exactly the situation this test is named for.
    // The "commits after its own window" half is covered by the test above.
    const { getByTestId } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );

    await act(async () => {
      fireEvent(getByTestId('swipe-delete-1'), 'press');
    });

    await act(async () => {
      fireEvent(getByTestId('swipe-delete-2'), 'press');
    });

    // '1' is committed the moment a second swipe supersedes it...
    expect(mockDelete).toHaveBeenCalledWith('1');
    // ...while '2' is still inside its own undo window.
    expect(mockDelete).not.toHaveBeenCalledWith('2');
    expect(mockDelete).toHaveBeenCalledTimes(1);
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

  it('renders a seeded default category (id "food", icon "food") with the Utensils icon via the id-keyed fallback, not the generic MoreHorizontal', () => {
    const { getByTestId } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );
    const iconWrap = getByTestId('row-icon-4');
    expect(within(iconWrap).UNSAFE_getAllByType(Utensils).length).toBeGreaterThan(0);
  });

  it('scopes the Income/Expense summary cards to the selected period', () => {
    const { getByTestId } = render(
      <TransactionsScreen navigation={navigation} route={{} as any} />,
    );

    // Default period is "This Month" — the Paycheck (₹5,000, dated 2026-08-01)
    // is within August, so it counts toward Income.
    expect(getByTestId('summary-income').props.children).toContain('5,000');

    fireEvent.press(getByTestId('period-week'));
    // Paycheck falls outside the trailing-7-day window from the fixed "now"
    // of 2026-08-08, so it must drop out of the Income total.
    expect(getByTestId('summary-income').props.children).not.toContain('5,000');
  });
});
