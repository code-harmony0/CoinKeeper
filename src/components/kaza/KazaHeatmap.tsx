import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import type { HeatCell } from '../../services/kazaStreak';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const describe = (cell: HeatCell): string => {
  const [y, m, d] = cell.key.split('-').map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  if (cell.isRest) return `${date} · rest day`;
  return `${date} · ${cell.count} ${cell.count === 1 ? 'prayer' : 'prayers'}`;
};

/** Five weeks, one square a day: no chain to break, just an honest record. */
export const KazaHeatmap: React.FC<{ weeks: HeatCell[][] }> = ({ weeks }) => {
  const { colors, cardRadius, cardShadow } = useKazaTheme();
  const [picked, setPicked] = useState<HeatCell | null>(null);

  const fillFor = (cell: HeatCell): string => {
    if (cell.isRest) return `${colors.warning}33`;
    if (cell.level === 2) return colors.success;
    if (cell.level === 1) return `${colors.success}66`;
    return colors.chipBg;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Last 5 weeks</Text>
      <View style={styles.row}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={[styles.dayLetter, { color: colors.textSecondary }]}>
            {l}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.row}>
          {week.map(cell => (
            <Pressable
              key={cell.key}
              disabled={cell.isFuture}
              onPress={() => setPicked(cell)}
              accessibilityRole="button"
              accessibilityLabel={describe(cell)}
              style={[
                styles.cell,
                { backgroundColor: fillFor(cell), opacity: cell.isFuture ? 0.25 : 1 },
                cell.isToday && { borderWidth: 2, borderColor: colors.primaryAccent },
              ]}
            />
          ))}
        </View>
      ))}
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        {picked ? describe(picked) : 'Tap a day for details'}
      </Text>
      <View style={styles.legend}>
        {[
          { label: 'Some', color: `${colors.success}66` },
          { label: 'Goal met', color: colors.success },
          { label: 'Rest', color: `${colors.warning}33` },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 24 },
  title: { fontSize: 15, fontFamily: 'Satoshi-Bold', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  dayLetter: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Satoshi-Medium' },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 8, maxHeight: 40 },
  caption: { fontSize: 12, fontFamily: 'Satoshi-Medium', marginTop: 8, textAlign: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, fontFamily: 'Satoshi-Regular' },
});
