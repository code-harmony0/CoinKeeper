import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { dayKey } from '../../services/kazaStreak';
import type { ActivityDay } from '../../services/kazaInsights';

const labelFor = (date: Date, now: Date): string => {
  const key = dayKey(date);
  if (key === dayKey(now)) return 'Today';
  if (key === dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** The journey so far: what was made up, day by day. */
export const KazaJourney: React.FC<{ days: ActivityDay[] }> = ({ days }) => {
  const { colors, cardRadius, cardShadow } = useKazaTheme();
  const now = new Date();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Your journey</Text>
      {days.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          Your journey starts with your first prayer. Every one counts.
        </Text>
      ) : (
        days.slice(0, 7).map((day, i) => (
          <View
            key={day.key}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.inputBg }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.day, { color: colors.textPrimary }]}>{labelFor(day.date, now)}</Text>
              <Text style={[styles.total, { color: colors.textPrimary }]}>
                {day.total} {day.total === 1 ? 'prayer' : 'prayers'}
              </Text>
            </View>
            <Text style={[styles.detail, { color: colors.textSecondary }]}>
              {day.prayers.map(p => `${p.name} ×${p.count}`).join(' · ')}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16 },
  title: { fontSize: 15, fontFamily: 'Satoshi-Bold', marginBottom: 8 },
  empty: { fontSize: 13, fontFamily: 'Satoshi-Regular', lineHeight: 19 },
  row: { paddingVertical: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  total: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  detail: { fontSize: 12, fontFamily: 'Satoshi-Regular', marginTop: 4 },
});
