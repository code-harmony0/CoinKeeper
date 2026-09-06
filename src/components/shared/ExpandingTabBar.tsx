/**
 * ExpandingTabBar — iOS 26 Liquid Glass Edition
 *
 * A floating pill tab bar that morphs between two states:
 *   EXPANDED  — full width, labels visible, sliding indicator pill
 *   MINIMIZED — compact pill, icons only, slides down slightly
 *
 * The transition is driven by scroll position (scrollY from TabBarScrollContext)
 * and animated with spring physics for that organic "liquid" feel.
 *
 * Surface: solid themed fill (liquid glass removed).
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
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { EXPRESSIVE, SPRING } from '../../theme/motion';
import {
  useSpecTheme,
  specDark,
  specLight,
  fabSize,
} from '../../theme/specTheme';
import { PlatformGlassMaterial } from './PlatformGlassMaterial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Expanded state dimensions ────────────────────────────────────────
const BAR_WIDTH_EXPANDED = SCREEN_WIDTH * 0.94;
const BAR_HEIGHT = 56;
const CORNER_RADIUS = BAR_HEIGHT / 2;

// ─── Minimized state dimensions ───────────────────────────────────────
// Compact pill: just icons + padding. Roughly 3-4 icons × 44px + margins.
const ICON_SLOT_MINIMIZED = 44;
const BAR_PADDING_MINIMIZED = 8;

// ─── Shared constants ─────────────────────────────────────────────────
const ICON_SIZE = 22;
const TAB_HEIGHT = 40;
const FAB_SIZE = fabSize;
const FAB_SPACER_WIDTH = 74;
const PILL_PADDING = 6;
const ICON_LABEL_GAP = 6;
const COLLAPSED_PILL = ICON_SIZE + PILL_PADDING * 2;
const EXPANDED_PILL = COLLAPSED_PILL + ICON_LABEL_GAP + 52;
const LABEL_LEFT = PILL_PADDING + ICON_SIZE + ICON_LABEL_GAP;

// ─── Spring configs ───────────────────────────────────────────────────
// Smooth, organic springs that feel "liquid" — slight overshoot, fast settle.
const TAB_SWITCH_SPRING = {
  damping: 16,
  stiffness: 140,
  mass: 0.9,
  overshootClamping: false,
};

const MINIMIZE_SPRING = {
  damping: 22,
  stiffness: 300,
  mass: 0.6,
  overshootClamping: false,
};

// Theme-driven palette
const getBarColors = (isDark: boolean) => {
  const palette = isDark ? specDark : specLight;
  return {
    accents: [
      palette.lavender,
      palette.pink,
      palette.mint,
    ],
    activeIcon: isDark ? '#FFFFFF' : '#000000',
    inactiveIcon: palette.textSecondary,
    labelColor: palette.textPrimary,
    // Active tab capsule is now a subtle glass highlight, not a solid color
    activeBg: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
    inactiveBg: 'transparent',
    // Fallback glass tint for non-LiquidGlass platforms
    barBg: isDark ? 'rgba(20,25,35,0.45)' : 'rgba(255,255,255,0.25)',
    // Tint retained for the active-capsule highlight
    glassTint: isDark ? 'rgba(140,160,200,0.08)' : 'rgba(255,255,255,0.25)',
    // Border for glass edge
    barBorder: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.4)',
    blurType: (isDark ? 'dark' : 'light') as 'dark' | 'light',
    blurFallback: isDark ? '#1E2530' : '#FFFFFF',
    colorScheme: (isDark ? 'dark' : 'light') as 'dark' | 'light',
    // FAB is now glass
    fabBg: isDark ? 'rgba(20,25,35,0.45)' : 'rgba(255,255,255,0.25)',
    fabIcon: isDark ? '#FFFFFF' : '#000000',
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

  const currentRoute = state.routes[activeIndex];
  const isDetailScreen = currentRoute?.state?.index > 0;

  // ─── Scroll-driven minimize ───────────────────────────────────────
  const { scrollY } = useTabBarScroll();

  // 0 = expanded, 1 = minimized
  const minimizeProgress = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  // Calculate minimized width based on visible tab count
  const visibleTabs = hasFab
    ? tabs.filter((_, i) => i !== fabIndex)
    : tabs;
  const minimizedWidth =
    visibleTabs.length * ICON_SLOT_MINIMIZED +
    BAR_PADDING_MINIMIZED * 2 +
    (hasFab ? FAB_SPACER_WIDTH * 0.6 : 0);

  useAnimatedReaction(
    () => scrollY.value,
    (current, previous) => {
      if (previous === null || previous === undefined) return;
      const diff = current - previous;

      if (Math.abs(diff) > 4) {
        if (diff > 0 && current > 30) {
          // Scrolling down → hide fast
          minimizeProgress.value = withSpring(1, MINIMIZE_SPRING);
        } else if (diff < 0) {
          // Scrolling up → show
          minimizeProgress.value = withSpring(0, MINIMIZE_SPRING);
        }
      }
    },
    [scrollY],
  );

  // Restore bar when switching tabs or leaving detail
  useEffect(() => {
    minimizeProgress.value = withSpring(0, MINIMIZE_SPRING);
  }, [activeIndex, isDetailScreen, minimizeProgress]);

  // ─── Animated bar container (the glass pill) ──────────────────────
  const effectivePaddingBottom = Math.max(insets.bottom, 18);

  const animatedBarContainerStyle = useAnimatedStyle(() => {
    'worklet';
    const width = interpolate(
      minimizeProgress.value,
      [0, 1],
      [BAR_WIDTH_EXPANDED, minimizedWidth],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      minimizeProgress.value,
      [0, 1],
      [0, 12],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      minimizeProgress.value,
      [0, 1],
      [1, 0.95],
      Extrapolation.CLAMP,
    );
    return {
      width,
      transform: [{ translateY }, { scale }],
    };
  });

  // ─── Labels fade out during minimize ──────────────────────────────
  const labelGlobalOpacity = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(
        minimizeProgress.value,
        [0, 0.3],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  // ─── Animated wrapper ──────────────────────────────────────────────
  const animatedWrapperStyle = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(
      minimizeProgress.value,
      [0, 1],
      [1, 0.92],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // ─── FAB follows minimize ─────────────────────────────────────────
  const animatedFabStyle = useAnimatedStyle(() => {
    'worklet';
    const translateY = interpolate(
      minimizeProgress.value,
      [0, 1],
      [0, 14],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      minimizeProgress.value,
      [0, 1],
      [1, 0.82],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      minimizeProgress.value,
      [0, 0.7, 1],
      [1, 0.7, 0.5],
      Extrapolation.CLAMP,
    );
    const bottomValue = effectivePaddingBottom + 10;
    return {
      bottom: bottomValue,
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  // ─── Render tabs ──────────────────────────────────────────────────
  const renderTab = (tab: TabConfig, index: number) => {
    const isActive = activeIndex === index;

    return (
      <View key={tab.name} style={styles.tabSlot}>
        <LiquidGlassTab
          icon={tab.icon}
          label={tab.label}
          isActive={isActive}
          activeIcon={barColors.activeIcon}
          inactiveIcon={barColors.inactiveIcon}
          labelColor={barColors.labelColor}
          inactiveBg={barColors.inactiveBg}
          activeBg={barColors.activeBg}
          minimizeProgress={minimizeProgress}
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

  const renderContent = () => (
    <>
      <Animated.View
        style={[
          styles.barContainer,
          { borderColor: barColors.barBorder },
          animatedBarContainerStyle,
        ]}
      >
        {/* Unified Glass material background */}
        <PlatformGlassMaterial
          style={styles.liquidGlass}
          tintColor={barColors.glassTint}
          colorScheme={barColors.colorScheme}
          blurFallbackColor={barColors.blurFallback}
        />
        <View style={styles.bar}>
          {!hasFab ? (
            tabs.map((tab, index) => renderTab(tab, index))
          ) : (
            <>
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
      </Animated.View>

      {/* FAB — sibling to barContainer for overflow */}
      {hasFab && (
        <Animated.View
          style={[
            styles.fabContainer,
            { left: SCREEN_WIDTH / 2 },
            animatedFabStyle,
          ]}
        >
          <FabButton
            barColors={barColors}
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
    </>
  );

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
      <View style={styles.glassSystemContainer}>{renderContent()}</View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// LiquidGlassTab — Individual tab with minimize-aware animations
// ═══════════════════════════════════════════════════════════════════════

interface LiquidGlassTabProps {
  icon: string;
  label: string;
  isActive: boolean;
  activeIcon: string;
  inactiveIcon: string;
  labelColor: string;
  inactiveBg: string;
  activeBg: string;
  minimizeProgress: Animated.SharedValue<number>;
  onPress: () => void;
}

const LiquidGlassTab = memo(
  ({
    icon,
    label,
    isActive,
    activeIcon,
    inactiveIcon,
    labelColor,
    inactiveBg,
    activeBg,
    minimizeProgress,
    onPress,
  }: LiquidGlassTabProps) => {
    // Tab active/inactive transition
    const progress = useSharedValue(isActive ? 1 : 0);

    useEffect(() => {
      progress.value = withSpring(isActive ? 1 : 0, TAB_SWITCH_SPRING);
    }, [isActive, progress]);

    // ─── Pill container: width morphs with both active state AND minimize ──
    const containerStyle = useAnimatedStyle(() => {
      'worklet';
      // When expanded: active tab is wider (shows label), inactive is compact
      const expandedWidth = interpolate(
        progress.value,
        [0, 1],
        [COLLAPSED_PILL, EXPANDED_PILL],
        Extrapolation.CLAMP,
      );
      // When minimized: all tabs are same compact size
      const width = interpolate(
        minimizeProgress.value,
        [0, 1],
        [expandedWidth, COLLAPSED_PILL],
        Extrapolation.CLAMP,
      );
      return { width };
    });

    // ─── Label: fades out on both deactivation AND minimize ─────────────
    const labelStyle = useAnimatedStyle(() => {
      'worklet';
      // Active progress drives label visibility when expanded
      const activeOpacity = interpolate(
        progress.value,
        [0.6, 1],
        [0, 1],
        Extrapolation.CLAMP,
      );
      // Minimize progress hides label regardless
      const minimizeOpacity = interpolate(
        minimizeProgress.value,
        [0, 0.3],
        [1, 0],
        Extrapolation.CLAMP,
      );
      const translateX = interpolate(
        progress.value,
        [0, 1],
        [-10, 0],
        Extrapolation.CLAMP,
      );
      return {
        opacity: activeOpacity * minimizeOpacity,
        transform: [{ translateX }],
      };
    });

    // ─── Icon: scale and subtle bounce ──────────────────────────────────
    const iconScale = useAnimatedStyle(() => {
      'worklet';
      const iconScaleValue = interpolate(
        progress.value,
        [0, 1],
        [0.95, 1.1],
        Extrapolation.CLAMP,
      );
      // Slightly smaller in minimized state
      const minimizeScale = interpolate(
        minimizeProgress.value,
        [0, 1],
        [1, 0.92],
        Extrapolation.CLAMP,
      );
      return {
        transform: [{ scale: iconScaleValue * minimizeScale }],
      };
    });

    const iconColor = isActive ? activeIcon : inactiveIcon;
    const bgColor = isActive ? activeBg : inactiveBg;
    const activeBorderStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        borderWidth: interpolate(progress.value, [0, 1], [0, 0.5]),
        borderColor: 'rgba(255,255,255,0.15)',
      };
    });

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Animated.View
          style={[styles.tab, containerStyle, { backgroundColor: bgColor }, activeBorderStyle]}
        >
          <View style={styles.tabContent}>
            <Animated.View style={[styles.iconWrapper, iconScale]}>
              <TabIcon
                name={icon}
                color={iconColor}
                fill="none" // Remove solid fill since capsule itself highlights
                isActive={isActive}
              />
            </Animated.View>
          </View>
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

// ═══════════════════════════════════════════════════════════════════════
// FabButton — same as before, with subtle minimize awareness
// ═══════════════════════════════════════════════════════════════════════

const FabButton = memo(
  ({
    onPress,
    barColors,
    iconColor,
    accessibilityLabel,
  }: {
    onPress: () => void;
    barColors: ReturnType<typeof getBarColors>;
    iconColor: string;
    accessibilityLabel: string;
  }) => {
    const press = useSharedValue(1);

    const pulseStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: press.value },
      ],
    }));

    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(0.92, {
            damping: 20,
            stiffness: 400,
            mass: 0.6,
          });
        }}
        onPressOut={() => {
          press.value = withSpring(1, {
            damping: 20,
            stiffness: 400,
            mass: 0.6,
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View style={[styles.fab, { borderColor: barColors.barBorder }, pulseStyle]}>
          <PlatformGlassMaterial
            style={styles.liquidGlass}
            tintColor={barColors.glassTint}
            colorScheme={barColors.colorScheme}
            blurFallbackColor={barColors.blurFallback}
            isFab={true}
          />

          <View style={styles.fabIconContainer}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path
                d="M12 5V19M5 12H19"
                stroke={iconColor}
                strokeWidth={2.8}
                strokeLinecap="round"
              />
            </Svg>
          </View>
        </Animated.View>
      </Pressable>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════
// TabIcon — Pure SVG icons (unchanged)
// ═══════════════════════════════════════════════════════════════════════

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
    const size = ICON_SIZE;
    const sw = 2.2;
    const vibrantFill = isActive ? fill : 'none';
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

// ═══════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glassSystemContainer: {
    width: '100%',
    alignItems: 'center',
  },
  barContainer: {
    height: BAR_HEIGHT,
    borderRadius: CORNER_RADIUS,
    overflow: 'hidden',
    // Liquid glass: thin luminous border
    borderWidth: 0.5,
    // Softer, more diffused shadow for floating glass effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 10,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  liquidGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CORNER_RADIUS,
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
    overflow: 'hidden',
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  fabIconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});

export default ExpandingTabBar;
