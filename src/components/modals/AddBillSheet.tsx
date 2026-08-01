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
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar, Edit3, ChevronDown, ChevronUp, Repeat, Bell, FileText, Zap } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_SPRING = { damping: 15, stiffness: 300 };

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; amount: string; dueDay: string; isRecurring: boolean; repeatInterval?: string; reminderDaysBefore?: number; notes?: string; autoPayEnabled?: boolean; }) => Promise<void>;
}

export const AddBillSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useSpecTheme();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Advanced Settings State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRecurring, setIsRecurring] = useState(true);
  const [repeatInterval, setRepeatInterval] = useState('Monthly');
  const [reminder, setReminder] = useState(3);
  const [notes, setNotes] = useState('');
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);

  // Smart Detection
  const isSub = (n: string) => {
    const txt = n.toLowerCase();
    return txt.includes('netflix') || txt.includes('spotify') || txt.includes('prime') || txt.includes('gym') || txt.includes('apple') || txt.includes('icloud');
  };
  const detectedCategory = name.length > 2 ? (isSub(name) ? 'Subscription' : 'Utility') : null;

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SHEET_SPRING);
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

  const handleSubmit = async () => {
    if (!name || !amount || !dueDay) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        amount,
        dueDay,
        isRecurring,
        repeatInterval: isRecurring ? repeatInterval : undefined,
        reminderDaysBefore: reminder,
        notes,
        autoPayEnabled,
      });
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      setName('');
      setAmount('');
      setDueDay('');
      setShowAdvanced(false);
      setIsRecurring(true);
      setRepeatInterval('Monthly');
      setReminder(3);
      setNotes('');
      setAutoPayEnabled(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !name || !amount || !dueDay || isSubmitting;

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
              
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Bill</Text>
              
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

              <View style={styles.formGrid}>
                <View style={[styles.section, { flex: 2 }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Bill Name</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <Edit3 size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Electricity"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  {detectedCategory && (
                    <Text style={{ fontSize: 11, fontFamily: 'Satoshi-Bold', color: colors.primaryAccent, marginTop: 4, marginLeft: 4 }}>
                      Auto-detected as {detectedCategory}
                    </Text>
                  )}
                </View>

                <View style={[styles.section, { flex: 1, marginLeft: 12 }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Due Day</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <Calendar size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={dueDay}
                      onChangeText={text => setDueDay(text.replace(/[^0-9]/g, ''))}
                      placeholder="1-31"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.advancedToggle} 
                activeOpacity={0.7}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('selection');
                  setShowAdvanced(!showAdvanced);
                }}
              >
                <Text style={[styles.advancedText, { color: colors.primaryAccent }]}>Advanced Settings</Text>
                {showAdvanced ? <ChevronUp size={16} color={colors.primaryAccent} /> : <ChevronDown size={16} color={colors.primaryAccent} />}
              </TouchableOpacity>

              {showAdvanced && (
                <View style={[styles.advancedContainer, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                  {/* Recurring Toggle */}
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIconBox, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                        <Repeat size={16} color={colors.primaryAccent} />
                      </View>
                      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Recurring Bill</Text>
                    </View>
                    <Switch 
                      value={isRecurring} 
                      onValueChange={setIsRecurring}
                      trackColor={{ false: colors.border, true: colors.primaryAccent }}
                      style={{ transform: [{ scale: 0.8 }] }}
                    />
                  </View>

                  {/* Auto Pay Toggle */}
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIconBox, { backgroundColor: 'rgba(255, 204, 0, 0.1)' }]}>
                        <Zap size={16} color="#FFCC00" />
                      </View>
                      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Auto-Pay</Text>
                    </View>
                    <Switch 
                      value={autoPayEnabled} 
                      onValueChange={setAutoPayEnabled}
                      trackColor={{ false: colors.border, true: colors.primaryAccent }}
                      style={{ transform: [{ scale: 0.8 }] }}
                    />
                  </View>

                  {/* Notes */}
                  <View style={[styles.settingRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIconBox, { backgroundColor: colors.chipBg }]}>
                        <FileText size={16} color={colors.textSecondary} />
                      </View>
                      <TextInput
                        style={[styles.settingInput, { color: colors.textPrimary }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add notes..."
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                </View>
              )}

              <PressableScale 
                onPress={handleSubmit} 
                disabled={isDisabled} 
                haptic="none"
              >
                <View
                  style={[
                    styles.submitButton,
                    { backgroundColor: colors.primaryAccent },
                    isDisabled && styles.submitButtonDisabled,
                  ]}
                >
                  <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : 'Save Bill'}</Text>
                </View>
              </PressableScale>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

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
    paddingHorizontal: 24,
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
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Satoshi-Bold',
    marginBottom: 24,
  },

  // Amount
  amountSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontFamily: 'Satoshi-Medium', marginBottom: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 36, fontFamily: 'Satoshi-Black', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 42, fontFamily: 'Satoshi-Regular', padding: 0 },

  // Standard inputs
  formGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  section: { flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Satoshi-Medium',
  },

  // Advanced Settings
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  advancedText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    marginRight: 4,
  },
  advancedContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  settingInput: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    padding: 0,
  },

  // Submit
  submitButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold', color: '#FFFFFF' },
});
