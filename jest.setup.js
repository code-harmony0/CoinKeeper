// @op-engineering/op-sqlite is a JSI native module — no JS fallback exists.
// Even after Babel transpiles its ESM source (jest.config.js allows it through
// transformIgnorePatterns), NativeModules.OPSQLite will be null in Jest.
// This mock provides a no-op handle to any test that transitively reaches
// src/db/index.ts or src/store/database.ts. SQL-level logic is exercised
// separately in __tests__/db/ with purpose-built fixtures.
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(async () => ({ rows: [] })),
    close: jest.fn(),
    transaction: jest.fn(async (fn) => fn()),
  })),
}));

// react-native-argon2 is a native module (no JS fallback). Used by
// pinService.ts — now reachable from App.tsx via the auth screen imports.
jest.mock('react-native-argon2', () =>
  jest.fn(async (password, salt) => ({
    rawHash: `raw-${password}-${salt}`,
    encodedHash: `enc-${password}-${salt}`,
  })),
);

// AsyncStorage ships its own official jest mock, but nothing wired it in —
// any suite that pulls in useTheme.tsx (directly or via specTheme) hit the
// real native module and failed with "NativeModule: AsyncStorage is null."
// This was the root cause of the pre-existing App.test.tsx failure too.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// react-native-safe-area-context ships no jest mock of its own and needs a
// <SafeAreaProvider> ancestor to resolve insets — component tests render
// screens/sheets in isolation with no provider tree, so every insets hook
// throws "No safe area value available." Static insets are enough for
// component tests; nothing in this repo asserts on inset values.
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

// useTheme() requires a <ThemeProvider> ancestor (it loads a persisted
// preference from AsyncStorage before rendering its children at all).
// Component tests render screens/sheets standalone with no provider tree —
// mirror the same "static light theme, no provider needed" shortcut used
// for safe-area-context above. Real ThemeProvider behavior (persistence,
// system-scheme detection, toggling) is untested by this mock and isn't
// exercised by any Phase 3 component test.
jest.mock('./src/hooks/useTheme', () => {
  const { lightColors } = jest.requireActual('./src/hooks/useTheme');
  return {
    lightColors,
    useTheme: () => ({
      colors: lightColors,
      isDark: false,
      themeMode: 'light',
      setThemeMode: jest.fn(),
      toggleTheme: jest.fn(),
    }),
    ThemeProvider: ({ children }) => children,
  };
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    createChannel: jest.fn(async () => 'channel-id'),
    createTriggerNotification: jest.fn(async () => 'notification-id'),
    cancelNotification: jest.fn(async () => undefined),
  },
  AndroidImportance: { HIGH: 4 },
  TriggerType: { TIMESTAMP: 0 },
}));
