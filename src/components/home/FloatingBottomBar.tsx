/**
 * FloatingBottomBar Component
 * Android Material You floating pill navigation with central FAB
 * Features: Elevated pill design, spring FAB animation, haptic feedback
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Home, BarChart2, Bell, User, Plus } from 'lucide-react-native';
import { colors, spacing, radii, shadows } from '../../theme/designTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingBottomBarProps {
  activeRoute: string;
  onHomePress?: () => void;
  onReportsPress?: () => void;
  onFabPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
}

export const FloatingBottomBar: React.FC<FloatingBottomBarProps> = ({
  activeRoute,
  onHomePress,
  onReportsPress,
  onFabPress,
  onNotificationsPress,
  onProfilePress,
}) => {
  const insets = useSafeAreaInsets();
  const fabScale = useSharedValue(0.5);
  const fabOpacity = useSharedValue(0);
  const barTranslateY = useSharedValue(100);

  useEffect(() => {
    // Animate bottom bar entrance
    barTranslateY.value = withSpring(0, { damping: 20, stiffness: 150 });

    // Animate FAB entrance with delay
    fabScale.value = withDelay(
      300,
      withSpring(1, { damping: 15, stiffness: 200 })
    );
    fabOpacity.value = withDelay(300, withSpring(1, { damping: 20 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const barAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barTranslateY.value }],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
    opacity: fabOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom, 16) + 16 },
        barAnimatedStyle,
      ]}
    >
      <View style={styles.shadowContainer}>
        <View style={styles.bar}>
          <NavButton
            icon={<Home size={24} strokeWidth={2.5} />}
            isActive={activeRoute === 'Dashboard'}
            onPress={onHomePress}
          />

          <NavButton
            icon={<BarChart2 size={24} strokeWidth={2.5} />}
            isActive={activeRoute === 'Reports'}
            onPress={onReportsPress}
          />

          {/* FAB Spacer */}
          <View style={styles.fabSpacer} />

          <NavButton
            icon={<Bell size={24} strokeWidth={2.5} />}
            isActive={activeRoute === 'Notifications'}
            onPress={onNotificationsPress}
          />

          <NavButton
            icon={<User size={24} strokeWidth={2.5} />}
            isActive={activeRoute === 'Profile'}
            onPress={onProfilePress}
          />
        </View>
      </View>

      {/* Floating Action Button */}
      <AnimatedPressable
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactHeavy');
          onFabPress?.();
        }}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: true }}
        style={[styles.fabContainer, fabAnimatedStyle]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.fab}
        >
          <Plus size={32} color={colors.white} strokeWidth={2.5} />
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
};

interface NavButtonProps {
  icon: React.ReactNode;
  isActive: boolean;
  onPress?: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, isActive, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 18, stiffness: 200 }) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.9;
    ReactNativeHapticFeedback.trigger('impactLight');
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: `${colors.primary}30`, borderless: true }}
      style={[styles.navButton, animatedStyle]}
    >
      <View style={styles.iconWrapper}>
        {React.cloneElement(icon as React.ReactElement, {
          color: isActive ? colors.primary : colors.textMuted,
        })}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
  },
  shadowContainer: {
    ...shadows.floating,
    borderRadius: radii.pill,
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.l,
    height: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSpacer: {
    width: 72,
  },
  fabContainer: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.fab,
  },
});
