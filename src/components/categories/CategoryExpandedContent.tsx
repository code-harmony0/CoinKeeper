import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { CategoryData, MergeSuggestion } from '../../types/category';
import { CategoryTopMerchants } from './CategoryTopMerchants';
import { CategoryActionRow } from './CategoryActionRow';
import { CategoryMergeSuggestion } from './CategoryMergeSuggestion';
import { CategoryCleanupCTA } from './CategoryCleanupCTA';

interface Props {
  category: CategoryData;
  mergeSuggestion?: MergeSuggestion;
  onEdit: () => void;
  onMerge: () => void;
  onMergeConfirm: () => void;
  onDelete: () => void;
}

export const CategoryExpandedContent: React.FC<Props> = ({
  category,
  mergeSuggestion,
  onEdit,
  onMerge,
  onMergeConfirm,
  onDelete,
}) => {
  const { colors } = useSpecTheme();

  const impact =
    category.trailingAverageSpend > 0
      ? (category.monthlySpend / category.trailingAverageSpend) * 100
      : category.monthlySpend > 0
        ? 100
        : 0;
  const isOver = category.health === 'over_budget';

  return (
    <View style={styles.body}>
      {category.usageCount > 0 && (
        <View style={styles.budgetRow}>
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetFill,
                { width: `${Math.min(impact, 100)}%`, backgroundColor: isOver ? colors.danger : colors.primaryAccent },
              ]}
            />
          </View>
          <Text style={[styles.budgetVal, { color: isOver ? colors.danger : colors.textSecondary }]}>
            {Math.round(impact)}% of usual
          </Text>
        </View>
      )}

      {mergeSuggestion && (
        <CategoryMergeSuggestion suggestedWithName={mergeSuggestion.suggestedWithName} onConfirm={onMergeConfirm} />
      )}

      {category.isUnused && <CategoryCleanupCTA onDelete={onDelete} />}

      <CategoryTopMerchants merchants={category.topMerchants} />

      <CategoryActionRow onEdit={onEdit} onMerge={onMerge} onDelete={onDelete} deleteTestID={`delete-category-${category.id}`} />
    </View>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 12 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  budgetBar: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
  budgetVal: { fontSize: 12, fontFamily: 'Satoshi-Bold' },
});
