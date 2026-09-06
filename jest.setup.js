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

// react-native-fs is a native module whose FS.common.js constructs a
// NativeEventEmitter at import time, which throws in Jest's null native
// module environment. Reachable from App.tsx via ProfileScreen.
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  exists: jest.fn(async () => false),
  mkdir: jest.fn(async () => {}),
  writeFile: jest.fn(async () => {}),
  readFile: jest.fn(async () => ''),
  unlink: jest.fn(async () => {}),
  copyFile: jest.fn(async () => {}),
}));

// @react-native-ml-kit/text-recognition is a native module (no JS fallback).
// Used by MLKitProvider.ts for real on-device receipt OCR, reachable from
// App.tsx via AddTransactionSheet -> ReceiptScanService -> MLKitProvider.
jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: {
    recognize: jest.fn(async () => ({ text: '', blocks: [] })),
  },
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

// @shopify/react-native-skia is a JSI native module (RNSkiaModule) with no JS
// fallback — even once its ESM source is allowed through babel (jest.config.js
// transformIgnorePatterns), TurboModuleRegistry.getEnforcing throws in Jest's
// Node environment since there's no native binary to find it in. Canvas
// renders as a plain View so components asserting on its children (text,
// labels) still work; the drawing primitives (Path/Circle/Rect/etc.) are
// only ever nested inside a Canvas in this codebase and are never queried by
// a test directly, so they render nothing.
jest.mock('@shopify/react-native-skia', () => {
  const RN = require('react-native');
  const stub = (name) => {
    const Stub = (props) => null;
    Stub.displayName = name;
    return Stub;
  };
  return {
    Canvas: RN.View,
    Path: stub('Path'),
    Circle: stub('Circle'),
    Rect: stub('Rect'),
    RoundedRect: stub('RoundedRect'),
    Group: ({ children }) => children ?? null,
    LinearGradient: stub('LinearGradient'),
    SweepGradient: stub('SweepGradient'),
    BlurMask: stub('BlurMask'),
    Paint: ({ children }) => children ?? null,
    Skia: {
      Path: {
        Make: () => ({
          addArc: jest.fn(),
          addCircle: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          close: jest.fn(),
        }),
      },
    },
    rect: (x, y, width, height) => ({ x, y, width, height }),
    rrect: (r, rx, ry) => ({ rect: r, rx, ry }),
    vec: (x, y) => ({ x, y }),
    useFont: () => null,
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

// Native bottom tabs render a real UIKit/Android tab bar, so there is nothing
// for Jest to run — and the package ships ESM sources (plus a nested ESM
// `color`) that the transform allow-list cannot reach without listing every
// transitive dependency. A stub is both simpler and closer to the truth:
// the navigator's job here is only to render its screens.
jest.mock('@bottom-tabs/react-navigation', () => {
  const React = require('react');
  return {
    createNativeBottomTabNavigator: () => ({
      Navigator: ({ children }: { children?: React.ReactNode }) =>
        React.createElement('BottomTabNavigator', null, children),
      Screen: ({ children }: { children?: React.ReactNode }) =>
        React.createElement('BottomTabScreen', null, children),
    }),
  };
});

jest.mock('@callstack/liquid-glass', () => {
  const React = require('react');
  const passthrough = (name: string) => ({ children }: { children?: React.ReactNode }) =>
    React.createElement(name, null, children);
  return {
    LiquidGlassView: passthrough('LiquidGlassView'),
    LiquidGlassContainerView: passthrough('LiquidGlassContainerView'),
    isLiquidGlassSupported: false,
  };
});

// The document picker is a native file-chooser dialog; there is nothing to
// render or drive in Jest. Suites that exercise restore mock it per-file with
// their own fixtures — this stub only keeps unrelated suites parseable.
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(async () => []),
  keepLocalCopy: jest.fn(async () => []),
  types: { allFiles: '*/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: () => false,
}));

// react-native-share resolves a TurboModule at import time, which throws
// outside a native runtime. Suites that assert on sharing mock it themselves.
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({ success: true })) },
  open: jest.fn(async () => ({ success: true })),
}));
