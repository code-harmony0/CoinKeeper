/**
 * useSecureScreen — enables FLAG_SECURE (blocks screenshots/screen
 * recording) while the calling screen is focused, and disables it again
 * when the screen loses focus. FLAG_SECURE is a Window-level flag in a
 * single-Activity app, so it must be toggled on focus/blur rather than
 * left on globally.
 */
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { enableSecureScreen, disableSecureScreen } from '../native/SecureScreen';
import { SECURE_SCREEN_ENABLED } from '../config/buildFlags';

export const useSecureScreen = () => {
  useFocusEffect(
    useCallback(() => {
      // Off in development so screenshots and screen recording work — with
      // FLAG_SECURE on, every `adb screencap` of a money screen comes back
      // solid black, which makes visual review impossible. Hardcoded on in
      // release by `__DEV__`; see buildFlags.ts.
      if (!SECURE_SCREEN_ENABLED) return undefined;
      enableSecureScreen();
      return () => disableSecureScreen();
    }, [])
  );
};
