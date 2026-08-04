import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import { ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
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
  const { colors, cardRadius, iconShadow, iconContainerRadius } = useSpecTheme();
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
  
  // Calculate trend
  const spendDiff = category.monthlySpend - category.trailingAverageSpend;
  const trendPercent = category.trailingAverageSpend > 0 ? (spendDiff / category.trailingAverageSpend) * 100 : 0;
  const isUp = trendPercent > 0;
  const trendColor = isUp ? colors.danger : colors.success;

  // Use a stable rotation tint if no explicit color
  const accents = [colors.lavender, colors.pink, colors.mint, colors.peach, colors.sky];
  const accentDeep = [colors.lavenderDeep, colors.pinkDeep, colors.mintDeep, colors.peachDeep, colors.skyDeep];
  const charCode = category.name.charCodeAt(0) || 0;
  const rotationIndex = charCode % 5;
  const containerBg = category.color || accents[rotationIndex];
  const iconColor = category.color ? colors.textPrimary : accentDeep[rotationIndex];


  return (
    <View style={[styles.container, { backgroundColor: colors.chipBg, borderRadius: cardRadius, borderLeftWidth: accent === 'transparent' ? 0 : 3, borderLeftColor: accent }]}>
      <PressableScale onPress={toggle} style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: containerBg, borderRadius: iconContainerRadius }, iconShadow]}>
          <IconComp size={20} color={iconColor} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{category.name}</Text>
          <View style={styles.metaRow}>
            {category.topMerchants.length > 0 && (
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {category.topMerchants[0]} •{' '}
              </Text>
            )}
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {category.monthlySpend > 0 ? `₹${category.monthlySpend.toLocaleString()}` : '₹0'}
            </Text>
            {Math.abs(trendPercent) > 5 && (
              <View style={styles.trendWrap}>
                {isUp ? <ArrowUpRight size={12} color={trendColor} /> : <ArrowDownRight size={12} color={trendColor} />}
                <Text style={[styles.trendText, { color: trendColor }]}>{Math.abs(Math.round(trendPercent))}%</Text>
              </View>
            )}
          </View>
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
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
  trendWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 4, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.04)' },
  trendText: { fontSize: 11, fontFamily: 'Satoshi-Bold', marginLeft: 2 },
});
