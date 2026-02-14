import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
  useDerivedValue,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { BACKGROUND_COLORS, TAB_NAMES } from '../theme/colors';

const SPRING_CONFIG = { damping: 15, stiffness: 120, mass: 1 };
const FAST_SPRING = { damping: 18, stiffness: 180 };

export const useTabAnimations = (initialIndex: number = 0) => {
  const activeIndex = useSharedValue(initialIndex);
  const previousIndex = useSharedValue(initialIndex);
  const animationProgress = useSharedValue(0);
  const velocity = useSharedValue(0);

  const setActiveTab = useCallback((index: number) => {
    previousIndex.value = activeIndex.value;
    velocity.value = Math.abs(index - activeIndex.value) * 200;
    activeIndex.value = withSpring(index, SPRING_CONFIG);
    animationProgress.value = 0;
    animationProgress.value = withTiming(1, { duration: 300 });
    
    // Decay velocity
    velocity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, []);

  // Indicator position
  const indicatorTranslateX = useDerivedValue(() => {
    return activeIndex.value;
  });

  // Indicator stretch based on velocity
  const indicatorWidth = useDerivedValue(() => {
    return interpolate(
      velocity.value,
      [0, 400],
      [40, 70],
      Extrapolation.CLAMP
    );
  });

  // Background color
  const backgroundColor = useDerivedValue(() => {
    return interpolateColor(
      activeIndex.value,
      [0, 1, 2, 3, 4],
      BACKGROUND_COLORS
    );
  });

  return {
    activeIndex,
    previousIndex,
    animationProgress,
    velocity,
    indicatorTranslateX,
    indicatorWidth,
    backgroundColor,
    setActiveTab,
  };
};

export const useIconAnimation = (isActive: boolean, index: number) => {
  const scale = useSharedValue(isActive ? 1 : 0.9);
  const opacity = useSharedValue(isActive ? 1 : 0.4);

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withSpring(0.85, { damping: 10 }),
        withSpring(1.15, { damping: 12 }),
        withSpring(1.0, FAST_SPRING)
      );
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(0.9, FAST_SPRING);
      opacity.value = withTiming(0.4, { duration: 200 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { animatedStyle };
};

export const useFabAnimation = () => {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Idle pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 10 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
};
