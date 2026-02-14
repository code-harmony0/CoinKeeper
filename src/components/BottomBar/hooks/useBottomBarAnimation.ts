import { useCallback, useEffect } from 'react';
import { AccessibilityInfo, Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  interpolate,
  interpolateColor,
  useDerivedValue,
  Easing,
  runOnJS,
  SharedValue,
  Extrapolation,
} from 'react-native-reanimated';
import { BACKGROUND_COLORS, TAB_KEYS, BAR_CONSTANTS, TabKey } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const TAB_COUNT = 5;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;

// Premium spring configs
const WAVE_SPRING = { damping: 18, stiffness: 100, mass: 1 };
const ICON_SPRING = { damping: 15, stiffness: 150 };
const FAB_SPRING = { damping: 12, stiffness: 120 };

export interface BottomBarAnimationState {
  activeIndex: SharedValue<number>;
  waveCenterX: SharedValue<number>;
  waveDepth: SharedValue<number>;
  fabX: SharedValue<number>;
  backgroundColor: SharedValue<string>;
}

export const useBottomBarAnimation = (initialIndex: number = 0) => {
  const activeIndex = useSharedValue(initialIndex);
  const previousIndex = useSharedValue(initialIndex);
  const waveCenterX = useSharedValue(calculateWaveCenterX(initialIndex));
  const waveDepth = useSharedValue(BAR_CONSTANTS.WAVE_DEPTH);
  const fabX = useSharedValue(calculateWaveCenterX(initialIndex));
  const isReducedMotion = useSharedValue(false);

  // Check reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReducedMotion.value = enabled;
    });
  }, []);

  // Background color interpolation
  const backgroundColor = useDerivedValue(() => {
    return interpolateColor(
      activeIndex.value,
      [0, 1, 2, 3, 4],
      BACKGROUND_COLORS
    );
  });

  const setActiveTab = useCallback((index: number, callback?: () => void) => {
    previousIndex.value = activeIndex.value;
    const targetX = calculateWaveCenterX(index);

    if (isReducedMotion.value) {
      // Snap without animation
      activeIndex.value = index;
      waveCenterX.value = targetX;
      fabX.value = targetX;
      if (callback) runOnJS(callback)();
      return;
    }

    // Wave stretch effect during movement
    waveDepth.value = withSequence(
      withTiming(BAR_CONSTANTS.WAVE_DEPTH + 8, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withSpring(BAR_CONSTANTS.WAVE_DEPTH, { damping: 14, stiffness: 120 })
    );

    // Animate wave center position
    waveCenterX.value = withSpring(targetX, WAVE_SPRING);

    // FAB follows slightly delayed for organic feel
    fabX.value = withSpring(targetX, { ...WAVE_SPRING, damping: 16 });

    // Animate active index
    activeIndex.value = withSpring(index, WAVE_SPRING, () => {
      if (callback) runOnJS(callback)();
    });
  }, []);

  return {
    activeIndex,
    previousIndex,
    waveCenterX,
    waveDepth,
    fabX,
    backgroundColor,
    setActiveTab,
    isReducedMotion,
    barWidth: BAR_WIDTH,
    tabWidth: TAB_WIDTH,
  };
};

// Calculate wave center X position based on tab index
function calculateWaveCenterX(index: number): number {
  // Wave center follows the active tab, with offset for center FAB
  const tabCenter = index * TAB_WIDTH + TAB_WIDTH / 2;
  return tabCenter;
}

// Generate parametric wave path
export function generateWavePath(
  width: number,
  height: number,
  waveCenterX: number,
  waveRadius: number,
  waveDepth: number,
  cornerRadius: number
): string {
  'worklet';
  
  const leftRadius = cornerRadius;
  const rightRadius = cornerRadius;
  
  // Calculate wave control points
  const waveLeft = waveCenterX - waveRadius;
  const waveRight = waveCenterX + waveRadius;
  const waveTop = -waveDepth; // Negative because dip goes up
  
  // Control point offsets for smooth bezier curve
  const controlOffset = waveRadius * 0.55;
  
  // Build path as concatenated string parts
  const path = [
    // Start bottom left
    `M 0 ${height}`,
    // Left edge up
    `L 0 ${leftRadius}`,
    // Top left corner
    `Q 0 0 ${leftRadius} 0`,
    // Top edge to wave start
    `L ${Math.max(waveLeft - 10, leftRadius)} 0`,
    // Wave curve (concave dip upward for FAB)
    `C ${waveLeft} 0 ${waveCenterX - controlOffset} ${waveTop} ${waveCenterX} ${waveTop}`,
    `C ${waveCenterX + controlOffset} ${waveTop} ${waveRight} 0 ${waveRight + 10} 0`,
    // Top edge to right corner
    `L ${width - rightRadius} 0`,
    // Top right corner
    `Q ${width} 0 ${width} ${rightRadius}`,
    // Right edge down
    `L ${width} ${height}`,
    // Close path
    `Z`,
  ].join(' ');
  
  return path;
}

// Hook for individual icon animation
export const useTabIconAnimation = (isActive: boolean, isReducedMotion: SharedValue<boolean>) => {
  const scale = useSharedValue(isActive ? 1 : 0.85);
  const opacity = useSharedValue(isActive ? 1 : 0.25);

  useEffect(() => {
    if (isReducedMotion.value) {
      scale.value = isActive ? 1 : 0.85;
      opacity.value = isActive ? 1 : 0.25;
      return;
    }

    if (isActive) {
      scale.value = withSequence(
        withSpring(0.85, { damping: 10 }),
        withSpring(1.15, { damping: 12 }),
        withSpring(1.0, ICON_SPRING)
      );
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(0.85, ICON_SPRING);
      opacity.value = withTiming(0.25, { duration: 200 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { animatedStyle };
};

// Hook for FAB pulse animation
export const useFabAnimation = () => {
  const pulseScale = useSharedValue(1);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const onPressIn = useCallback(() => {
    pressScale.value = withSpring(0.9, FAB_SPRING);
  }, []);

  const onPressOut = useCallback(() => {
    pressScale.value = withSpring(1, FAB_SPRING);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * pulseScale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
};
