import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CategoryData, MergeSuggestion } from '../../types/category';

interface Props {
  categories: CategoryData[];
  mergeSuggestions: MergeSuggestion[];
  onReviewMerge: () => void;
}

export const CategoryAttentionBanner: React.FC<Props> = ({ categories, mergeSuggestions, onReviewMerge }) => {
  const { colors } = useSpecTheme();
  const [dismissed, setDismissed] = useState(false);

  const unusedCount = categories.filter(c => c.health === 'unused').length;
  const overBudgetCount = categories.filter(c => c.health === 'over_budget').length;

  let message: string | null = null;
  let onPress: (() => void) | undefined;

  if (mergeSuggestions.length > 0) {
    message = `${mergeSuggestions.length} ${mergeSuggestions.length === 1 ? 'pair looks' : 'pairs look'} similar — review merge suggestions?`;
    onPress = onReviewMerge;
  } else if (unusedCount > 0) {
    message = `${unusedCount} unused ${unusedCount === 1 ? 'category' : 'categories'} — clean them up to keep your intelligence model accurate.`;
  } else if (overBudgetCount > 0) {
    message = `${overBudgetCount} ${overBudgetCount === 1 ? 'category is' : 'categories are'} trending above its usual spend this month.`;
  }

  if (!message || dismissed) return null;

  return (
    <PressableScale onPress={onPress} disabled={!onPress} style={[styles.banner, { backgroundColor: colors.chipBg }]}>
      <View style={styles.dot}>
        <AlertTriangle size={18} color={brand.ink} strokeWidth={2} />
      </View>
      <Text style={[styles.text, { color: colors.textPrimary }]}>{message}</Text>
      <PressableScale
        onPress={() => setDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.dismiss}
      >
        <X size={18} color={colors.textSecondary} />
      </PressableScale>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 24, marginBottom: 12, gap: 12, borderRadius: 16 },
  dot: { width: 36, height: 36, borderRadius: 10, backgroundColor: brand.signal, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 14, fontFamily: 'Satoshi-Medium', lineHeight: 20 },
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
