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

export const useSecureScreen = () => {
  useFocusEffect(
    useCallback(() => {
      enableSecureScreen();
      return () => disableSecureScreen();
    }, [])
  );
};
