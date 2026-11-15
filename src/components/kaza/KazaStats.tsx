import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import type { WeekStats } from '../../services/kazaInsights';

interface Props {
  stats: WeekStats;
  /** With `onToggle`, the card gets a row that reveals or hides the detailed history below it. */
  expanded?: boolean;
  onToggle?: () => void;
}

/** The week at a glance, with the heavy history (calendar, milestones, journey) one tap away. */
export const KazaStats: React.FC<Props> = ({ stats, expanded = false, onToggle }) => {
  const { colors, cardRadius, cardShadow } = useKazaTheme();
  const items = [
    { label: 'This week', value: String(stats.week) },
    { label: 'Daily average', value: String(stats.averagePerDay) },
    { label: 'Best day', value: String(stats.bestDay) },
  ];
  const Chevron = expanded ? ChevronUp : ChevronDown;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
      <View style={styles.stats}>
        {items.map(item => (
          <View key={item.label} style={styles.item} accessible accessibilityLabel={`${item.label}: ${item.value}`}>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{item.value}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      {onToggle && (
        <PressableScale
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={[styles.toggle, { borderTopColor: colors.inputBg }]}
        >
          <Text style={[styles.toggleText, { color: colors.textPrimary }]}>
            {expanded ? 'Hide history' : 'Show history'}
          </Text>
          <Chevron size={20} color={colors.textSecondary} strokeWidth={2} />
        </PressableScale>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  stats: { flexDirection: 'row', paddingVertical: 16 },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  value: { fontSize: 20, fontFamily: 'Satoshi-Black' },
  label: { fontSize: 12, fontFamily: 'Satoshi-Regular' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  toggleText: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
});
