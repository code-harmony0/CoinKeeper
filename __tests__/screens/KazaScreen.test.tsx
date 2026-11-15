import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { KazaScreen } from '../../src/screens/user/KazaScreen';

jest.mock('../../src/context/TabBarScrollContext', () => ({
  useTabBarScroll: () => ({ scrollY: { value: 0 } }),
}));
jest.mock('../../src/store/database', () => ({
  getPreference: jest.fn(async () => null),
  setPreference: jest.fn(async () => {}),
}));
jest.mock('../../src/services/notificationService', () => ({
  areNotificationsEnabled: jest.fn(async () => true),
  syncKazaReminders: jest.fn(async () => {}),
}));
jest.mock('../../src/components/anim', () => {
  const actual = jest.requireActual('../../src/components/anim');
  const { Text } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return {
    ...actual,
    CountUp: ({ value }: any) => ReactLib.createElement(Text, null, String(value)),
    BadgeCelebration: () => null,
  };
});

const mockLogMakeUp = jest.fn(async () => {});
let mockState: any;
jest.mock('../../src/store/kazaStore', () => ({
  useKazaStore: () => mockState,
}));

const baseState = () => ({
  prayers: [
    { name: 'Fajr', arabic: 'الفجر', completed: 2, pending: 8 },
    { name: 'Dhuhr', arabic: 'الظهر', completed: 0, pending: 10 },
  ],
  loading: false,
  madeUpToday: 0,
  totalMadeUp: 2,
  dailyCounts: {},
  restDays: [],
  streak: { current: 3, longest: 5, loggedToday: false, atRisk: true, graceUsedYesterday: false, broken: false },
  recent: [],
  lastLogged: 'Fajr',
  loadKaza: jest.fn(),
  missedPrayer: jest.fn(),
  makeUpPrayer: jest.fn(),
  logMakeUp: mockLogMakeUp,
  undoMakeUp: jest.fn(),
  setEstimate: jest.fn(),
  setPending: jest.fn(),
  takeRestDays: jest.fn(),
  endRest: jest.fn(),
});

describe('KazaScreen', () => {
  beforeEach(() => {
    mockLogMakeUp.mockClear();
    mockState = baseState();
  });

  it('shows what is left and nudges an at-risk streak', () => {
    const { getByText } = render(<KazaScreen />);
    expect(getByText('18')).toBeTruthy(); // 8 + 10 pending
    expect(getByText('Prayers left to make up')).toBeTruthy();
    expect(getByText('1 of 10 days')).toBeTruthy(); // 2 made up = 1 day of 10 (a day = the 2 mocked prayers)
    expect(getByText('Make up one prayer today to keep your streak.')).toBeTruthy();
    expect(getByText('3 day streak')).toBeTruthy();
  });

  it('logs several prayers at once from the log sheet', async () => {
    const { getByTestId, getByLabelText, getByText } = render(<KazaScreen />);
    fireEvent.press(getByTestId('kaza-log'));

    fireEvent.press(getByLabelText('One more Fajr'));
    fireEvent.press(getByLabelText('One more Fajr'));
    fireEvent.press(getByLabelText('One more Dhuhr'));
    fireEvent.press(getByText('Log 3 prayers'));

    await waitFor(() => expect(mockLogMakeUp).toHaveBeenCalledTimes(1));
    expect(mockLogMakeUp).toHaveBeenCalledWith(
      expect.arrayContaining([
        { name: 'Fajr', count: 2 },
        { name: 'Dhuhr', count: 1 },
      ]),
      0,
    );
  });

  it('can backdate the log to yesterday', async () => {
    const { getByTestId, getByLabelText, getByText } = render(<KazaScreen />);
    fireEvent.press(getByTestId('kaza-log'));
    fireEvent.press(getByText('Yesterday'));
    fireEvent.press(getByLabelText('One more Dhuhr'));
    fireEvent.press(getByText('Log 1 prayer'));

    await waitFor(() => expect(mockLogMakeUp).toHaveBeenCalledWith([{ name: 'Dhuhr', count: 1 }], 1));
  });

  it('cannot log more than is pending', () => {
    mockState.prayers = [{ name: 'Fajr', arabic: 'الفجر', completed: 0, pending: 1 }];
    const { getByTestId, getByLabelText, getByText } = render(<KazaScreen />);
    fireEvent.press(getByTestId('kaza-log'));
    fireEvent.press(getByLabelText('One more Fajr'));
    fireEvent.press(getByLabelText('One more Fajr'));
    expect(getByText('Log 1 prayer')).toBeTruthy();
  });

  it('shows the welcome-back message after a broken streak', () => {
    mockState.streak = { current: 0, longest: 12, loggedToday: false, atRisk: false, graceUsedYesterday: false, broken: true };
    const { getByText } = render(<KazaScreen />);
    expect(getByText(/Your best is 12 days/)).toBeTruthy();
  });

  it('asks for an estimate when nothing is owed yet', () => {
    mockState.prayers = [{ name: 'Fajr', arabic: 'الفجر', completed: 0, pending: 0 }];
    mockState.totalMadeUp = 0;
    const { getAllByText, queryByTestId } = render(<KazaScreen />);
    expect(getAllByText('Calculate my Kaza').length).toBeGreaterThan(0);
    expect(queryByTestId('kaza-log')).toBeNull();
  });
});
