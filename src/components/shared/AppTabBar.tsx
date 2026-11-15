import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Moon, Plus, Receipt, Settings, Users, type LucideIcon } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { brand, useSpecTheme } from '../../theme/specTheme';
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
        <View
          key={active ? 'on' : 'off'}
          style={[styles.indicator, { backgroundColor: active ? indicator : 'transparent', overflow: 'hidden' }]}
        >
          <Icon
            size={22}
            strokeWidth={active ? 2 : 1.6}
            color={active ? indicatorIcon : colors.textSecondary}
          />
        </View>
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
        <Pressable
          onPress={() => go(fab.name)}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          android_ripple={{ color: '#FFFFFF33', borderless: true }}
          style={[styles.fab, { backgroundColor: isDark ? brand.signal : brand.ink }]}
        >
          <Plus size={28} strokeWidth={2.8} color={isDark ? brand.ink : brand.signal} />
        </Pressable>
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
