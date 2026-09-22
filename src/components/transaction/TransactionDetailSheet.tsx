import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Switch } from 'react-native';
import { TransactionEntryShell } from './TransactionEntryShell';
import { CategoryPickerSheet, PickableCategory } from './CategoryPickerSheet';
import { useSpecTheme } from '../../theme/specTheme';
import { Transaction } from '../../types/transaction';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { Money } from '../../utils/money';
import { Trash2, Tag, TrendingUp } from 'lucide-react-native';
import { transactionInsight } from '../../services/transactionInsight';

interface Props {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  /**
   * The full ledger, so this one transaction can be described in the context
   * of the pattern it belongs to. Optional: the sheet is fully usable without
   * it, it just has nothing to observe.
   */
  allTransactions?: Transaction[];
}

export const TransactionDetailSheet: React.FC<Props> = ({ visible, transaction, onClose, onSave, onDelete, allTransactions }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('');
  const [categoryColor, setCategoryColor] = useState<string | undefined>(undefined);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** Money the user expects back: lent out, or moved to an account of their own. */
  const [awaitingReturn, setAwaitingReturn] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setAmountInput((transaction.amountPaise / 100).toString());
    setDescription(transaction.description ?? '');
    setCategoryId(transaction.categoryId);
    setCategoryName(transaction.category);
    setCategoryIcon(transaction.categoryIcon);
    setCategoryColor(transaction.categoryColor);
    setConfirmingDelete(false);
    setAwaitingReturn(!!transaction.awaitingReturn);
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
      awaitingReturn,
    });
    onClose();
  };

  // Null unless this purchase is part of a real repeat — see transactionInsight,
  // which stays quiet rather than filling this slot on every row.
  const insight =
    transaction && allTransactions
      ? transactionInsight(transaction, allTransactions)
      : null;

  return (
    <>
      <TransactionEntryShell visible={visible} onClose={onClose} headerContext="Transaction Details">
        {insight && (
          <View style={[styles.insight, { backgroundColor: colors.chipBg }]}>
            <TrendingUp size={16} color={colors.textSecondary} strokeWidth={2.5} />
            <Text style={[styles.insightText, { color: colors.textPrimary }]}>
              {insight}
            </Text>
          </View>
        )}

        {/* Money lent to someone, or moved to another account of your own, is
            neither spending nor income — it is the same money passing through. */}
        <Pressable
          testID="detail-awaiting-return"
          onPress={() => setAwaitingReturn(value => !value)}
          style={[styles.returnToggle, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.returnLabel, { color: colors.textPrimary }]}>
              I'll get this back
            </Text>
            <Text style={[styles.returnHint, { color: colors.textSecondary }]}>
              Lent out, or sent to your own account. Kept out of income and expenses.
            </Text>
          </View>
          <Switch value={awaitingReturn} onValueChange={setAwaitingReturn} />
        </Pressable>

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
  returnToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  returnLabel: { fontSize: 15, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  returnHint: { fontSize: 12, fontFamily: 'Satoshi-Medium', lineHeight: 16 },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  insightText: { flex: 1, fontSize: 14, fontFamily: 'Satoshi-Medium', lineHeight: 19 },
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
