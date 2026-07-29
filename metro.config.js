const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * The lite flavor must not merely hide the chit-fund module — it must not
 * contain it. CK_CHITFUND is unset for lite builds, so the whole
 * src/modules/chitfund tree is excluded from resolution and every
 * CHITFUND_ENABLED-guarded require() is eliminated by dead-code elimination.
 *
 * Verify with:
 *   npm run build:lite
 *   unzip -p android/app/build/outputs/apk/lite/release/app-lite-release.apk \
 *     assets/index.android.bundle | strings | grep -ic chitfund   # expect 0
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const includeChitFund = process.env.CK_CHITFUND === '1';

const config = {
  resolver: {
    blockList: includeChitFund
      ? undefined
      : exclusionList([/src[\\/]modules[\\/]chitfund[\\/].*/]),
    alias: {
      '@': './src',
      '@/components': './src/components',
      '@/hooks': './src/hooks',
      '@/navigation': './src/navigation',
      '@/screens': './src/screens',
      '@/types': './src/types',
      '@/constants': './src/constants',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
