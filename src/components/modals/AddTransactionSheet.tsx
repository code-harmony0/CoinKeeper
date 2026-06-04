/**
 * AddTransactionSheet - Blob Theme
 * Organic bottom sheet for adding transactions
 */
import React, { useState, useEffect } from 'react';
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
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_SHADOWS, THEME_ANIMATION } from '../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Path } from 'react-native-svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialType?: 'expense' | 'income';
}

// Category data with SVG icons
const CATEGORIES = [
  { id: 'food', name: 'Food', color: '#FEF3E2', icon: 'food' },
  { id: 'transport', name: 'Transport', color: '#EFF6FF', icon: 'transport' },
  { id: 'shopping', name: 'Shopping', color: '#FDF2F8', icon: 'shopping' },
  { id: 'bills', name: 'Bills', color: '#FFFBEB', icon: 'bills' },
  { id: 'entertainment', name: 'Entertainment', color: '#F5F3FF', icon: 'entertainment' },
  { id: 'health', name: 'Health', color: '#ECFDF5', icon: 'health' },
  { id: 'salary', name: 'Salary', color: '#ECFDF5', icon: 'salary' },
  { id: 'other', name: 'Other', color: '#F1F5F9', icon: 'other' },
];

export const AddTransactionSheet: React.FC<AddTransactionSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialType = 'expense',
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, THEME_ANIMATION.spring);
      ReactNativeHapticFeedback.trigger('impactLight');
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 150 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible) {
      setType(initialType);
    }
  }, [visible, initialType]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const handleClose = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onClose();
  };

  const handleSubmit = () => {
    if (!amount || !selectedCategory) return;
    
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    
    onSubmit({
      amount: parseFloat(amount),
      type,
      category: category?.name || 'Other',
      categoryIcon: category?.icon || 'other',
      description,
    });

    // Reset
    setAmount('');
    setType(initialType);
    setSelectedCategory(null);
    setDescription('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <LinearGradient colors={['#FFFFFF', '#FAFBFD']} style={StyleSheet.absoluteFill} />
          
          <View style={styles.content}>
            {/* Handle + Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Add Transaction</Text>
                <Pressable onPress={handleClose} style={styles.closeBtn}>
                  <CloseIcon />
                </Pressable>
              </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.scrollWrapper}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
                
                {/* Type Toggle */}
                <View style={styles.typeToggle}>
                  <TypeButton label="Expense" active={type === 'expense'} onPress={() => setType('expense')} color="#FDF2F8" />
                  <TypeButton label="Income" active={type === 'income'} onPress={() => setType('income')} color="#ECFDF5" />
                </View>

                {/* Amount Input */}
                <View style={styles.amountSection}>
                  <Text style={styles.sectionLabel}>Amount</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amount}
                      onChangeText={text => setAmount(text.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Categories */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Category</Text>
                  <View style={styles.categoriesGrid}>
                    {CATEGORIES.filter(c => type === 'income' ? c.id === 'salary' || c.id === 'other' : c.id !== 'salary').map(cat => (
                      <CategoryChip
                        key={cat.id}
                        name={cat.name}
                        color={cat.color}
                        icon={cat.icon}
                        selected={selectedCategory === cat.id}
                        onPress={() => {
                          ReactNativeHapticFeedback.trigger('impactLight');
                          setSelectedCategory(cat.id);
                        }}
                      />
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Description (Optional)</Text>
                  <TextInput
                    style={styles.descInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add a note..."
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                </View>

                {/* Submit */}
                <SubmitButton
                  label="Add Transaction"
                  disabled={!amount || !selectedCategory}
                  onPress={handleSubmit}
                  type={type}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============================================
// COMPONENTS
// ============================================
const TypeButton: React.FC<{ label: string; active: boolean; onPress: () => void; color: string }> = ({ label, active, onPress, color }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, THEME_ANIMATION.spring) }] }));

  return (
    <Pressable onPress={onPress} onPressIn={() => { scale.value = 0.96; }} onPressOut={() => { scale.value = 1; }} style={styles.typeButtonWrapper}>
      <Animated.View style={[styles.typeButton, active && [styles.typeButtonActive, { backgroundColor: color }], anim]}>
        <Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const CategoryChip: React.FC<{ name: string; color: string; icon: string; selected: boolean; onPress: () => void }> = ({ name, color, selected, onPress }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, THEME_ANIMATION.spring) }] }));

  return (
    <Pressable onPress={onPress} onPressIn={() => { scale.value = 0.94; }} onPressOut={() => { scale.value = 1; }}>
      <Animated.View style={[styles.categoryChip, { backgroundColor: selected ? color : '#F1F5F9' }, selected && styles.categoryChipSelected, anim]}>
        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{name}</Text>
      </Animated.View>
    </Pressable>
  );
};

const SubmitButton: React.FC<{ label: string; disabled: boolean; onPress: () => void; type: 'expense' | 'income' }> = ({ label, disabled, onPress, type }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, THEME_ANIMATION.spring) }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { if (!disabled) scale.value = 0.97; }}
      onPressOut={() => { scale.value = 1; }}
      disabled={disabled}
    >
      <Animated.View style={[styles.submitButton, disabled && styles.submitButtonDisabled, anim]}>
        <LinearGradient
          colors={type === 'expense' ? ['#FDA4AF', '#FCA5A5'] : ['#6EE7B7', '#86EFAC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.submitButtonText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

// Icons
const CloseIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke="#475569" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    ...THEME_SHADOWS.elevated,
  },
  content: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  closeBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  scrollWrapper: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Type toggle
  typeToggle: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  typeButtonWrapper: { flex: 1 },
  typeButton: { paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#FFF' },
  typeButtonActive: { borderColor: 'transparent' },
  typeButtonText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  typeButtonTextActive: { color: '#1E293B' },

  // Amount
  amountSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 36, fontWeight: '600', color: '#1E293B', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 42, fontWeight: '300', color: '#1E293B', padding: 0 },

  // Categories
  section: { marginBottom: 24 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  categoryChipSelected: { borderWidth: 2, borderColor: '#1E293B' },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  categoryChipTextSelected: { color: '#1E293B' },

  // Description
  descInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '500', color: '#1E293B', minHeight: 80, textAlignVertical: 'top' },

  // Submit
  submitButton: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginTop: 8, ...THEME_SHADOWS.elevated },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
});

export default AddTransactionSheet;
