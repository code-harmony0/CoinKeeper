import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../../components/anim';
import { getDb } from '../../store/database';

type Props = NativeStackScreenProps<any, 'Categories'>;

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  usageCount: number;
}

export const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useSpecTheme();
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
        renderItem={({ item }) => (
          <View style={styles.row}>
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
              <Trash2 size={18} color={colors.danger} strokeWidth={2} />
            </PressableScale>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 24, fontFamily: 'Satoshi-Black' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  rowMeta: { fontSize: 12, fontFamily: 'Satoshi-Regular', marginTop: 2 },
  deleteButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

export default CategoriesScreen;
