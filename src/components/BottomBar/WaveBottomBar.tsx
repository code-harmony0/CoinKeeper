import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  interpolate,
  interpolateColor,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.92;
const BAR_HEIGHT = 72;
const CURVE_RADIUS = 38;
const CURVE_DEPTH = 32;
const FAB_SIZE = 54;
const CORNER_RADIUS = 24;
const HIDE_THRESHOLD = 50;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Colors per tab
export const BACKGROUNDS = ['#C2DFF7', '#D8E2FA', '#CFD9F1', '#C2DFF7'];

export type TabKey = 'home' | 'groups' | 'approvals' | 'settings';
export const TABS: TabKey[] = ['home', 'groups', 'approvals', 'settings'];
const TAB_COUNT = TABS.length;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;

// Spring configs
const CURVE_SPRING = { damping: 16, stiffness: 90, mass: 1 };
const ICON_SPRING = { damping: 14, stiffness: 120 };
const HIDE_SPRING = { damping: 18, stiffness: 100 };

export interface WaveBottomBarProps {
  scrollY?: SharedValue<number>;
  onTabChange?: (tab: TabKey, index: number) => void;
  onFabPress?: () => void;
}

// Generate SVG path with curve at specified X position
function generatePath(curveX: number, stretchFactor: number = 1): string {
  'worklet';
  
  const radius = CURVE_RADIUS * stretchFactor;
  const depth = CURVE_DEPTH;
  const left = curveX - radius;
  const right = curveX + radius;
  const controlOffset = radius * 0.55;
  
  const clampedLeft = Math.max(left, CORNER_RADIUS + 10);
  const clampedRight = Math.min(right, BAR_WIDTH - CORNER_RADIUS - 10);
  const clampedX = (clampedLeft + clampedRight) / 2;
  
  return `
    M 0 ${BAR_HEIGHT}
    L 0 ${CORNER_RADIUS}
    Q 0 0 ${CORNER_RADIUS} 0
    L ${clampedLeft} 0
    C ${clampedLeft + controlOffset * 0.3} 0 ${clampedX - controlOffset} ${-depth} ${clampedX} ${-depth}
    C ${clampedX + controlOffset} ${-depth} ${clampedRight - controlOffset * 0.3} 0 ${clampedRight} 0
    L ${BAR_WIDTH - CORNER_RADIUS} 0
    Q ${BAR_WIDTH} 0 ${BAR_WIDTH} ${CORNER_RADIUS}
    L ${BAR_WIDTH} ${BAR_HEIGHT}
    Z
  `;
}

// Hook to track scroll direction for hiding bar
export function useScrollAwareTabBar() {
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const isScrollingDown = useSharedValue(false);
  const barVisible = useSharedValue(1);

  const onScroll = useCallback((y: number) => {
    'worklet';
    const diff = y - lastScrollY.value;
    
    if (diff > HIDE_THRESHOLD && y > 100) {
      // Scrolling down significantly - hide bar
      if (!isScrollingDown.value) {
        isScrollingDown.value = true;
        barVisible.value = withSpring(0, HIDE_SPRING);
      }
    } else if (diff < -HIDE_THRESHOLD || y < 50) {
      // Scrolling up or near top - show bar
      if (isScrollingDown.value || y < 50) {
        isScrollingDown.value = false;
        barVisible.value = withSpring(1, HIDE_SPRING);
      }
    }
    
    lastScrollY.value = y;
    scrollY.value = y;
  }, []);

  return { scrollY, barVisible, onScroll };
}

export const WaveBottomBar: React.FC<WaveBottomBarProps> = ({
  scrollY,
  onTabChange,
  onFabPress,
}) => {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Animated values
  const curvePosition = useSharedValue(TAB_WIDTH / 2);
  const stretchFactor = useSharedValue(1);
  const animatedIndex = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const fabPulse = useSharedValue(1);
  const barVisible = useSharedValue(1);
  const lastScrollY = useSharedValue(0);

  // Handle scroll-based hiding
  useDerivedValue(() => {
    if (!scrollY) return;
    
    const diff = scrollY.value - lastScrollY.value;
    
    if (Math.abs(diff) > 5) {
      if (diff > 0 && scrollY.value > 100) {
        // Scrolling down
        barVisible.value = withSpring(0, HIDE_SPRING);
      } else if (diff < 0 || scrollY.value < 50) {
        // Scrolling up or near top
        barVisible.value = withSpring(1, HIDE_SPRING);
      }
      lastScrollY.value = scrollY.value;
    }
  });

  // FAB pulse animation
  useEffect(() => {
    fabPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Background color
  const bgColor = useDerivedValue(() =>
    interpolateColor(animatedIndex.value, [0, 1, 2, 3], BACKGROUNDS)
  );

  // Animated path props
  const animatedPathProps = useAnimatedProps(() => ({
    d: generatePath(curvePosition.value, stretchFactor.value),
  }));

  // FAB position follows curve
  const fabStyle = useAnimatedStyle(() => ({
    left: curvePosition.value - FAB_SIZE / 2,
    transform: [{ scale: fabScale.value * fabPulse.value }],
  }));

  // Background style
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  // Hide/show animation
  const wrapperStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      barVisible.value,
      [0, 1],
      [BAR_HEIGHT + CURVE_DEPTH + 60, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }],
      opacity: barVisible.value,
    };
  });

  const handleTabPress = useCallback((index: number) => {
    const targetX = index * TAB_WIDTH + TAB_WIDTH / 2;
    
    setActiveIndex(index);
    animatedIndex.value = withSpring(index, CURVE_SPRING);
    
    stretchFactor.value = withSequence(
      withTiming(1.25, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    
    curvePosition.value = withSpring(targetX, CURVE_SPRING);
    
    ReactNativeHapticFeedback.trigger('impactLight');
    onTabChange?.(TABS[index], index);
  }, [onTabChange]);

  const handleFabPress = useCallback(() => {
    fabScale.value = withSequence(
      withSpring(0.88, { damping: 10 }),
      withSpring(1, { damping: 12 })
    );
    ReactNativeHapticFeedback.trigger('impactMedium');
    onFabPress?.();
  }, [onFabPress]);

  return (
    <Animated.View style={[styles.outerWrapper, bgStyle]}>
      <Animated.View style={[styles.wrapper, wrapperStyle, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.container}>
          {/* Blur backdrop */}
          <BlurView
            blurType="light"
            blurAmount={20}
            style={styles.blurContainer}
            reducedTransparencyFallbackColor="#FFFFFF"
          />

          {/* SVG Bar with animated curve */}
          <Svg
            width={BAR_WIDTH}
            height={BAR_HEIGHT + CURVE_DEPTH + 8}
            style={styles.svg}
            viewBox={`0 ${-CURVE_DEPTH - 8} ${BAR_WIDTH} ${BAR_HEIGHT + CURVE_DEPTH + 8}`}
          >
            {/* Shadow layer */}
            <AnimatedPath
              animatedProps={animatedPathProps}
              fill="rgba(18,23,35,0.04)"
              transform="translate(0, 5)"
            />
            {/* Main bar - semi-transparent for blur effect */}
            <AnimatedPath
              animatedProps={animatedPathProps}
              fill="rgba(255,255,255,0.85)"
            />
          </Svg>

          {/* FAB follows the curve */}
          <Animated.View style={[styles.fabContainer, fabStyle]}>
            <Pressable onPress={handleFabPress} style={styles.fab}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d="M12 5V19M5 12H19" stroke="#121723" strokeWidth={2.5} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </Animated.View>

          {/* Tab icons */}
          <View style={styles.tabsRow}>
            {TABS.map((tab, index) => (
              <TabButton
                key={tab}
                name={tab}
                isActive={activeIndex === index}
                curvePosition={curvePosition}
                tabIndex={index}
                onPress={() => handleTabPress(index)}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// Tab button with animation
interface TabButtonProps {
  name: TabKey;
  isActive: boolean;
  curvePosition: Animated.SharedValue<number>;
  tabIndex: number;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ name, isActive, curvePosition, tabIndex, onPress }) => {
  const scale = useSharedValue(isActive ? 1 : 0.85);
  const opacity = useSharedValue(isActive ? 1 : 0.3);

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withSpring(0.8, { damping: 8 }),
        withSpring(1.15, { damping: 10 }),
        withSpring(1, ICON_SPRING)
      );
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value = withSpring(0.85, ICON_SPRING);
      opacity.value = withTiming(0.3, { duration: 180 });
    }
  }, [isActive]);

  const containerStyle = useAnimatedStyle(() => {
    const tabCenter = tabIndex * TAB_WIDTH + TAB_WIDTH / 2;
    const distance = Math.abs(curvePosition.value - tabCenter);
    const hideThreshold = CURVE_RADIUS + 10;
    const visibility = interpolate(distance, [0, hideThreshold], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: opacity.value * visibility,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Animated.View style={containerStyle}>
        <TabIcon name={name} />
      </Animated.View>
    </Pressable>
  );
};

// Icons
const TabIcon: React.FC<{ name: TabKey }> = ({ name }) => {
  const color = '#121723';
  const size = 24;
  const sw = 2;

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={sw} />
          <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={sw} />
          <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={sw} />
          <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'groups':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 6H20M4 12H20M4 18H12" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'approvals':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M7 17L17 7M17 7H9M17 7V15" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth={sw} />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  wrapper: {
    alignItems: 'center',
    paddingTop: CURVE_DEPTH + 12,
  },
  container: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT + CURVE_DEPTH + 8,
  },
  blurContainer: {
    position: 'absolute',
    top: CURVE_DEPTH + 8,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CORNER_RADIUS,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fabContainer: {
    position: 'absolute',
    top: 2,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabsRow: {
    position: 'absolute',
    top: CURVE_DEPTH + 8,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WaveBottomBar;
