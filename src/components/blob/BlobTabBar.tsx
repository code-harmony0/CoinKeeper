/**
 * BlobTabBar - Organic floating bottom navigation
 * Blob-shaped tab bar with integrated FAB
 */
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Receipt, Users, Settings, Plus } from 'lucide-react-native';
import { THEME_COLORS, THEME_SHADOWS, THEME_RADIUS, THEME_SPACING, THEME_ANIMATION } from '../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface TabItem {
  name: string;
  label: string;
  icon: typeof Home;
}

interface BlobTabBarProps {
  state: any;
  navigation: any;
  onFabPress: () => void;
}

const tabs: TabItem[] = [
  { name: 'Dashboard', label: 'Home', icon: Home },
  { name: 'Transactions', label: 'Activity', icon: Receipt },
  { name: 'Groups', label: 'Groups', icon: Users },
  { name: 'Settings', label: 'Settings', icon: Settings },
];

export const BlobTabBar: React.FC<BlobTabBarProps> = ({
  state,
  navigation,
  onFabPress,
}) => {
  const insets = useSafeAreaInsets();
  const fabScale = useSharedValue(1);

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(fabScale.value, THEME_ANIMATION.spring) }],
  }));

  const handleFabPressIn = () => {
    fabScale.value = 0.9;
    ReactNativeHapticFeedback.trigger('impactMedium');
  };

  const handleFabPressOut = () => {
    fabScale.value = 1;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || THEME_SPACING.sm }]}>
      {/* Blob-shaped background */}
      <View style={styles.blobBackground}>
        {/* Left tabs */}
        <View style={styles.tabsLeft}>
          {tabs.slice(0, 2).map((tab, index) => {
            const isFocused = state.index === index;
            const Icon = tab.icon;

            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight');
                  navigation.navigate(tab.name);
                }}
                style={styles.tabItem}
              >
                <View style={[styles.tabIconContainer, isFocused && styles.tabIconFocused]}>
                  <Icon
                    size={22}
                    color={isFocused ? THEME_COLORS.textPrimary : THEME_COLORS.textMuted}
                    strokeWidth={isFocused ? 2.5 : 2}
                  />
                </View>
                {isFocused && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </View>

        {/* Center FAB */}
        <Pressable
          onPress={onFabPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={styles.fabWrapper}
        >
          <Animated.View style={[styles.fab, fabAnimStyle]}>
            <Plus size={28} color={THEME_COLORS.surface} strokeWidth={2.5} />
          </Animated.View>
        </Pressable>

        {/* Right tabs */}
        <View style={styles.tabsRight}>
          {tabs.slice(2, 4).map((tab, index) => {
            const actualIndex = index + 2;
            // Skip Add placeholder (index 2 in navigator)
            const navIndex = actualIndex >= 2 ? actualIndex + 1 : actualIndex;
            const isFocused = state.index === navIndex || 
                             (tab.name === 'Groups' && state.index === 3) ||
                             (tab.name === 'Settings' && state.index === 4);
            const Icon = tab.icon;

            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight');
                  navigation.navigate(tab.name);
                }}
                style={styles.tabItem}
              >
                <View style={[styles.tabIconContainer, isFocused && styles.tabIconFocused]}>
                  <Icon
                    size={22}
                    color={isFocused ? THEME_COLORS.textPrimary : THEME_COLORS.textMuted}
                    strokeWidth={isFocused ? 2.5 : 2}
                  />
                </View>
                {isFocused && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: THEME_SPACING.lg,
  },
  blobBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME_COLORS.surface,
    borderRadius: THEME_RADIUS.pill,
    paddingVertical: THEME_SPACING.sm,
    paddingHorizontal: THEME_SPACING.lg,
    width: '100%',
    ...THEME_SHADOWS.elevated,
  },
  tabsLeft: {
    flexDirection: 'row',
    gap: THEME_SPACING.lg,
  },
  tabsRight: {
    flexDirection: 'row',
    gap: THEME_SPACING.lg,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME_SPACING.xs,
  },
  tabIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconFocused: {
    backgroundColor: THEME_COLORS.surfaceTint,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME_COLORS.accent,
  },
  fabWrapper: {
    marginTop: -32,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME_SHADOWS.elevated,
  },
});

export default BlobTabBar;
