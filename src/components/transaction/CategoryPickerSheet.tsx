import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { getDb } from '../../store/database';
import { resolveCategoryIcon } from '../../utils/categoryIcon';

export interface PickableCategory {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

interface Props {
  visible: boolean;
  selectedCategoryId?: string;
  onSelect: (category: PickableCategory) => void;
  onClose: () => void;
}

export const CategoryPickerSheet: React.FC<Props> = ({ visible, selectedCategoryId, onSelect, onClose }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [categories, setCategories] = useState<PickableCategory[]>([]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const db = getDb();
      const res = await db.execute('SELECT id, name, icon, color FROM categories ORDER BY name ASC;');
      setCategories((res?.rows ?? []) as unknown as PickableCategory[]);
    };
    load();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="category-picker-backdrop" />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: cardRadius }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Choose a category</Text>
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          renderItem={({ item }) => {
            const Icon = resolveCategoryIcon(item.id, item.icon);
            const isSelected = item.id === selectedCategoryId;
            return (
              <Pressable
                testID={`category-option-${item.id}`}
                onPress={() => onSelect(item)}
                style={[styles.row, isSelected && { backgroundColor: colors.chipBg }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.color || colors.chipBg }]}>
                  <Icon size={18} color={colors.textPrimary} />
                </View>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '70%', padding: 24 },
  title: { fontSize: 18, fontFamily: 'Satoshi-Bold', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderRadius: 12, paddingHorizontal: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
});
