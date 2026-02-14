import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { TabItem } from './TabItem';
import { useTabAnimation } from './hooks/useTabAnimation';
import { DOCK_THEME, TABS, TabKey } from './theme/ThemeTokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DOCK_WIDTH = SCREEN_WIDTH * 0.92;
const DOCK_HEIGHT = DOCK_THEME.container.height;

export interface DockContainerProps {
  scrollY?: any; // Removed SharedValue type to avoid issues
  onTabChange?: (tab: TabKey, index: number) => void;
}

export const DockContainer: React.FC<DockContainerProps> = ({
  scrollY,
  onTabChange,
}) => {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const { activeIndex: animatedIndex, setActiveTab } = useTabAnimation(0);
  
  const barVisible = useSharedValue(1);

  // Removed useDerivedValue for scroll hiding to prevent crashes
  
  // Background style - simplified
  const bgStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      backgroundColor: DOCK_THEME.container.bg,
    };
  });

  // Hide animation
  const wrapperStyle = useAnimatedStyle(() => {
    'worklet';
    const translateY = interpolate(
      barVisible.value,
      [0, 1],
      [DOCK_HEIGHT + 60, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }],
      opacity: barVisible.value,
    };
  });

  const handleTabPress = useCallback((index: number) => {
    setActiveIndex(index);
    setActiveTab(index);
    onTabChange?.(TABS[index], index);
  }, [onTabChange, setActiveTab]);

  return (
    <Animated.View style={[styles.outerWrapper, bgStyle]}>
      <Animated.View style={[styles.wrapper, wrapperStyle, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dockContainer}>
          <BlurView
            blurType="dark"
            blurAmount={DOCK_THEME.container.blur}
            style={styles.blur}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
          />
          <View style={styles.glassOverlay} />
          <View style={styles.tabsRow}>
            {TABS.map((tab, index) => (
              <TabItem
                key={tab}
                name={tab}
                index={index}
                isActive={activeIndex === index}
                isCenter={index === 2}
                accentColor={DOCK_THEME.accents[index]}
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
  dockContainer: {
    width: DOCK_WIDTH,
    height: DOCK_HEIGHT,
    borderRadius: DOCK_THEME.container.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DOCK_THEME.container.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: DOCK_THEME.container.shadowRadius,
    elevation: 16,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DOCK_THEME.container.bg,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
});

export default DockContainer;
