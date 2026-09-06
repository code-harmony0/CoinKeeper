import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSpecTheme } from '../../theme/specTheme';
import {
  AmountDateFilter,
  normalizeFilter,
  describeFilter,
} from '../../utils/transactionFilters';
import { Money } from '../../utils/money';

const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * A date bound that can also be un-set.
 *
 * Without the clear affordance a date range was a one-way door: once a bound
 * was picked the only escape was Clear, which threw away the amount filter
 * too. Each bound now owns its own removal.
 */
const DateField: React.FC<{
  testID: string;
  label: string;
  value?: Date;
  onPress: () => void;
  onClear: () => void;
  colors: { inputBg: string; textPrimary: string; textSecondary: string };
}> = ({ testID, label, value, onPress, onClear, colors }) => (
  <View style={[styles.input, styles.dateField, { backgroundColor: colors.inputBg }]}>
    <Pressable testID={testID} onPress={onPress} style={styles.datePress}>
      <Text style={{ color: value ? colors.textPrimary : colors.textSecondary }}>
        {value ? formatDate(value) : label}
      </Text>
    </Pressable>
    {value ? (
      <Pressable
        testID={`${testID}-clear`}
        onPress={onClear}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Clear ${label} date`}
      >
        <X size={14} color={colors.textSecondary} strokeWidth={2.4} />
      </Pressable>
    ) : null}
  </View>
);

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
  /** Which date field's picker is open, or null for none. */
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  // Captured once per render rather than per press, so both bounds agree.
  const today = new Date();

  const draft: AmountDateFilter = {
    minAmountPaise: minAmount ? Money.toPaise(minAmount) : undefined,
    maxAmountPaise: maxAmount ? Money.toPaise(maxAmount) : undefined,
    dateFromIso: dateFrom?.toISOString(),
    dateToIso: dateTo?.toISOString(),
  };

  // Shown live so the user can see what the filter will actually do before
  // committing to it — an inverted range is corrected in the preview rather
  // than silently returning an empty list after Apply.
  const summary = describeFilter(normalizeFilter(draft), p =>
    Money.format(p, { zeroDecimals: true }),
  );

  const handleApply = () => {
    onApply(normalizeFilter(draft));
    onClose();
  };

  const handleClear = () => {
    setPicker(null);
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
          <DateField
            testID="filter-date-from"
            label="From"
            value={dateFrom}
            onPress={() => setPicker('from')}
            onClear={() => setDateFrom(undefined)}
            colors={colors}
          />
          <DateField
            testID="filter-date-to"
            label="To"
            value={dateTo}
            onPress={() => setPicker('to')}
            onClear={() => setDateTo(undefined)}
            colors={colors}
          />
        </View>

        {/* Mounted only while open, and unmounted on ANY event.
​
            On Android DateTimePicker is not an inline control — mounting it
            opens a modal dialog immediately. Both pickers used to be rendered
            unconditionally, so the dialog fired the instant this sheet opened
            and dismissing it simply re-mounted and re-opened it: the calendar
            could not be closed at all.
​
            `event.type` is 'dismissed' when the user cancels or presses back,
            so closing has to happen for every event, not just when a date is
            actually picked. */}
        {picker !== null && (
          <DateTimePicker
            value={(picker === 'from' ? dateFrom : dateTo) ?? new Date()}
            mode="date"
            /* Two bounds, both preventing an unreachable-by-design state.
​
               No future dates: this filters money that has already been spent,
               so tomorrow can only ever match nothing. Offering a date that
               cannot return a result is the calendar inviting the user into a
               dead end.
​
               And bounding the two fields against each other makes an inverted
               range impossible to enter, which beats reporting it afterwards. */
            maximumDate={
              picker === 'from' && dateTo && dateTo < today ? dateTo : today
            }
            minimumDate={picker === 'to' ? dateFrom : undefined}
            onChange={(event, selected) => {
              setPicker(null);
              if (event.type !== 'set' || !selected) return;
              if (picker === 'from') setDateFrom(selected);
              else setDateTo(selected);
            }}
          />
        )}

        {summary ? (
          <Text testID="filters-summary" style={[styles.summary, { color: colors.textSecondary }]}>
            Showing {summary}
          </Text>
        ) : null}

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
  // justifyContent centres the label in the date Pressables, which are
  // views rather than TextInputs; it is inert on the amount inputs.
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, height: 44, justifyContent: 'center', fontFamily: 'Satoshi-Medium' },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePress: { flex: 1, justifyContent: 'center', height: '100%' },
  summary: { fontSize: 13, fontFamily: 'Satoshi-Medium', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  clearBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});
