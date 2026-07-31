/**
 * ToggleSwitch Component
 * Animated toggle switch with haptic feedback
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { theme } from '../../../../theme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

const SPRING_CONFIG = { damping: 15, stiffness: 200, mass: 1 };

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  activeColor = '#2E7D32',
  inactiveColor = '#E0E0E0',
}) => {
  const translateX = useSharedValue(value ? 20 : 0);
  const backgroundColor = useSharedValue(value ? activeColor : inactiveColor);

  React.useEffect(() => {
    translateX.value = withSpring(value ? 20 : 0, SPRING_CONFIG);
    backgroundColor.value = withSpring(value ? activeColor : inactiveColor, SPRING_CONFIG);
  }, [value, activeColor, inactiveColor]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = () => {
    if (disabled) return;

    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    onValueChange(!value);
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View style={[styles.track, trackStyle, disabled && styles.disabled]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    ...theme.shadows.neumorphic,
  },
  disabled: {
    opacity: 0.5,
  },
});
