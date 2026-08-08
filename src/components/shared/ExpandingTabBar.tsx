/**
 * ExpandingTabBar - Enhanced with better animations and micro-interactions
 * Premium expanding tab bar with smooth transitions
 */

import React, { useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  withSequence,
  useAnimatedReaction,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import {
  useSpecTheme,
  specDark,
  specLight,
  fabSize,
} from '../../theme/specTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.94; // Wider bar, less side space
const BAR_HEIGHT = 56; // Reduced height
const CORNER_RADIUS = BAR_HEIGHT / 2;

const ICON_SIZE = 22; // Compact icon size
const TAB_HEIGHT = 40; // Compact height
const FAB_SIZE = fabSize; // Larger FAB that grows out
const FAB_SPACER_WIDTH = 74; // Extra space around FAB for better separation
const PILL_PADDING = 6; // padding inside each tab pill
const ICON_LABEL_GAP = 6; // gap between icon and revealed label
// Collapsed pill = icon + PILL_PADDING each side so the icon is never clipped.
const COLLAPSED_PILL = ICON_SIZE + PILL_PADDING * 2;
// Expanded pill fits icon + gap + widest label ("Activity" ≈52px at 12px Bold).
const EXPANDED_PILL = COLLAPSED_PILL + ICON_LABEL_GAP + 52;
// Label sits absolutely to the right of the icon: padding + icon + gap.
const LABEL_LEFT = PILL_PADDING + ICON_SIZE + ICON_LABEL_GAP;

// Theme-driven palette — mirrors useTheme()'s light/darkColors (specLight/
// specDark). Light values stay pixel-identical to the original frosted glass;
// dark swaps in the dark palette so the bar doesn't remain a white pill on the
// #0F1419 canvas. The rotation order (lavender→pink→mint→peach→sky) is load-bearing.
const getBarColors = (isDark: boolean) => {
  const palette = isDark ? specDark : specLight;
  return {
    accents: [
      palette.lavender,
      palette.pink,
      palette.mint,
      palette.peach,
      palette.sky,
    ],
    vibrantFills: [
      palette.lavenderDeep,
      palette.pinkDeep,
      palette.mintDeep,
      palette.peachDeep,
      palette.skyDeep,
    ],
    activeIcon: palette.primaryAccent,
    inactiveIcon: palette.textSecondary,
    labelColor: palette.textPrimary,
    inactiveBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)',
    barBg: isDark ? 'rgba(30,37,48,0.95)' : 'rgba(255,255,255,0.15)',
    barBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
    blurType: (isDark ? 'dark' : 'light') as 'dark' | 'light',
    blurFallback: isDark ? '#1E2530' : '#FFFFFF',
    fabBg: palette.primaryAccent,
    fabIcon: isDark ? '#0F1419' : '#FFFFFF',
  };
};

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
  const { isDark } = useSpecTheme();
  const barColors = getBarColors(isDark);

  // Check if we're on a detail screen (nested route)
  const currentRoute = state.routes[activeIndex];
  const isDetailScreen = currentRoute?.state?.index > 0;

  // Every hook below must run on every render. The `isDetailScreen` early
  // return lives after all of them (just above the JSX) — returning here
  // would skip these hooks and crash React with "rendered fewer hooks than
  // expected" the moment a nested stack pushes a detail screen.

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
    [scrollY],
  );

  const animatedWrapperStyle = useAnimatedStyle(() => {
    'worklet';
    const translateY = interpolate(barVisible.value, [0, 1], [150, 0]);
    return {
      transform: [{ translateY }],
      opacity: barVisible.value,
    };
  });

  // Calculate effective padding bottom for bar positioning
  const effectivePaddingBottom = Math.max(insets.bottom, 18);

  // Animated style for FAB
  const animatedFabStyle = useAnimatedStyle(() => {
    'worklet';
    const translateY = interpolate(barVisible.value, [0, 1], [150, 0]);
    const opacity = barVisible.value;
    // FAB sits more on the bar (moved down 15px from previous position)
    const bottomValue = effectivePaddingBottom + 10;

    return {
      bottom: bottomValue,
      transform: [{ translateY }],
      opacity: opacity,
    };
  });

  // Coming back from a detail screen (or switching tabs) must always restore
  // the bar. Without this it stays hidden at barVisible=0 if the user had
  // scrolled down before drilling in, and only a scroll-up would reveal it.
  useEffect(() => {
    barVisible.value = withSpring(1, { damping: 20, stiffness: 200 });
  }, [activeIndex, isDetailScreen, barVisible]);

  const renderTab = (tab: TabConfig, index: number) => {
    const isActive = activeIndex === index;
    const vibrantFill =
      barColors.vibrantFills[index % barColors.vibrantFills.length];

    return (
      <View key={tab.name} style={styles.tabSlot}>
        <ExpandingTab
          icon={tab.icon}
          label={tab.label}
          isActive={isActive}
          accentColor={barColors.accents[index % barColors.accents.length]}
          vibrantFill={vibrantFill}
          activeIcon={barColors.activeIcon}
          inactiveIcon={barColors.inactiveIcon}
          labelColor={barColors.labelColor}
          inactiveBg={barColors.inactiveBg}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', {
              enableVibrateFallback: true,
            });
            navigation.navigate(tab.name);
          }}
        />
      </View>
    );
  };

  // Safe to bail out now — every hook above has already run.
  if (isDetailScreen) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingBottom: effectivePaddingBottom },
        animatedWrapperStyle,
      ]}
    >
      <View style={[styles.barContainer, { borderColor: barColors.barBorder }]}>
        <BlurView
          blurType={barColors.blurType}
          blurAmount={80}
          style={styles.blur}
          reducedTransparencyFallbackColor={barColors.blurFallback}
        />
        <View style={[styles.bar, { backgroundColor: barColors.barBg }]}>
          {!hasFab ? (
            tabs.map((tab, index) => renderTab(tab, index))
          ) : (
            <>
              {/* Ghost slots balance the bar so the FAB sits dead-center
                  regardless of tab count (e.g. 4 lite tabs → [2][FAB][2]). */}
              {Array.from(
                { length: Math.max(0, tabs.length - fabIndex - 1 - fabIndex) },
                (_, i) => (
                  <View key={`ghost-l-${i}`} style={styles.tabSlot} />
                ),
              )}
              {tabs.slice(0, fabIndex).map((tab, i) => renderTab(tab, i))}
              <View key="fab-slot" style={styles.fabSlot} />
              {tabs
                .slice(fabIndex + 1)
                .map((tab, i) => renderTab(tab, i + fabIndex + 1))}
              {Array.from(
                {
                  length: Math.max(0, fabIndex - (tabs.length - fabIndex - 1)),
                },
                (_, i) => (
                  <View key={`ghost-r-${i}`} style={styles.tabSlot} />
                ),
              )}
            </>
          )}
        </View>
      </View>

      {/* Absolutely positioned FAB - sibling to barContainer for overflow */}
      {hasFab && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              // fabContainer centers itself on `left` via marginLeft: -FAB_SIZE/2,
              // and the bar is centered on screen — so screen center = bar center.
              left: SCREEN_WIDTH / 2,
            },
            animatedFabStyle,
          ]}
        >
          <FabButton
            color={barColors.fabBg}
            iconColor={barColors.fabIcon}
            accessibilityLabel={tabs[fabIndex]?.label ?? 'Add'}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactMedium', {
                enableVibrateFallback: true,
              });
              navigation.navigate(tabs[fabIndex].name);
            }}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

// Enhanced Expanding Tab
const ExpandingTab = memo(
  ({
    icon,
    label,
    isActive,
    accentColor,
    vibrantFill,
    activeIcon,
    inactiveIcon,
    labelColor,
    inactiveBg,
    onPress,
  }: {
    icon: string;
    label: string;
    isActive: boolean;
    accentColor: string;
    vibrantFill: string;
    activeIcon: string;
    inactiveIcon: string;
    labelColor: string;
    inactiveBg: string;
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
        [COLLAPSED_PILL, EXPANDED_PILL],
        Extrapolation.CLAMP,
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
        Extrapolation.CLAMP,
      );
      const translateX = interpolate(
        progress.value,
        [0, 1],
        [-10, 0],
        Extrapolation.CLAMP,
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
        Extrapolation.CLAMP,
      );
      return {
        transform: [{ scale: iconScaleValue }],
      };
    });

    const iconColor = isActive ? activeIcon : inactiveIcon;
    const bgColor = isActive ? accentColor : inactiveBg;

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Animated.View
          style={[styles.tab, containerStyle, { backgroundColor: bgColor }]}
        >
          <View style={styles.tabContent}>
            <Animated.View style={[styles.iconWrapper, iconScale]}>
              <TabIcon
                name={icon}
                color={iconColor}
                fill={vibrantFill}
                isActive={isActive}
              />
            </Animated.View>
          </View>
          {/* Label is absolutely positioned beside the icon and clipped by the
              pill (overflow hidden) — it never takes layout space, so the icon
              stays perfectly centered and can't be pushed out / cut off. */}
          <Animated.View style={[styles.labelPositioner, labelStyle]}>
            <Text
              style={[styles.label, { color: labelColor }]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    );
  },
);

// Enhanced FAB Button
const FabButton = memo(
  ({
    onPress,
    color,
    iconColor,
    accessibilityLabel,
  }: {
    onPress: () => void;
    color: string;
    iconColor: string;
    accessibilityLabel: string;
  }) => {
    const pulse = useSharedValue(1);

    useEffect(() => {
      pulse.value = withTiming(1.05, {
        duration: 1000,
        reduceMotion: ReduceMotion.System,
      });
      const interval = setInterval(() => {
        pulse.value = withSequence(
          withTiming(1.05, {
            duration: 1000,
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(1, { duration: 1000, reduceMotion: ReduceMotion.System }),
        );
      }, 2000);
      return () => clearInterval(interval);
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pulse.value }],
    }));

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View
          style={[styles.fab, { backgroundColor: color }, pulseStyle]}
        >
          <Svg width={26} height={26} viewBox="0 0 24 24">
            <Path
              d="M12 5V19M5 12H19"
              stroke={iconColor}
              strokeWidth={2.8}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </Pressable>
    );
  },
);

// Pure Tab Icon - Dark Stroke + PROMINENT Vibrant Fill
const TabIcon = memo(
  ({
    name,
    color,
    fill,
    isActive,
  }: {
    name: string;
    color: string;
    fill: string;
    isActive: boolean;
  }) => {
    // Icon must render at exactly ICON_SIZE so it never overflows the 22px
    // iconWrapper (the tab clips via overflow:hidden — 26px SVGs got cropped).
    const size = ICON_SIZE;
    const sw = 2.2;
    const vibrantFill = isActive ? fill : 'none';
    // FULL OPACITY for prominent visibility
    const fillOpacity = isActive ? 1 : 0;

    switch (name) {
      case 'home':
      case 'dashboard':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 9.5L12 3L21 9.5V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9.5Z"
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Path
              d="M9 22V12H15V22"
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
          </Svg>
        );
      case 'groups':
      case 'users':
      case 'chits':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle
              cx={9}
              cy={7}
              r={3}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Path
              d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"
              stroke={color}
              strokeWidth={sw}
            />
            <Circle
              cx={17}
              cy={8}
              r={2.5}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Path
              d="M22 21v-1.5a3 3 0 00-3-3h-1"
              stroke={color}
              strokeWidth={sw}
            />
          </Svg>
        );
      case 'approve':
      case 'check':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
              stroke={color}
              strokeWidth={sw}
            />
            <Rect
              x={9}
              y={3}
              width={6}
              height={4}
              rx={1}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Path d="M9 14l2 2 4-4" stroke={color} strokeWidth={sw} />
          </Svg>
        );
      case 'wallet':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
              x={2}
              y={6}
              width={20}
              height={13}
              rx={3}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Path
              d="M6 6V5a2 2 0 012-2h8a2 2 0 012 2v1M2 11h20"
              stroke={color}
              strokeWidth={sw}
            />
            <Circle cx={17} cy={14.5} r={1.5} fill={isActive ? fill : color} />
          </Svg>
        );
      case 'kaza':
      case 'moon':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20.5 14.5A8.5 8.5 0 019.5 3.5a8.5 8.5 0 1011 11z"
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'settings':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle
              cx={12}
              cy={12}
              r={3}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001.51 1H15a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
              stroke={color}
              strokeWidth={sw}
            />
          </Svg>
        );
      case 'receipt':
      case 'transactions':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Path
              d="M8 10h8M8 14h5"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          </Svg>
        );
      case 'chart':
      case 'reports':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
              x={3}
              y={12}
              width={4}
              height={9}
              rx={1}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Rect
              x={10}
              y={7}
              width={4}
              height={14}
              rx={1}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
            <Rect
              x={17}
              y={3}
              width={4}
              height={18}
              rx={1}
              stroke={color}
              strokeWidth={sw}
              fill={vibrantFill}
              fillOpacity={fillOpacity}
            />
          </Svg>
        );
      case 'add':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 5V19M5 12H19"
              stroke={color}
              strokeWidth={2.8}
              strokeLinecap="round"
            />
          </Svg>
        );
      default:
        return null;
    }
  },
);

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
    justifyContent: 'space-evenly',
    paddingHorizontal: 0,
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSlot: {
    width: FAB_SPACER_WIDTH,
    height: TAB_HEIGHT,
  },
  fabContainer: {
    position: 'absolute',
    marginLeft: -(FAB_SIZE / 2),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tab: {
    height: TAB_HEIGHT,
    borderRadius: TAB_HEIGHT / 2,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelPositioner: {
    position: 'absolute',
    left: LABEL_LEFT,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    letterSpacing: 0,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
});

export default ExpandingTabBar;
