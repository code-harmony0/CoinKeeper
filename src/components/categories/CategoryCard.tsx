import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import { ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';
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

/** Words instead of a coloured edge: only a category running over its usual spend is flagged. */
const HEALTH_NOTE: Record<CategoryData['health'], string | null> = {
  healthy: null,
  unused: 'Unused',
  over_budget: 'Above usual',
  attention: 'Worth a look',
};

export const CategoryCard: React.FC<Props> = ({ category, mergeSuggestion, onEdit, onMerge, onMergeConfirm, onDelete }) => {
  const { colors, isDark } = useSpecTheme();
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
  const note = HEALTH_NOTE[category.health];
  const over = category.health === 'over_budget';
  
  // Calculate trend
  const spendDiff = category.monthlySpend - category.trailingAverageSpend;
  const trendPercent = category.trailingAverageSpend > 0 ? (spendDiff / category.trailingAverageSpend) * 100 : 0;
  const isUp = trendPercent > 0;
  const trendColor = colors.textSecondary;

  // A colour the person chose is theirs and stays; otherwise the standard black tile.
  const containerBg = category.color || (isDark ? colors.chipBg : brand.ink);
  const iconColor = category.color ? colors.textPrimary : '#FFFFFF';


  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <PressableScale
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.header}
      >
        <View style={[styles.iconWrap, { backgroundColor: containerBg }]}>
          <IconComp size={20} color={iconColor} strokeWidth={1.7} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{category.name}</Text>
            {note && (
              <View style={[styles.note, over ? { backgroundColor: brand.alert } : { borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[styles.noteText, { color: over ? brand.ink : colors.textSecondary }]}>{note}</Text>
              </View>
            )}
          </View>
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
          <CategorySparkline values={category.trend} color={colors.textPrimary} />
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
  container: { borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 80, paddingVertical: 8, gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  note: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1 },
  noteText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  trendWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  trendText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold', marginLeft: 2 },
});
