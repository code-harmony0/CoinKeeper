/**
 * ChitPreviewCard Component
 * Preview card showing active chit funds with pill badges
 * Features: Soft card design, pill badges, tap feedback
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Users, ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography, radii, shadows } from '../../theme/designTokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChitGroup {
  name: string;
  backgroundColor: string[];
}

interface ChitPreviewCardProps {
  groupCount?: number;
  nextDrawDays?: number;
  groups?: ChitGroup[];
  onPress?: () => void;
}

export const ChitPreviewCard: React.FC<ChitPreviewCardProps> = ({
  groupCount = 3,
  nextDrawDays = 5,
  groups = [
    { name: 'Friends', backgroundColor: ['rgba(145, 186, 236, 0.2)', 'rgba(145, 186, 236, 0.1)'] },
    { name: 'Office', backgroundColor: ['rgba(168, 176, 240, 0.2)', 'rgba(168, 176, 240, 0.1)'] },
    { name: 'Family', backgroundColor: ['rgba(228, 150, 178, 0.2)', 'rgba(228, 150, 178, 0.1)'] },
  ],
  onPress,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 18, stiffness: 200 }) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.98;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const handlePress = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: `${colors.primaryMuted}20` }}
      style={animatedStyle}
    >
      <View style={styles.shadowContainer}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={[colors.success, colors.successLight]}
                style={styles.icon}
              >
                <Users size={24} color={colors.white} strokeWidth={2.5} />
              </LinearGradient>
            </View>

            <View style={styles.info}>
              <Text style={styles.title}>Active Chit Funds</Text>
              <View style={styles.meta}>
                <Text style={styles.metaText}>{groupCount} groups</Text>
                <View style={styles.metaDot} />
                <Text style={[styles.metaText, styles.metaHighlight]}>
                  Next draw in {nextDrawDays} days
                </Text>
              </View>
            </View>

            <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
          </View>

          {/* Group Pills */}
          <View style={styles.groups}>
            {groups.map((group, _index) => (
              <View key={group.name} style={styles.groupItem}>
                <LinearGradient
                  colors={group.backgroundColor as unknown as string[]}
                  style={styles.groupPill}
                >
                  <Text style={styles.groupName}>{group.name}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    ...shadows.card,
    borderRadius: radii.card,
    marginBottom: spacing.xl,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  iconWrapper: {
    marginRight: spacing.m,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radii.m,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.section,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  metaHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
  },
  groups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  groupItem: {
    borderRadius: radii.m,
    overflow: 'hidden',
  },
  groupPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radii.m,
  },
  groupName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textTitle,
    fontWeight: '600',
  },
});
