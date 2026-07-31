import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  Wallet,
  MoreHorizontal,
} from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../../components/anim';
import { getDb } from '../../store/database';

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  food: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  bills: Receipt,
  entertainment: Film,
  health: HeartPulse,
  salary: Wallet,
  other: MoreHorizontal,
};

type Props = NativeStackScreenProps<any, 'Categories'>;

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  usageCount: number;
}

export const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, iconShadow, cardRadius } = useSpecTheme();
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const load = useCallback(async () => {
    const db = getDb();
    const result = await db.execute(`
      SELECT c.id, c.name, c.icon, COUNT(t.id) AS usageCount
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name;
    `);
    setCategories(((result?.rows ?? []) as unknown) as CategoryRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (category: CategoryRow) => {
    if (category.usageCount > 0) {
      Alert.alert('Category in use', `${category.usageCount} transaction(s) use this category. Reassign them first.`);
      return;
    }
    const db = getDb();
    await db.execute('DELETE FROM categories WHERE id = ?;', [category.id]);
    await load();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <PressableScale onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.chipBg }]}>
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Categories</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const Icon = CATEGORY_ICONS[item.icon?.toLowerCase()] || MoreHorizontal;
          
          return (
            <View style={[styles.row, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.background }, iconShadow]}>
                <Icon size={20} color={colors.textPrimary} strokeWidth={2} />
              </View>
              
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {item.usageCount} transaction{item.usageCount === 1 ? '' : 's'}
                </Text>
              </View>
              
              <PressableScale
                testID={`delete-category-${item.id}`}
                onPress={() => handleDelete(item)}
                style={styles.deleteButton}
              >
                <Trash2 size={20} color={colors.danger} strokeWidth={2} />
              </PressableScale>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black', letterSpacing: -0.5 },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowInfo: { flex: 1, justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  rowMeta: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default CategoriesScreen;
