import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Android keyboard height. A bottom sheet inside a <Modal> is a separate
 * window that the keyboard covers (adjustResize does not reach it), which
 * hides the Save button. Sheets add this to their bottom padding. iOS lets
 * KeyboardAvoidingView handle it, so it reports 0 there.
 */
export const useKeyboardHeight = (): number => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', e => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
};
