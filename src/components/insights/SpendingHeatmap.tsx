import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SpendingHeatmapProps {
  data: { day: string; amount: number }[];
}

export const SpendingHeatmap: React.FC<SpendingHeatmapProps> = ({ data }) => {
  const { colors, cardRadius, cardShadow, space } = useSpecTheme();

  if (!data || data.length === 0) return null;

  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.container, { backgroundColor: colors.card, borderRadius: cardRadius, padding: space.sm }, cardShadow]}>
      <Text variant="h2" style={{ marginBottom: space.sm }}>Weekly Heatmap</Text>
      <View style={styles.chart}>
        {data.map((item, index) => {
          const intensity = maxAmount > 0 ? (item.amount / maxAmount) : 0;
          const barColor = intensity > 0.7 ? colors.pink : (intensity > 0.3 ? colors.peach : colors.surfaceSunken);

          return (
            <View key={index} style={[styles.barContainer, { gap: space.xs }]}>
              <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
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
  container: {},
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barContainer: {
    alignItems: 'center',
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
