/**
 * ExpandingTabBar - Enhanced with better animations and micro-interactions
 * Premium expanding tab bar with smooth transitions
 */

import React, { useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  withSequence,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTabBarScroll } from '../../context/TabBarScrollContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.80; // Reduced for 4 tabs
const BAR_HEIGHT = 70;
const CORNER_RADIUS = 35;

const COLORS = {
  accents: ['#D8E2FA', '#E2B6CF', '#98E4C1', '#FFD4B8', '#B8E6F5'],
  // Vibrant colors for the FILLS - High visibility
  vibrantFills: ['#1565C0', '#AD1457', '#2E7D32', '#E65100', '#00838F'],
  activeIcon: '#121723', // Dark stroke
  inactiveIcon: 'rgba(18, 23, 35, 0.5)',
  inactiveBg: 'rgba(255,255,255,0.2)',
  barBg: 'rgba(255,255,255,0.15)', // Clean glass background
  barBorder: 'rgba(255,255,255,0.3)',
};

const ICON_SIZE = 50;
const EXPANDED_WIDTH = 135;
const TAB_HEIGHT = 50;

interface TabConfig {
  name: string;
  label: string;
  icon: string;
}

interface ExpandingTabBarProps {
  state: any;
  navigation: any;
  tabs: TabConfig[];
  hasFab?: boolean;
  fabIndex?: number;
}

export const ExpandingTabBar: React.FC<ExpandingTabBarProps> = ({
  state,
  navigation,
  tabs,
  hasFab = false,
  fabIndex = 2,
}) => {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  // Check if we're on a detail screen (nested route)
  const currentRoute = state.routes[activeIndex];
  const isDetailScreen = currentRoute?.state?.index > 0;

  // Hide entire tab bar on detail screens
  if (isDetailScreen) {
    return null;
  }

  // Scroll Hiding Logic
  const { scrollY } = useTabBarScroll();
  const barVisible = useSharedValue(1);

  useAnimatedReaction(
    () => scrollY.value,
    (current, previous) => {
      if (previous === null || previous === undefined) return;
      const diff = current - previous;
      if (Math.abs(diff) > 10) {
        if (diff > 0 && current > 50) {
          // Scrolling down - hide
          barVisible.value = withSpring(0, { damping: 20, stiffness: 200 });
        } else if (diff < 0) {
          // Scrolling up - show
          barVisible.value = withSpring(1, { damping: 20, stiffness: 200 });
        }
      }
    },
    [scrollY]
  );

  const animatedWrapperStyle = useAnimatedStyle(() => {
    'worklet';
    const translateY = interpolate(barVisible.value, [0, 1], [150, 0]);
    return {
      transform: [{ translateY }],
      opacity: barVisible.value,
    };
  });

  return (
    <Animated.View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 18) }, animatedWrapperStyle]}>
      <View style={styles.barContainer}>
        <BlurView
          blurType="light"
          blurAmount={80} // Good blur, not excessive
          style={styles.blur}
          reducedTransparencyFallbackColor="#FFFFFF"
        />
        <View style={styles.bar}>
          {tabs.map((tab, index) => {
            if (hasFab && index === fabIndex) {
              return (
                <FabButton
                  key={tab.name}
                  onPress={() => {
                    ReactNativeHapticFeedback.trigger('impactMedium', {
                      enableVibrateFallback: true,
                    });
                    navigation.navigate(tab.name);
                  }}
                />
              );
            }

            const isActive = activeIndex === index;
            const vibrantFill = COLORS.vibrantFills[index % COLORS.vibrantFills.length];
            
            return (
              <ExpandingTab
                key={tab.name}
                icon={tab.icon}
                label={tab.label}
                isActive={isActive}
                accentColor={COLORS.accents[index % COLORS.accents.length]}
                vibrantFill={vibrantFill}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight', {
                    enableVibrateFallback: true,
                  });
                  navigation.navigate(tab.name);
                }}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

// Enhanced Expanding Tab
const ExpandingTab = memo(({
  icon,
  label,
  isActive,
  accentColor,
  vibrantFill,
  onPress
}: {
  icon: string;
  label: string;
  isActive: boolean;
  accentColor: string;
  vibrantFill: string;
  onPress: () => void;
}) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isActive ? 1 : 0, {
      damping: 15,
      stiffness: 120,
      overshootClamping: false,
    });
  }, [isActive, progress]);

  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    const width = interpolate(
      progress.value,
      [0, 1],
      [ICON_SIZE, EXPANDED_WIDTH],
      Extrapolation.CLAMP
    );
    return {
      width,
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    'worklet';
    const labelOpacity = interpolate(
      progress.value,
      [0.6, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-10, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity: labelOpacity,
      transform: [{ translateX }],
    };
  });

  const iconScale = useAnimatedStyle(() => {
    'worklet';
    const iconScaleValue = interpolate(
      progress.value,
      [0, 1],
      [0.95, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale: iconScaleValue }],
    };
  });

  const iconColor = isActive ? COLORS.activeIcon : COLORS.inactiveIcon;
  const bgColor = isActive ? accentColor : COLORS.inactiveBg;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.tab, containerStyle, { backgroundColor: bgColor }]}>
        <View style={styles.tabContent}>
          <Animated.View style={[styles.iconWrapper, iconScale]}>
            <TabIcon 
              name={icon} 
              color={iconColor} 
              fill={vibrantFill} 
              isActive={isActive} 
            />
          </Animated.View>
          {isActive && (
            <Animated.View style={labelStyle}>
              <Text style={styles.label} numberOfLines={1}>{label}</Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

// Enhanced FAB Button
const FabButton = memo(({ onPress }: { onPress: () => void }) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withTiming(1.05, { duration: 1000 });
    const interval = setInterval(() => {
      pulse.value = withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Pressable onPress={onPress} style={styles.fabWrapper}>
      <Animated.View style={[styles.fab, pulseStyle]}>
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path d="M12 5V19M5 12H19" stroke="#FFF" strokeWidth={2.8} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </Pressable>
  );
});

// Pure Tab Icon - Dark Stroke + PROMINENT Vibrant Fill
const TabIcon = memo(({ name, color, fill, isActive }: { name: string; color: string; fill: string; isActive: boolean }) => {
  const size = 26;
  const sw = 2.2;
  const vibrantFill = isActive ? fill : 'none';
  // FULL OPACITY for prominent visibility
  const fillOpacity = isActive ? 1 : 0; 

  switch (name) {
    case 'home':
    case 'dashboard':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 9.5L12 3L21 9.5V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9.5Z" stroke={color} strokeWidth={sw} fill={vibrantFill} fillOpacity={fillOpacity} />
          <Path d="M9 22V12H15V22" stroke={color} strokeWidth={sw} fill={vibrantFill} fillOpacity={fillOpacity} />
        </Svg>
      );
    case 'groups':
    case 'users':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={9} cy={7} r={3} stroke={color} strokeWidth={sw} fill={vibrantFill} fillOpacity={fillOpacity} />
          <Path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" stroke={color} strokeWidth={sw} />
          <Circle cx={17} cy={8} r={2.5} stroke={color} strokeWidth={sw} fill={vibrantFill} fillOpacity={fillOpacity} />
          <Path d="M22 21v-1.5a3 3 0 00-3-3h-1" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'approve':
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={color} strokeWidth={sw} />
          <Rect x={9} y={3} width={6} height={4} rx={1} stroke={color} strokeWidth={sw} fill={vibrantFill} fillOpacity={fillOpacity} />
          <Path d="M9 14l2 2 4-4" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'wallet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={2} y={6} width={20} height={13} rx={3} stroke={color} strokeWidth={sw} fill={vibrantFill} fillOpacity={fillOpacity} />
          <Path d="M6 6V5a2 2 0 012-2h8a2 2 0 012 2v1M2 11h20" stroke={color} strokeWidth={sw} />
          <Circle cx={17} cy={14.5} r={1.5} fill={isActive ? fill : color} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={sw} fill={vibrantFill} fillOpacity={fillOpacity} />
          <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001.51 1H15a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'add':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barContainer: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: CORNER_RADIUS,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.barBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
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
    gap: 7,
    backgroundColor: COLORS.barBg,
  },
  tab: {
    height: TAB_HEIGHT,
    borderRadius: TAB_HEIGHT / 2,
    justifyContent: 'center',
    paddingLeft: 13,
    paddingRight: 15,
    overflow: 'hidden',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#121723',
    letterSpacing: 0.2,
  },
  fabWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#121723',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
});

export default ExpandingTabBar;
