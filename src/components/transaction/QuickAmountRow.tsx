import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  amounts: number[]; // paise, deduped, most-recent-first, max 4
  onSelect: (amountPaise: number) => void;
}

export const QuickAmountRow: React.FC<Props> = ({ amounts, onSelect }) => {
  const { colors, cardRadius } = useSpecTheme();
  if (amounts.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {amounts.slice(0, 4).map((paise, i) => (
        <PressableScale
          key={i}
          onPress={() => onSelect(paise)}
          style={[styles.chip, { backgroundColor: colors.chipBg, borderRadius: cardRadius - 4 }]}
        >
          <Text style={[styles.chipText, { color: colors.textPrimary }]}>
            ₹{(paise / 100).toLocaleString()}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { fontFamily: 'Satoshi-Bold', fontSize: 15 },
});
