import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CategoryData } from '../../types/category';
import { useCategoryIntelligence } from '../../hooks/useCategoryIntelligence';
import { mergeCategories } from '../../services/categoryMergeService';
import { getDb } from '../../store/database';
import { CategoryHealthSummary } from './CategoryHealthSummary';
import { CategoryAttentionBanner } from './CategoryAttentionBanner';
import { CategoryCard } from './CategoryCard';
import { AddCategorySheet } from '../modals/AddCategorySheet';

interface Props {
  onGoBack: () => void;
}

type SortBy = 'name' | 'spend' | 'usage';

export const CategoryIntelligenceShell: React.FC<Props> = ({ onGoBack }) => {
  const insets = useSafeAreaInsets();
  const { colors, inputRadius, chipRadius } = useSpecTheme();
  const { categories, mergeSuggestions, reload } = useCategoryIntelligence();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('spend');

  const mergeSuggestionByCategoryId = useMemo(() => {
    const map = new Map<string, (typeof mergeSuggestions)[number]>();
    mergeSuggestions.forEach(s => map.set(s.categoryId, s));
    return map;
  }, [mergeSuggestions]);

  const filteredAndSorted = useMemo(() => {
    let result = categories;
    if (searchQuery) {
      result = result.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'spend') return b.monthlySpend - a.monthlySpend;
      if (sortBy === 'usage') return b.usageCount - a.usageCount;
      return a.name.localeCompare(b.name);
    });
  }, [categories, searchQuery, sortBy]);

  const toggleSort = () => {
    setSortBy(prev => (prev === 'spend' ? 'usage' : prev === 'usage' ? 'name' : 'spend'));
  };

  const handleEdit = (category: CategoryData) => {
    setEditingCategory(category);
    setSheetVisible(true);
  };

  const handleMerge = (category: CategoryData) => {
    const suggestion = mergeSuggestionByCategoryId.get(category.id);
    if (!suggestion) {
      Alert.alert('No merge suggestion', 'This category has no detected duplicate right now.');
      return;
    }
    // The expanded card's own CategoryMergeSuggestion already shows a one-tap
    // confirm — this handler backs the action-row "Merge" button as a shortcut
    // into the same expanded state a user would already be looking at.
  };

  const handleMergeConfirm = async (sourceId: string, targetId: string) => {
    try {
      await mergeCategories(sourceId, targetId);
      await reload();
    } catch (e) {
      Alert.alert('Merge failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    if (category.usageCount > 0) {
      Alert.alert('Category in use', `Reassign ${category.usageCount} transaction(s) first before deleting.`);
      return;
    }

    Alert.alert('Delete Category', `Are you sure you want to delete ${category.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const db = getDb();
          await db.execute('DELETE FROM categories WHERE id = ?;', [id]);
          await reload();
        },
      },
    ]);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setEditingCategory(undefined);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <PressableScale onPress={onGoBack} style={[styles.backButton, { backgroundColor: colors.chipBg }]}>
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Intelligence</Text>
        </View>

        <PressableScale onPress={() => setSheetVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primaryAccent }]}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </PressableScale>
      </View>

      <CategoryHealthSummary categories={categories} />

      <CategoryAttentionBanner
        categories={categories}
        mergeSuggestions={mergeSuggestions}
        onReviewMerge={() => {
          // Attention banner is a nudge, not a navigation target in v1 — the
          // merge suggestion itself lives inside each affected category's
          // expanded card, which the user reaches by tapping that card.
        }}
      />

      <View style={styles.toolsRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.chipBg, borderRadius: inputRadius }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search categories..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={toggleSort} style={[styles.sortBtn, { backgroundColor: colors.chipBg, borderRadius: chipRadius }]}>
          <SlidersHorizontal size={18} color={colors.textPrimary} />
          <Text style={[styles.sortText, { color: colors.textPrimary }]}>{sortBy}</Text>
        </TouchableOpacity>
      </View>

      <FlashList
        data={filteredAndSorted}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32, paddingTop: 16 }}
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            mergeSuggestion={mergeSuggestionByCategoryId.get(item.id)}
            onEdit={handleEdit}
            onMerge={handleMerge}
            onMergeConfirm={handleMergeConfirm}
            onDelete={handleDelete}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <AddCategorySheet visible={sheetVisible} onClose={closeSheet} onSuccess={reload} editing={editingCategory} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black', letterSpacing: -0.5 },
  toolsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, fontFamily: 'Satoshi-Medium' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 48, gap: 8 },
  sortText: { fontSize: 13, fontFamily: 'Satoshi-Bold', textTransform: 'capitalize' },
});
