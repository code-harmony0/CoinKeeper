import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Award, Lock } from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import type { Milestone } from '../../services/kazaStreak';

export const KazaMilestones: React.FC<{ milestones: Milestone[] }> = ({ milestones }) => {
  const { colors, cardRadius, cardShadow } = useKazaTheme();
  const earned = milestones.filter(m => m.achieved).length;
  // Earned first, then what is closest — a shelf, not a to-do list.
  const ordered = [...milestones].sort((a, b) => Number(b.achieved) - Number(a.achieved));

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Milestones · {earned}/{milestones.length}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rail}
        contentContainerStyle={styles.list}
      >
        {ordered.map(m => (
          <View
            key={m.id}
            accessible
            accessibilityLabel={`${m.title}. ${m.achieved ? 'Earned' : 'Not yet'}. ${m.detail}`}
            style={[styles.chip, { backgroundColor: m.achieved ? colors.pink : colors.surfaceSunken }]}
          >
            {m.achieved ? (
              <Award size={18} color={colors.pinkDeep} strokeWidth={2.2} />
            ) : (
              <Lock size={16} color={colors.textSecondary} strokeWidth={2} />
            )}
            <Text
              style={[styles.chipTitle, { color: m.achieved ? colors.textPrimary : colors.textSecondary }]}
              numberOfLines={1}
            >
              {m.title}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16 },
  title: { fontSize: 15, fontFamily: 'Satoshi-Bold', marginBottom: 12 },
  // Bleed to the card's edges so the row visibly scrolls instead of being cut mid-chip.
  rail: { marginHorizontal: -16 },
  list: { gap: 8, paddingHorizontal: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 16, borderRadius: 999 },
  chipTitle: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
});
