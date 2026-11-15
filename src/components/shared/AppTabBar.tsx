import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Moon, Plus, Receipt, Settings, Users, type LucideIcon } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { brand, useSpecTheme } from '../../theme/specTheme';
import { EXPRESSIVE } from '../../theme/motion';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import type { TabDef } from '../../navigation/userTabs';

const ICONS: Record<TabDef['icon'], LucideIcon> = {
  home: Home,
  transactions: Receipt,
  add: Plus,
  kaza: Moon,
  chits: Users,
  settings: Settings,
};

const BAR_HEIGHT = 64;
const FAB = 52;
const HIDE_AFTER = 80;

interface Props extends BottomTabBarProps {
  tabs: TabDef[];
  /** Index of the centre action in `tabs` (rendered as the raised button). */
  fabIndex: number;
}

/**
 * The lite app's tab bar: every destination keeps its label (recognition over
 * recall), the active one is marked by a black indicator behind a yellow icon,
 * and the centre action is a raised black button. Hides while scrolling down.
 */
/** The active tab's pill: grows out of the centre with a spring instead of snapping on. */
const TabPill: React.FC<{ active: boolean; color: string; icon: LucideIcon; idle: string; lit: string }> = ({ active, color, icon: Icon, idle, lit }) => {
  const p = useSharedValue(active ? 1 : 0);
  React.useEffect(() => {
    p.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 220, mass: 0.9 });
  }, [active, p]);
  const pill = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scaleX: 0.35 + 0.65 * p.value }, { scaleY: 0.7 + 0.3 * p.value }],
  }));
  // Two stacked icons crossfade with the pill, so the lit icon never shows on a white background.
  const idleIcon = useAnimatedStyle(() => ({ opacity: 1 - p.value }));
  const litIcon = useAnimatedStyle(() => ({ opacity: p.value }));
  return (
    <View style={styles.indicator}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.pillFill, { backgroundColor: color }, pill]} />
      <Animated.View style={[styles.iconLayer, idleIcon]}>
        <Icon size={22} strokeWidth={1.6} color={idle} />
      </Animated.View>
      <Animated.View style={[styles.iconLayer, litIcon]}>
        <Icon size={22} strokeWidth={2} color={lit} />
      </Animated.View>
    </View>
  );
};

/** The add button: springs in when it appears, presses down, and the plus turns a quarter. */
const Fab: React.FC<{ onPress: () => void; isDark: boolean }> = ({ onPress, isDark }) => {
  const press = useSharedValue(0);
  const body = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.1 }] }));
  const plus = useAnimatedStyle(() => ({ transform: [{ rotate: `${press.value * 90}deg` }] }));
  const bg = isDark ? brand.signal : brand.ink;
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12).stiffness(200).reduceMotion(EXPRESSIVE)}
      exiting={ZoomOut.duration(160).reduceMotion(EXPRESSIVE)}
      style={body}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(1, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 12, stiffness: 220 });
        }}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        style={[styles.fab, { backgroundColor: bg }]}
      >
        <Animated.View style={plus}>
          <Plus size={28} strokeWidth={2.6} color={isDark ? brand.ink : brand.signal} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export const AppTabBar: React.FC<Props> = ({ state, navigation, tabs, fabIndex }) => {
  const { colors, isDark } = useSpecTheme();
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  const hidden = useSharedValue(0);
  const last = useSharedValue(0);

  useAnimatedReaction(
    () => scrollY.value,
    y => {
      const delta = y - last.value;
      if (y < HIDE_AFTER || delta < -8) hidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      else if (delta > 8) hidden.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
      last.value = y;
    },
  );
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * (BAR_HEIGHT + insets.bottom) }],
  }));
  const fabSlide = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * (BAR_HEIGHT + insets.bottom + FAB + 32) }],
  }));

  const activeName = state.routes[state.index]?.name;
  const indicator = isDark ? colors.chipBg : brand.ink;
  const indicatorIcon = brand.signal;

  // Adding a transaction only makes sense from the money screens; elsewhere the
  // button would just cover content (Kaza's +, list chevrons).
  const showFab = activeName === 'Home' || activeName === 'Transactions';

  const go = (name: string) => {
    ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
    navigation.navigate(name);
  };

  const renderTab = (tab: TabDef) => {
    const active = tab.name === activeName;
    const Icon = ICONS[tab.icon];
    return (
      <Pressable
        key={tab.name}
        onPress={() => go(tab.name)}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: active }}
        android_ripple={{ color: `${colors.textPrimary}14`, borderless: true, radius: 36 }}
        style={styles.slot}
      >
        {/* Always set a background: Android drops borderRadius when one is added later. */}
        <TabPill active={active} color={indicator} icon={Icon} idle={colors.textSecondary} lit={indicatorIcon} />
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: active ? colors.textPrimary : colors.textSecondary },
            active && styles.labelActive,
          ]}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  // Even slots for every destination; the add action floats above the bar at
  // the bottom right (the Material FAB position), so no tab count can push it
  // off centre.
  const destinations = tabs.filter((_, i) => i !== fabIndex);
  const fab = tabs[fabIndex];

  return (
    <>
      {showFab && (
      <Animated.View
        style={[
          styles.fabWrap,
          { bottom: BAR_HEIGHT + insets.bottom + 12 },
          fabSlide,
        ]}
        pointerEvents="box-none"
      >
        <Fab onPress={() => go(fab.name)} isDark={isDark} />
      </Animated.View>
      )}
      <Animated.View
        style={[
          styles.bar,
          {
            paddingBottom: insets.bottom,
            height: BAR_HEIGHT + insets.bottom,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
          slide,
        ]}
      >
        {destinations.map(renderTab)}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_HEIGHT, gap: 2 },
  indicator: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFill: { borderRadius: 16 },
  iconLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium' },
  labelActive: { fontFamily: 'Satoshi-Bold' },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
});
