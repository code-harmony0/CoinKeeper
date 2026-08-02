import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { RecentMerchantRow } from './RecentMerchantRow';
import { QuickAmountRow } from './QuickAmountRow';

interface MerchantItem {
  merchant_name: string;
  category_id: string;
}

interface Props {
  favorites: MerchantItem[];
  recents: MerchantItem[];
  quickAmounts: number[]; // paise
  onSelectMerchant: (item: MerchantItem) => void;
  onSelectAmount: (amountPaise: number) => void;
}

export const SmartSuggestionsSection: React.FC<Props> = ({
  favorites,
  recents,
  quickAmounts,
  onSelectMerchant,
  onSelectAmount,
}) => {
  const hasAny = favorites.length > 0 || recents.length > 0 || quickAmounts.length > 0;
  if (!hasAny) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp.duration(300)} layout={Layout.springify()} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {quickAmounts.length > 0 && (
          <View style={styles.block}>
            <QuickAmountRow amounts={quickAmounts} onSelect={onSelectAmount} />
          </View>
        )}
        <RecentMerchantRow title="Favorites" items={favorites} onSelect={onSelectMerchant} />
        <RecentMerchantRow title="Recent" items={recents} onSelect={onSelectMerchant} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
  scroll: { paddingBottom: 40 },
  block: { marginBottom: 20 },
});
