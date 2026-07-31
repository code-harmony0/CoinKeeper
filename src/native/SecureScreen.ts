/**
 * SecureScreen — thin JS wrapper around the native SecureScreenModule.
 *
 * Android only: FLAG_SECURE has no iOS equivalent, so on any platform
 * where the native module isn't linked (iOS, or a Jest environment)
 * these functions are no-ops rather than throwing.
 */
import { NativeModules } from 'react-native';

export const enableSecureScreen = (): void => {
  NativeModules.SecureScreenModule?.enable?.();
};

export const disableSecureScreen = (): void => {
  NativeModules.SecureScreenModule?.disable?.();
};
