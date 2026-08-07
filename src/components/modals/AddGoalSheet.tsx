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
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Target } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_SPRING = { damping: 15, stiffness: 300 };

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, targetAmount: string, deadline?: string) => Promise<void>;
}

export const AddGoalSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useSpecTheme();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!name || !target) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(name, target, deadline ? deadline.toISOString() : undefined);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      setName('');
      setTarget('');
      setDeadline(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !name || !target || isSubmitting;

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
              
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Goal</Text>
              
              <View style={styles.amountSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Target Amount</Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, { color: colors.textPrimary }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    value={target}
                    onChangeText={text => setTarget(text.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Goal Name</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                  <Target size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. New Car"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <PressableScale onPress={() => setShowPicker(true)} style={[styles.deadlineRow, { backgroundColor: colors.inputBg, borderRadius: 16 }]}>
                <Text style={{ color: deadline ? colors.textPrimary : colors.textSecondary, fontFamily: 'Satoshi-Medium', fontSize: 15 }}>
                  {deadline ? deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Set a deadline (optional)'}
                </Text>
              </PressableScale>
              {showPicker && (
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_event, selectedDate) => {
                    setShowPicker(false);
                    if (selectedDate) setDeadline(selectedDate);
                  }}
                />
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
                  <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : 'Save Goal'}</Text>
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
  section: { marginBottom: 24 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
  },

  deadlineRow: { paddingHorizontal: 16, paddingVertical: 14, marginTop: 12 },

  // Submit
  submitButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold', color: '#FFFFFF' },
});
