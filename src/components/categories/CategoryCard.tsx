import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CategoryData, MergeSuggestion } from '../../types/category';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { CategorySparkline } from './CategorySparkline';
import { CategoryExpandedContent } from './CategoryExpandedContent';

interface Props {
  category: CategoryData;
  mergeSuggestion?: MergeSuggestion;
  onEdit: (category: CategoryData) => void;
  onMerge: (category: CategoryData) => void;
  onMergeConfirm: (sourceId: string, targetId: string) => void;
  onDelete: (id: string) => void;
}

const HEALTH_ACCENT: Record<CategoryData['health'], string> = {
  healthy: 'transparent',
  unused: '#94A3B8',
  over_budget: '#EF4444',
  attention: '#F59E0B',
};

export const CategoryCard: React.FC<Props> = ({ category, mergeSuggestion, onEdit, onMerge, onMergeConfirm, onDelete }) => {
  const { colors, cardRadius, iconShadow } = useSpecTheme();
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    setExpanded(!expanded);
    progress.value = withSpring(expanded ? 0 : 1, { damping: 15 });
  };

  const bodyStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, 220]),
    opacity: progress.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));

  const IconComp = resolveCategoryIcon(category.id, category.icon);
  const accent = HEALTH_ACCENT[category.health];

  return (
    <View style={[styles.container, { backgroundColor: colors.chipBg, borderRadius: cardRadius, borderLeftWidth: accent === 'transparent' ? 0 : 3, borderLeftColor: accent }]}>
      <PressableScale onPress={toggle} style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.background }, iconShadow]}>
          <IconComp size={20} color={category.color || colors.primaryAccent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{category.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {category.usageCount} txs • {category.monthlySpend > 0 ? `₹${category.monthlySpend.toLocaleString()}` : '₹0'}
          </Text>
        </View>
        {category.trend.length >= 2 && (
          <CategorySparkline values={category.trend} color={accent === 'transparent' ? colors.primaryAccent : accent} />
        )}
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={colors.textSecondary} />
        </Animated.View>
      </PressableScale>

      <Animated.View style={bodyStyle}>
        <CategoryExpandedContent
          category={category}
          mergeSuggestion={mergeSuggestion}
          onEdit={() => onEdit(category)}
          onMerge={() => onMerge(category)}
          onMergeConfirm={() => mergeSuggestion && onMergeConfirm(category.id, mergeSuggestion.suggestedWithId)}
          onDelete={() => onDelete(category.id)}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  meta: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
});
