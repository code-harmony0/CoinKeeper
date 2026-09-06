import React from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  Insets,
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { EXPRESSIVE, SPRING } from '../../theme/motion';

export type PressableScaleHaptic = 'impactLight' | 'none';

export interface PressableScaleProps {
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  haptic?: PressableScaleHaptic;
  disabled?: boolean;
  hitSlop?: number | Insets;
  children?: React.ReactNode;
  testID?: string;
  accessible?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}

// Press and release are not the same curve. Going down is fast and critically
// damped — the surface should be under the finger immediately. Coming back up
// carries a little overshoot, which is what makes a slab of pixels read as a
// physical thing rather than a value being reassigned.
const PRESS_SPRING = { ...SPRING.press, reduceMotion: EXPRESSIVE };
const RELEASE_SPRING = { ...SPRING.release, reduceMotion: EXPRESSIVE };

// Single animated node: carries layout style (so it participates correctly
// in a parent flex row/column, e.g. `flex: 1` segmented-control items) AND
// the press transform, on the same box — avoids the double-wrapper split
// where layout style on one node and children arrangement on another
// disagree about flexDirection/alignItems.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale: React.FC<PressableScaleProps> = ({
  onPress,
  onLongPress,
  style,
  haptic = 'impactLight',
  disabled = false,
  hitSlop,
  children,
  testID,
  accessible,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, PRESS_SPRING);
    opacity.value = withSpring(0.95, PRESS_SPRING);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, RELEASE_SPRING);
    opacity.value = withSpring(1, RELEASE_SPRING);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (haptic !== 'none') {
      ReactNativeHapticFeedback.trigger(haptic);
    }
    onPress?.(event);
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    if (haptic !== 'none') {
      ReactNativeHapticFeedback.trigger(haptic);
    }
    onLongPress?.(event);
  };

  return (
    <AnimatedPressable
      testID={testID}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
