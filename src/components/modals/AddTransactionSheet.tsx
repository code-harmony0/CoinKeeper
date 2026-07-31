/**
 * AddTransactionSheet - Spec Theme
 * Bottom sheet for adding a transaction (expense or income)
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { PaymentMethodSelector, PaymentMethod } from '../transaction/PaymentMethodSelector';
import { suggestCategoryForMerchant, recordMerchantCategory } from '../../services/categorizationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SHEET_SPRING = { damping: 15, stiffness: 300 };

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialType?: 'expense' | 'income';
}

const CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'food' },
  { id: 'transport', name: 'Transport', icon: 'transport' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping' },
  { id: 'bills', name: 'Bills', icon: 'bills' },
  { id: 'entertainment', name: 'Entertainment', icon: 'entertainment' },
  { id: 'health', name: 'Health', icon: 'health' },
  { id: 'other', name: 'Other', icon: 'other' },
];

export const AddTransactionSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  initialType = 'expense',
}) => {
  const insets = useSafeAreaInsets();
  const { colors, spring: springConfig } = useSpecTheme();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!description.trim()) return;
    const handle = setTimeout(async () => {
      const match = await suggestCategoryForMerchant(description.trim());
      if (match) {
        setSelectedCategory(match.id);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [description]);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SHEET_SPRING);
      setType(initialType);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT, SHEET_SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backdropOpacity.value,
      [0, 1],
      ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.4)'],
    ),
  }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const handleClose = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onClose();
  };

  const handleTypeSwitch = (next: 'expense' | 'income') => {
    if (next === type) return;
    ReactNativeHapticFeedback.trigger('impactLight');
    setType(next);
  };

  const handleSelectCategory = (id: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setSelectedCategory(id);
  };

  const handleSubmit = () => {
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!selectedCategory) return;
    if (type === 'expense' && occurredAt.getTime() > Date.now()) {
      setError('Expenses cannot be dated in the future.');
      return;
    }

    ReactNativeHapticFeedback.trigger('notificationSuccess');
    const category = CATEGORIES.find(c => c.id === selectedCategory);

    onSubmit({
      amount: parseFloat(amount),
      type,
      category: category?.name || 'Other',
      categoryIcon: category?.icon || 'other',
      description,
      paymentMethod,
      occurredAt: occurredAt.toISOString(),
    });

    if (description.trim() && category) {
      recordMerchantCategory(description.trim(), category.id);
    }

    setAmount('');
    setType(initialType);
    setSelectedCategory(null);
    setDescription('');
    setOccurredAt(new Date());
    setPaymentMethod('cash');
    onClose();
  };

  const isDisabled = !amount || !selectedCategory;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.chipBg }]} />

          <PressableScale onPress={handleClose} style={styles.closeBtn} haptic="none">
            <X size={22} color={colors.textSecondary} />
          </PressableScale>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <TypeToggle
                type={type}
                onChange={handleTypeSwitch}
                colors={colors}
                spring={springConfig}
              />

              <View style={styles.amountSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Amount</Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, { color: colors.textPrimary }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    value={amount}
                    onChangeText={text => setAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {CATEGORIES.map(cat => (
                    <CategoryChip
                      key={cat.id}
                      name={cat.name}
                      selected={selectedCategory === cat.id}
                      onPress={() => handleSelectCategory(cat.id)}
                      colors={colors}
                      spring={springConfig}
                    />
                  ))}
                </ScrollView>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Date</Text>
                <View style={[styles.dateRow, { backgroundColor: colors.inputBg }]}>
                  <DateTimePicker
                    testID="date-picker"
                    value={occurredAt}
                    mode="date"
                    display="default"
                    maximumDate={type === 'expense' ? new Date() : undefined}
                    onChange={(_, date) => {
                      if (date) setOccurredAt(date);
                    }}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Payment Method
                </Text>
                <PaymentMethodSelector selectedMethod={paymentMethod} onSelectMethod={setPaymentMethod} />
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Description (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.descInput,
                    { backgroundColor: colors.inputBg, color: colors.textPrimary },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              {error && (
                <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{error}</Text>
              )}

              <SubmitButton
                label={type === 'expense' ? 'Add Expense' : 'Add Income'}
                disabled={isDisabled}
                onPress={handleSubmit}
                colors={colors}
                spring={springConfig}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============================================
// COMPONENTS
// ============================================
type ThemeColors = ReturnType<typeof useSpecTheme>['colors'];
type SpringConfig = ReturnType<typeof useSpecTheme>['spring'];

const TypeToggle: React.FC<{
  type: 'expense' | 'income';
  onChange: (t: 'expense' | 'income') => void;
  colors: ThemeColors;
  spring: SpringConfig;
}> = ({ type, onChange, colors, spring }) => {
  const progress = useDerivedValue(() => withSpring(type === 'income' ? 1 : 0, spring), [type]);

  const expenseStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.expenseTint, colors.card],
    ),
    borderColor: type === 'expense' ? 'transparent' : colors.chipBg,
  }));

  const incomeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.card, colors.incomeTint],
    ),
    borderColor: type === 'income' ? 'transparent' : colors.chipBg,
  }));

  return (
    <View style={styles.typeToggle}>
      <PressableScale style={styles.typeButtonWrapper} onPress={() => onChange('expense')} haptic="none">
        <Animated.View style={[styles.typeButton, expenseStyle]}>
          <Text style={[styles.typeButtonText, { color: type === 'expense' ? colors.danger : colors.textSecondary }]}>
            Expense
          </Text>
        </Animated.View>
      </PressableScale>
      <PressableScale style={styles.typeButtonWrapper} onPress={() => onChange('income')} haptic="none">
        <Animated.View style={[styles.typeButton, incomeStyle]}>
          <Text style={[styles.typeButtonText, { color: type === 'income' ? colors.success : colors.textSecondary }]}>
            Income
          </Text>
        </Animated.View>
      </PressableScale>
    </View>
  );
};

const CategoryChip: React.FC<{
  name: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
  spring: SpringConfig;
}> = ({ name, selected, onPress, colors }) => {
  return (
    <PressableScale onPress={onPress} haptic="none">
      <View
        style={[
          styles.categoryChip,
          { backgroundColor: selected ? colors.primaryAccent : colors.chipBg },
        ]}
      >
        <Text style={[styles.categoryChipText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>
          {name}
        </Text>
      </View>
    </PressableScale>
  );
};

const SubmitButton: React.FC<{
  label: string;
  disabled: boolean;
  onPress: () => void;
  colors: ThemeColors;
  spring: SpringConfig;
}> = ({ label, disabled, onPress, colors }) => {
  return (
    <PressableScale onPress={onPress} disabled={disabled} haptic="none">
      <View
        style={[
          styles.submitButton,
          { backgroundColor: colors.primaryAccent },
          disabled && styles.submitButtonDisabled,
        ]}
      >
        <Text style={styles.submitButtonText}>{label}</Text>
      </View>
    </PressableScale>
  );
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 1,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingTop: 16, paddingBottom: 8 },

  // Type toggle
  typeToggle: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  typeButtonWrapper: { flex: 1 },
  typeButton: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: { fontSize: 15, fontFamily: 'Satoshi-Bold' },

  // Amount
  amountSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontFamily: 'Satoshi-Medium', marginBottom: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 36, fontFamily: 'Satoshi-Black', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 42, fontFamily: 'Satoshi-Regular', padding: 0 },

  // Categories
  section: { marginBottom: 24 },
  chipsRow: { flexDirection: 'row', gap: 10, paddingRight: 4 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  categoryChipText: { fontSize: 14, fontFamily: 'Satoshi-Medium' },

  // Date
  dateRow: { borderRadius: 16, paddingHorizontal: 8, alignItems: 'flex-start' },

  // Description
  descInput: { borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Satoshi-Medium', minHeight: 80, textAlignVertical: 'top' },

  // Submit
  submitButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold', color: '#FFFFFF' },
});

export default AddTransactionSheet;
