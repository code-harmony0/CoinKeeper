import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  merchants: string[];
}

export const CategoryTopMerchants: React.FC<Props> = ({ merchants }) => {
  const { colors } = useSpecTheme();

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Top Merchants</Text>
      {merchants.length > 0 ? (
        <View style={styles.merchants}>
          {merchants.map((m, i) => (
            <View key={i} style={[styles.merchantChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.merchantText, { color: colors.textPrimary }]}>{m}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>No recent activity</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  merchants: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  merchantChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  merchantText: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
  empty: { fontSize: 13, fontFamily: 'Satoshi-Medium', fontStyle: 'italic', marginBottom: 16 },
});
