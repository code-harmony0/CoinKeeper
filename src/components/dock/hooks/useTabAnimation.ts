import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const SPRING_CONFIG = { damping: 18, stiffness: 150 };

export function useTabItemAnimation(isActive: boolean, isCenter: boolean, tabIndex: number) {
  const scale = useSharedValue(isActive ? 1 : 0.9);
  const opacity = useSharedValue(isActive ? 1 : 0.5);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.9, SPRING_CONFIG);
    opacity.value = withTiming(isActive ? 1 : 0.5, { duration: 200 });
  }, [isActive, scale, opacity]);

  const onPressIn = useCallback(() => {
    pressScale.value = withSpring(0.92, SPRING_CONFIG);
  }, [pressScale]);

  const onPressOut = useCallback(() => {
    pressScale.value = withSpring(1, SPRING_CONFIG);
  }, [pressScale]);

  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value * pressScale.value }],
      opacity: opacity.value,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: 0 };
  });

  return { containerStyle, glowStyle, onPressIn, onPressOut };
}

export function useTooltipAnimation(isVisible: boolean) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 150 });
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      opacity.value = withTiming(0, { duration: 100 });
      translateY.value = withTiming(8, { duration: 100 });
    }
  }, [isVisible, opacity, translateY]);

  const style = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return { style };
}

// Simplified - no useDerivedValue
export function useTabAnimation(initialIndex: number = 0) {
  const activeIndex = useSharedValue(initialIndex);

  const setActiveTab = useCallback((index: number) => {
    activeIndex.value = withSpring(index, SPRING_CONFIG);
  }, [activeIndex]);

  return { activeIndex, setActiveTab };
}
