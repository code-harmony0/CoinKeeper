import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Suggestion {
  merchant_name: string;
  amount_paise: number;
  category_id?: string;
  label: 'Today' | 'Yesterday' | 'Favorite';
  icon?: React.ReactNode;
}

interface Props {
  suggestions: Suggestion[];
  onSelect: (item: Suggestion) => void;
}

export const TimelineSuggestions: React.FC<Props> = ({ suggestions, onSelect }) => {
  const { colors, cardRadius } = useSpecTheme();

  // Group by label
  const grouped = suggestions.reduce((acc, curr) => {
    if (!acc[curr.label]) acc[curr.label] = [];
    acc[curr.label].push(curr);
    return acc;
  }, {} as Record<string, Suggestion[]>);

  if (suggestions.length === 0) return null;

  return (
    <Animated.View 
      entering={FadeInDown.duration(400)} 
      exiting={FadeOutUp.duration(300)} 
      layout={Layout.springify()}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {Object.entries(grouped).map(([label, items]) => (
          <View key={label} style={styles.group}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{label}</Text>
            <View style={styles.list}>
              {items.map((item, idx) => (
                <PressableScale 
                  key={idx}
                  onPress={() => onSelect(item)}
                  style={[styles.itemCard, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}
                >
                  <View style={styles.itemLeft}>
                    {item.icon && <View style={styles.iconWrap}>{item.icon}</View>}
                    <Text style={[styles.merchantText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.merchant_name}
                    </Text>
                  </View>
                  <Text style={[styles.amountText, { color: colors.textPrimary }]}>
                    ₹{(item.amount_paise / 100).toLocaleString()}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  scroll: {
    paddingBottom: 40,
  },
  group: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  list: {
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  iconWrap: {
    marginRight: 10,
  },
  merchantText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  amountText: {
    fontFamily: 'Satoshi-Black',
    fontSize: 16,
  }
});
