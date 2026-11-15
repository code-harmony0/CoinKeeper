import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { CategoryData } from '../../types/category';

interface Props {
  categories: CategoryData[];
}

/** Three plain counts. No traffic-light colours: the list below says which need a look. */
export const CategoryHealthSummary: React.FC<Props> = ({ categories }) => {
  const { colors } = useSpecTheme();
  const total = categories.length;
  const healthy = categories.filter(c => c.health === 'healthy').length;
  const needsAttention = total - healthy;
  const stats = [
    { value: total, label: 'Categories' },
    { value: healthy, label: 'In good shape' },
    { value: needsAttention, label: 'Need a look' },
  ];
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      {stats.map(s => (
        <View key={s.label} style={styles.stat}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{s.value}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: 24, paddingBottom: 16, marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1 },
  value: { fontSize: 28, lineHeight: 36, fontFamily: 'Satoshi-Black' },
  label: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
});
