import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radii } from '../../theme/designTokens';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface GoalTrackerCardProps {
  name: string;
  targetAmount: number;
  currentAmount: number;
}

export const GoalTrackerCard: React.FC<GoalTrackerCardProps> = ({ name, targetAmount, currentAmount }) => {
  const { colors } = useTheme();

  const percentage = Math.min(Math.max((currentAmount / targetAmount) * 100, 0), 100);

  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.text }]}>
      <View style={styles.header}>
        <Text variant="h2">{name}</Text>
        <Text variant="h2" color="primary">{percentage.toFixed(0)}%</Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.footer}>
        <Text variant="caption" color="secondary">Saved: ₹{currentAmount.toLocaleString()}</Text>
        <Text variant="caption" color="secondary">Goal: ₹{targetAmount.toLocaleString()}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    borderRadius: radii.card,
    elevation: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  track: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.s,
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
