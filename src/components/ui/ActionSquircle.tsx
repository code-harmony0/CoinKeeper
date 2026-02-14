/**
 * ActionSquircle Component
 * Premium squircle button with spring animation and haptic feedback
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { theme } from '../../theme';

interface ActionSquircleProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  badge?: number;
  delay?: number;
  onPress?: () => void;
}

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

export const ActionSquircle: React.FC<ActionSquircleProps> = ({
  icon,
  label,
  color,
  badge,
  delay = 0,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, SPRING_CONFIG) }],
  }));

  return (
    <Animated.View entering={ZoomIn.delay(600 + delay).springify()}>
      <Pressable
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress?.();
        }}
        onPressIn={() => {
          scale.value = 0.92;
        }}
        onPressOut={() => {
          scale.value = 1;
        }}
        style={styles.container}
      >
        <Animated.View style={[styles.squircle, { backgroundColor: color }, anim]}>
          {icon}
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </Animated.View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  squircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#D32F2F', // Error/Badge color
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC', // Match background usually
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
