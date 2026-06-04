/**
 * UserCapsuleTabBar — Floating pill tab bar with expanding active tabs
 * Adapted from ExpandingTabBar for user fintech theme
 * Lucide icons · Spring animations · Haptics · FAB center
 */
import React, { useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { Home, ReceiptText, BarChart3, Settings, Plus } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import USER_FINTECH_THEME from '../../theme/userFintechTheme';

const T = USER_FINTECH_THEME;
const C = T.colors;
const { width: SCREEN_W } = Dimensions.get('window');

/* ── Dimensions (8pt grid) ── */
const BAR_W = SCREEN_W - 48; // 24px margin each side
const BAR_H = 64;
const CORNER_R = BAR_H / 2;
const TAB_H = 40;
const FAB_SIZE = 56;
const FAB_SPACER = 64;
const EXPANDED_W = 88;
const ICON_SIZE = 22;

type IconComp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface TabDef {
  name: string;
  label: string;
  icon: IconComp;
}

const USER_TABS: TabDef[] = [
  { name: 'Home', label: 'Home', icon: Home },
  { name: 'Transactions', label: 'Activity', icon: ReceiptText },
  { name: 'Add', label: 'Add', icon: Plus },
  { name: 'Reports', label: 'Reports', icon: BarChart3 },
  { name: 'Settings', label: 'Settings', icon: Settings },
];

const FAB_INDEX = 2;

/* ── Expanding Tab ── */
const ExpandingTab = memo(({
  tabDef,
  isActive,
  onPress,
}: {
  tabDef: TabDef;
  isActive: boolean;
  onPress: () => void;
}) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isActive ? 1 : 0, {
      damping: 16,
      stiffness: 140,
      overshootClamping: false,
    });
  }, [isActive, progress]);

  const pillStyle = useAnimatedStyle(() => {
    'worklet';
    const width = interpolate(progress.value, [0, 1], [TAB_H, EXPANDED_W], Extrapolation.CLAMP);
    return { width };
  });

  const labelAnim = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP);
    const translateX = interpolate(progress.value, [0, 1], [-8, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateX }] };
  });

  const iconAnim = useAnimatedStyle(() => {
    'worklet';
    const scale = interpolate(progress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP);
    return { transform: [{ scale }] };
  });

  const Icon = tabDef.icon;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={tabDef.label} accessibilityState={{ selected: isActive }}>
      <Animated.View style={[styles.tab, pillStyle, { backgroundColor: isActive ? C.brandBlueSoft : 'transparent' }]}>
        <View style={styles.tabInner}>
          <Animated.View style={iconAnim}>
            <Icon size={ICON_SIZE} color={isActive ? C.brandBlue : C.textMuted} strokeWidth={isActive ? 2.2 : 1.8} />
          </Animated.View>
          {isActive && (
            <Animated.View style={labelAnim}>
              <Text style={styles.tabLabel} numberOfLines={1}>{tabDef.label}</Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

/* ── FAB Button ── */
const FabButton = memo(({ onPress }: { onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.fabTouch}>
    <View style={styles.fab}>
      <Plus size={24} color={C.textOnAccent} strokeWidth={2.8} />
    </View>
  </Pressable>
));

/* ── Main Component ── */
export const UserCapsuleTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      {/* Bar */}
      <View style={styles.barOuter}>
        <BlurView
          blurType="light"
          blurAmount={64}
          style={StyleSheet.absoluteFill}
          reducedTransparencyFallbackColor="#FFFFFF"
        />
        <View style={styles.barInner}>
          {state.routes.map((route, index) => {
            const tabDef = USER_TABS[index] || USER_TABS[0];
            const isFocused = state.index === index;

            const onPress = () => {
              ReactNativeHapticFeedback.trigger('impactLight');
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // FAB spacer slot
            if (index === FAB_INDEX) {
              return <View key="fab-spacer" style={styles.fabSpacer} />;
            }

            return (
              <View key={route.key} style={styles.tabSlot}>
                <ExpandingTab tabDef={tabDef} isActive={isFocused} onPress={onPress} />
              </View>
            );
          })}
        </View>
      </View>

      {/* FAB — floating above bar */}
      <View style={[styles.fabContainer, { bottom: bottomPad + (BAR_H / 2) - (FAB_SIZE / 2) }]}>
        <FabButton
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium');
            const fabRoute = state.routes[FAB_INDEX];
            const event = navigation.emit({
              type: 'tabPress',
              target: fabRoute.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) {
              navigation.navigate(fabRoute.name);
            }
          }}
        />
      </View>
    </View>
  );
};

/* ── Styles ── */
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barOuter: {
    width: BAR_W,
    height: BAR_H,
    borderRadius: CORNER_R,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSpacer: {
    width: FAB_SPACER,
    height: TAB_H,
  },
  tab: {
    height: TAB_H,
    borderRadius: TAB_H / 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.brandBlue,
    letterSpacing: 0.2,
  },
  fabContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  fabTouch: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: C.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.brandBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default UserCapsuleTabBar;
