import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Search, SlidersHorizontal, AlertTriangle } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../../components/anim';
import { getDb } from '../../store/database';
import { ExpandableCategoryRow } from '../../components/budget/ExpandableCategoryRow';
import { AddCategorySheet } from '../../components/modals/AddCategorySheet';

type Props = NativeStackScreenProps<any, 'Categories'>;

export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  color?: string;
  usageCount: number;
  monthlySpend: number;
  topMerchants: string[];
  isUnused: boolean;
}

export const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'spend' | 'usage'>('spend');

  const load = useCallback(async () => {
    const db = getDb();
    
    // Core aggregation: get categories, usage count, and recent spend
    const result = await db.execute(`
      SELECT 
        c.id, 
        c.name, 
        c.icon,
        COUNT(t.id) as usageCount,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount_paise ELSE 0 END) as totalSpend
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name;
    `);

    const rawRows = (result?.rows ?? []) as any[];
    
    // For each category, fetch top 3 merchants
    const enrichedData = await Promise.all(rawRows.map(async (row) => {
      const topMerchantsRes = await db.execute(`
        SELECT description, COUNT(*) as c 
        FROM transactions 
        WHERE category_id = ? AND description IS NOT NULL AND description != ''
        GROUP BY description 
        ORDER BY c DESC 
        LIMIT 3
      `, [row.id]);
      
      const merchants = ((topMerchantsRes?.rows ?? []) as any[]).map(m => m.description);
      
      return {
        id: row.id,
        name: row.name,
        icon: row.icon || 'MoreHorizontal',
        usageCount: row.usageCount,
        monthlySpend: (row.totalSpend || 0) / 100,
        topMerchants: merchants,
        isUnused: row.usageCount === 0
      };
    }));

    setCategories(enrichedData);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    if (category.usageCount > 0) {
      Alert.alert('Category in use', `Reassign ${category.usageCount} transaction(s) first before deleting.`);
      return;
    }
    
    Alert.alert('Delete Category', `Are you sure you want to delete ${category.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const db = getDb();
        await db.execute('DELETE FROM categories WHERE id = ?;', [id]);
        await load();
      }}
    ]);
  };
  
  const handleEdit = (id: string) => {
    Alert.alert('Edit Category', 'Edit modal would open here to rename or change icon/color.');
  };

  const handleMerge = (id: string) => {
    Alert.alert('Merge Category', 'Merge modal would open here to merge with another category.');
  };

  const filteredAndSorted = useMemo(() => {
    let result = categories;
    if (searchQuery) {
      result = result.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return result.sort((a, b) => {
      if (sortBy === 'spend') return b.monthlySpend - a.monthlySpend;
      if (sortBy === 'usage') return b.usageCount - a.usageCount;
      return a.name.localeCompare(b.name);
    });
  }, [categories, searchQuery, sortBy]);

  const toggleSort = () => {
    setSortBy(prev => prev === 'spend' ? 'usage' : prev === 'usage' ? 'name' : 'spend');
  };

  const unusedCount = categories.filter(c => c.isUnused).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <PressableScale onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.chipBg }]}>
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Intelligence</Text>
        </View>
        
        <PressableScale onPress={() => setSheetVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primaryAccent }]}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </PressableScale>
      </View>

      <View style={styles.toolsRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search categories..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={toggleSort} style={[styles.sortBtn, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
          <SlidersHorizontal size={18} color={colors.textPrimary} />
          <Text style={[styles.sortText, { color: colors.textPrimary }]}>{sortBy}</Text>
        </TouchableOpacity>
      </View>

      {unusedCount > 0 && !searchQuery && (
        <View style={[styles.unusedWarning, { backgroundColor: '#F59E0B15', borderRadius: cardRadius }]}>
          <AlertTriangle size={20} color="#F59E0B" />
          <View style={styles.unusedInfo}>
            <Text style={[styles.unusedTitle, { color: '#F59E0B' }]}>{unusedCount} Unused Categories</Text>
            <Text style={[styles.unusedSub, { color: colors.textSecondary }]}>Clean them up to keep your intelligence model accurate.</Text>
          </View>
        </View>
      )}

      <FlatList
        data={filteredAndSorted}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32, paddingTop: 16 }}
        renderItem={({ item }) => (
          <ExpandableCategoryRow 
            category={item} 
            onDelete={handleDelete} 
            onEdit={handleEdit}
            onMerge={handleMerge}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <AddCategorySheet 
        visible={sheetVisible} 
        onClose={() => setSheetVisible(false)} 
        onSuccess={load} 
      />
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
  
  unusedWarning: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 24, marginTop: 12, gap: 12 },
  unusedInfo: { flex: 1 },
  unusedTitle: { fontSize: 14, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  unusedSub: { fontSize: 13, fontFamily: 'Satoshi-Medium', lineHeight: 18 },
});

export default CategoriesScreen;
