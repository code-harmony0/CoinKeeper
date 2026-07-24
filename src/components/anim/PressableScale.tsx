import React from 'react';
import {
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

export type PressableScaleHaptic = 'impactLight' | 'none';

export interface PressableScaleProps {
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  haptic?: PressableScaleHaptic;
  disabled?: boolean;
  hitSlop?: number | Insets;
  children?: React.ReactNode;
}

const SCALE_SPRING = { damping: 15, stiffness: 300 };

// Single animated node: carries layout style (so it participates correctly
// in a parent flex row/column, e.g. `flex: 1` segmented-control items) AND
// the press transform, on the same box — avoids the double-wrapper split
// where layout style on one node and children arrangement on another
// disagree about flexDirection/alignItems.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale: React.FC<PressableScaleProps> = ({
  onPress,
  style,
  haptic = 'impactLight',
  disabled = false,
  hitSlop,
  children,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, SCALE_SPRING);
    opacity.value = withSpring(0.9, SCALE_SPRING);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SCALE_SPRING);
    opacity.value = withSpring(1, SCALE_SPRING);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (haptic !== 'none') {
      ReactNativeHapticFeedback.trigger(haptic);
    }
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
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
