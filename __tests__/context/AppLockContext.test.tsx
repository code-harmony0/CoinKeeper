// Verified before writing this: @testing-library/react-native is NOT
// installed in this project (checked package.json directly). The one
// existing render test (__tests__/App.test.tsx) uses raw `react-test-renderer`
// — match that convention, don't add a new testing library for one test file.
//
// Deviation from the original plan draft: `jest.mock('react-native', () =>
// ({ ...jest.requireActual('react-native'), ... }))` was tried first, but
// `requireActual` on the full `react-native` module bypasses this project's
// jest-native preset mocks and reaches real native modules (FlatList pulls
// in DevMenu, which throws a TurboModuleRegistry invariant under Jest). Using
// `jest.spyOn` against the preset's own already-mocked `AppState` achieves
// the same thing — capturing the registered 'change' handler — without
// touching the rest of the module.
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AppState, AppStateStatus } from 'react-native';
import { AppLockProvider, useAppLock } from '../../src/context/AppLockContext';

let appStateHandler: ((state: AppStateStatus) => void) | undefined;

jest.spyOn(AppState, 'addEventListener').mockImplementation(
  (_event, handler) => {
    appStateHandler = handler;
    return { remove: jest.fn() } as any;
  }
);

describe('AppLockContext', () => {
  beforeEach(() => {
    appStateHandler = undefined;
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('starts locked on cold start', () => {
    let captured: { isLocked: boolean } | undefined;
    const Capture = () => { captured = useAppLock(); return null; };
    act(() => {
      ReactTestRenderer.create(<AppLockProvider><Capture /></AppLockProvider>);
    });
    expect(captured?.isLocked).toBe(true);
  });

  it('stays unlocked if backgrounded for less than 2 minutes', () => {
    let captured: any;
    const Capture = () => { captured = useAppLock(); return null; };
    act(() => {
      ReactTestRenderer.create(<AppLockProvider><Capture /></AppLockProvider>);
    });
    act(() => captured.unlock());
    expect(captured.isLocked).toBe(false);

    act(() => appStateHandler?.('background'));
    jest.advanceTimersByTime(60 * 1000); // 1 minute
    act(() => appStateHandler?.('active'));

    expect(captured.isLocked).toBe(false);
  });

  it('re-locks after 2+ minutes backgrounded', () => {
    let captured: any;
    const Capture = () => { captured = useAppLock(); return null; };
    act(() => {
      ReactTestRenderer.create(<AppLockProvider><Capture /></AppLockProvider>);
    });
    act(() => captured.unlock());

    act(() => appStateHandler?.('background'));
    jest.advanceTimersByTime(3 * 60 * 1000); // 3 minutes
    act(() => appStateHandler?.('active'));

    expect(captured.isLocked).toBe(true);
  });
});
