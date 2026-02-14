import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withSpring,
  interpolate,
  interpolateColor,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { TabItem } from './TabItem';
import { TAB_COLORS, TABS, TabKey, SPRING_CONFIG } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.9;
const BAR_HEIGHT = 64;
const CORNER_RADIUS = 32;

export interface AnimatedTabBarProps {
  scrollY?: SharedValue<number>;
  onTabChange?: (tab: TabKey, index: number) => void;
}

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  scrollY,
  onTabChange,
}) => {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const animatedIndex = useSharedValue(0);
  const barVisible = useSharedValue(1);
  const lastScrollY = useSharedValue(0);

  // Handle scroll-based hiding
  useDerivedValue(() => {
    if (!scrollY) return;
    const diff = scrollY.value - lastScrollY.value;
    if (Math.abs(diff) > 10) {
      if (diff > 30 && scrollY.value > 80) {
        barVisible.value = withSpring(0, { damping: 18, stiffness: 100 });
      } else if (diff < -30 || scrollY.value < 40) {
        barVisible.value = withSpring(1, { damping: 18, stiffness: 100 });
      }
      lastScrollY.value = scrollY.value;
    }
  });

  // Background color for screen
  const backgroundColor = useDerivedValue(() =>
    interpolateColor(animatedIndex.value, [0, 1, 2, 3], [...TAB_COLORS.backgrounds])
  );

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  // Hide/show animation
  const wrapperStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      barVisible.value,
      [0, 1],
      [BAR_HEIGHT + 50, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }],
      opacity: barVisible.value,
    };
  });

  const handleTabPress = useCallback((index: number) => {
    setActiveIndex(index);
    animatedIndex.value = withSpring(index, SPRING_CONFIG);
    onTabChange?.(TABS[index], index);
  }, [onTabChange]);

  return (
    <Animated.View style={[styles.outerWrapper, bgStyle]}>
      <Animated.View style={[styles.wrapper, wrapperStyle, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.barContainer}>
          {/* Blur backdrop */}
          <BlurView
            blurType="light"
            blurAmount={25}
            style={styles.blur}
            reducedTransparencyFallbackColor="#FFFFFF"
          />
          
          {/* Bar content */}
          <View style={styles.bar}>
            {TABS.map((tab, index) => (
              <TabItem
                key={tab}
                name={tab}
                index={index}
                isActive={activeIndex === index}
                accentColor={TAB_COLORS.accents[index]}
                onPress={() => handleTabPress(index)}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
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
  },
  barContainer: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: CORNER_RADIUS,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: TAB_COLORS.barBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: TAB_COLORS.barBg,
  },
});

export default AnimatedTabBar;
