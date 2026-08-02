import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { CategoryData } from '../../types/category';

interface Props {
  categories: CategoryData[];
}

export const CategoryHealthSummary: React.FC<Props> = ({ categories }) => {
  const { colors, cardRadius } = useSpecTheme();

  const total = categories.length;
  const healthy = categories.filter(c => c.health === 'healthy').length;
  const needsAttention = categories.filter(c => c.health !== 'healthy').length;

  return (
    <View style={[styles.row, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{total}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Total</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.success }]}>{healthy}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Healthy</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: needsAttention > 0 ? ((colors as any).warning || '#F59E0B') : colors.textPrimary }]}>
          {needsAttention}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Needs attention</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, marginHorizontal: 24, marginBottom: 16 },
  stat: { alignItems: 'center' },
  value: { fontSize: 22, fontFamily: 'Satoshi-Black' },
  label: { fontSize: 11, fontFamily: 'Satoshi-Medium', marginTop: 2 },
});
