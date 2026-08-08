import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { TransactionEntryShell } from './TransactionEntryShell';
import { CategoryPickerSheet, PickableCategory } from './CategoryPickerSheet';
import { useSpecTheme } from '../../theme/specTheme';
import { Transaction } from '../../types/transaction';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { Money } from '../../utils/money';
import { Trash2, Tag } from 'lucide-react-native';

interface Props {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailSheet: React.FC<Props> = ({ visible, transaction, onClose, onSave, onDelete }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('');
  const [categoryColor, setCategoryColor] = useState<string | undefined>(undefined);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setAmountInput((transaction.amountPaise / 100).toString());
    setDescription(transaction.description ?? '');
    setCategoryId(transaction.categoryId);
    setCategoryName(transaction.category);
    setCategoryIcon(transaction.categoryIcon);
    setCategoryColor(transaction.categoryColor);
    setConfirmingDelete(false);
  }, [transaction]);

  if (!transaction) return null;

  const Icon = resolveCategoryIcon(categoryId ?? transaction.categoryId, categoryIcon);

  const handleSave = () => {
    onSave(transaction.id, {
      amountPaise: Money.toPaise(amountInput),
      description: description.trim() || undefined,
      category: categoryName,
      categoryId,
      categoryIcon,
      categoryColor,
    });
    onClose();
  };

  return (
    <>
      <TransactionEntryShell visible={visible} onClose={onClose} headerContext="Transaction Details">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.textPrimary }]}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, backgroundColor: colors.chipBg }]}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
          <Pressable
            testID="detail-category-btn"
            onPress={() => setShowCategoryPicker(true)}
            style={[styles.categoryRow, { backgroundColor: colors.chipBg }]}
          >
            <View style={[styles.categoryIconWrap, { backgroundColor: categoryColor || colors.card }]}>
              <Icon size={16} color={colors.textPrimary} />
            </View>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{categoryName}</Text>
            <Tag size={14} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="detail-save"
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: colors.primaryAccent, borderRadius: cardRadius }]}
          >
            <Text style={styles.saveText}>Save Changes</Text>
          </Pressable>

          {!confirmingDelete ? (
            <Pressable testID="detail-delete" onPress={() => setConfirmingDelete(true)} style={styles.deleteBtn}>
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Transaction</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmRow}>
              <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', flex: 1 }}>Delete this transaction?</Text>
              <Pressable testID="detail-delete-cancel" onPress={() => setConfirmingDelete(false)} style={{ paddingHorizontal: 12 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>Cancel</Text>
              </Pressable>
              <Pressable testID="detail-delete-confirm" onPress={() => onDelete(transaction.id)} style={{ paddingHorizontal: 12 }}>
                <Text style={{ color: colors.danger, fontFamily: 'Satoshi-Bold' }}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </TransactionEntryShell>

      <CategoryPickerSheet
        visible={showCategoryPicker}
        selectedCategoryId={categoryId}
        onSelect={cat => {
          setCategoryId(cat.id);
          setCategoryName(cat.name);
          setCategoryIcon(cat.icon);
          setCategoryColor(cat.color);
          setShowCategoryPicker(false);
        }}
        onClose={() => setShowCategoryPicker(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  field: { paddingHorizontal: 20, marginBottom: 20 },
  label: { fontSize: 12, fontFamily: 'Satoshi-Bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountInput: { fontSize: 32, fontFamily: 'Satoshi-Black' },
  textInput: { fontSize: 16, fontFamily: 'Satoshi-Medium', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 12, height: 48 },
  categoryIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryName: { flex: 1, fontSize: 15, fontFamily: 'Satoshi-Bold' },
  actions: { paddingHorizontal: 20, marginTop: 12, gap: 16 },
  saveBtn: { paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 15 },
  deleteBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  deleteText: { fontFamily: 'Satoshi-Bold', fontSize: 14 },
  confirmRow: { flexDirection: 'row', alignItems: 'center' },
});
