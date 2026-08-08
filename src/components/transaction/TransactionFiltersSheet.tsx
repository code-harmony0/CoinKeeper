import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSpecTheme } from '../../theme/specTheme';
import { AmountDateFilter } from '../../utils/transactionFilters';
import { Money } from '../../utils/money';

interface Props {
  visible: boolean;
  initialFilter: AmountDateFilter;
  onApply: (filter: AmountDateFilter) => void;
  onClose: () => void;
}

export const TransactionFiltersSheet: React.FC<Props> = ({ visible, initialFilter, onApply, onClose }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [minAmount, setMinAmount] = useState(initialFilter.minAmountPaise ? String(initialFilter.minAmountPaise / 100) : '');
  const [maxAmount, setMaxAmount] = useState(initialFilter.maxAmountPaise ? String(initialFilter.maxAmountPaise / 100) : '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(initialFilter.dateFromIso ? new Date(initialFilter.dateFromIso) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(initialFilter.dateToIso ? new Date(initialFilter.dateToIso) : undefined);

  const handleApply = () => {
    onApply({
      minAmountPaise: minAmount ? Money.toPaise(minAmount) : undefined,
      maxAmountPaise: maxAmount ? Money.toPaise(maxAmount) : undefined,
      dateFromIso: dateFrom?.toISOString(),
      dateToIso: dateTo?.toISOString(),
    });
    onClose();
  };

  const handleClear = () => {
    setMinAmount('');
    setMaxAmount('');
    setDateFrom(undefined);
    setDateTo(undefined);
    onApply({});
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="filters-backdrop" />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: cardRadius }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Filter Transactions</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
        <View style={styles.row}>
          <TextInput
            testID="filter-min-amount"
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg }]}
            placeholder="Min ₹"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            value={minAmount}
            onChangeText={setMinAmount}
          />
          <TextInput
            testID="filter-max-amount"
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg }]}
            placeholder="Max ₹"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            value={maxAmount}
            onChangeText={setMaxAmount}
          />
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Date Range</Text>
        <View style={styles.row}>
          <DateTimePicker
            testID="filter-date-from"
            value={dateFrom ?? new Date()}
            mode="date"
            onChange={(_, d) => d && setDateFrom(d)}
          />
          <DateTimePicker
            testID="filter-date-to"
            value={dateTo ?? new Date()}
            mode="date"
            onChange={(_, d) => d && setDateTo(d)}
          />
        </View>

        <View style={styles.actions}>
          <Pressable testID="filters-clear" onPress={handleClear} style={styles.clearBtn}>
            <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>Clear</Text>
          </Pressable>
          <Pressable
            testID="filters-apply"
            onPress={handleApply}
            style={[styles.applyBtn, { backgroundColor: colors.primaryAccent, borderRadius: cardRadius }]}
          >
            <Text style={{ color: '#fff', fontFamily: 'Satoshi-Bold' }}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 18, fontFamily: 'Satoshi-Bold', marginBottom: 16 },
  label: { fontSize: 12, fontFamily: 'Satoshi-Bold', marginBottom: 8, marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, height: 44, fontFamily: 'Satoshi-Medium' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  clearBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});
