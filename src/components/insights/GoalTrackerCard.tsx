import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface GoalTrackerCardProps {
  name: string;
  targetAmount: number;
  currentAmount: number;
}

export const GoalTrackerCard: React.FC<GoalTrackerCardProps> = ({ name, targetAmount, currentAmount }) => {
  const { colors, cardRadius, cardShadow } = useSpecTheme();

  const progress = Math.min(Math.max(currentAmount / targetAmount, 0), 1);
  const percentage = Math.round(progress * 100);

  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
      <View style={styles.header}>
        <Text variant="h3" style={{ color: colors.textPrimary }}>{name}</Text>
        <Text variant="h3" style={{ color: colors.primaryAccent }}>{percentage}%</Text>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSunken }]}>
        <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: colors.primaryAccent }]} />
      </View>

      <View style={styles.footer}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          {Money.format(currentAmount, { zeroDecimals: true })} saved
        </Text>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          Target: {Money.format(targetAmount, { zeroDecimals: true })}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
