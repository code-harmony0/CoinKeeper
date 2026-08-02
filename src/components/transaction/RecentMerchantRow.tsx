import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface MerchantItem {
  merchant_name: string;
  category_id: string;
}

interface Props {
  title: string;
  items: MerchantItem[];
  onSelect: (item: MerchantItem) => void;
}

export const RecentMerchantRow: React.FC<Props> = ({ title, items, onSelect }) => {
  const { colors, cardRadius } = useSpecTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.group}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={styles.list}>
        {items.map((item, i) => (
          <PressableScale
            key={i}
            onPress={() => onSelect(item)}
            style={[styles.itemCard, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}
          >
            <Text style={[styles.merchantText, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.merchant_name}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Satoshi-Bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  list: { gap: 8 },
  itemCard: { padding: 16 },
  merchantText: { fontFamily: 'Satoshi-Bold', fontSize: 16 },
});
