import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radii } from '../../theme/designTokens';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SpendingHeatmapProps {
  data: { day: string; amount: number }[];
}

export const SpendingHeatmap: React.FC<SpendingHeatmapProps> = ({ data }) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) return null;

  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.text }]}>
      <Text variant="h2" style={styles.title}>Weekly Heatmap</Text>
      <View style={styles.chart}>
        {data.map((item, index) => {
          const intensity = maxAmount > 0 ? (item.amount / maxAmount) : 0;
          const barColor = intensity > 0.7 ? colors.accent2 : (intensity > 0.3 ? colors.accent4 : colors.surfaceSecondary);

          return (
            <View key={index} style={styles.barContainer}>
              <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={[styles.fill, { height: `${intensity * 100}%`, backgroundColor: barColor }]} />
              </View>
              <Text variant="caption" color="secondary" style={styles.label}>{item.day[0]}</Text>
            </View>
          );
        })}
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
  title: {
    marginBottom: spacing.m,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  track: {
    width: 24,
    height: 90,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    borderRadius: 12,
  },
  label: {
    textTransform: 'uppercase',
  },
});
