module.exports = {
  preset: 'react-native',
  setupFiles: [
    './node_modules/react-native-gesture-handler/jestSetup.js',
    './jest.setup.js',
  ],
  // Several RN libraries ship untranspiled .ts sources (gesture-handler's
  // NativeRNGestureHandlerModule.ts, reanimated, etc). Jest ignores node_modules
  // for transforms by default, so they must be allow-listed — otherwise any
  // suite that reaches App.tsx fails to parse.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?@?react-native' +
      '|@react-native-community' +
      '|@react-navigation' +
      '|@op-engineering/op-sqlite' +
      '|react-native-gesture-handler' +
      '|react-native-reanimated' +
      '|react-native-safe-area-context' +
      '|react-native-screens' +
      '|react-native-linear-gradient' +
      '|react-native-chart-kit' +
      '|@shopify/flash-list' +
      '|uuid' +
      ')/)',
  ],
};
