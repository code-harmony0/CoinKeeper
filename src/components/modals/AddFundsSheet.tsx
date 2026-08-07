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
import { X } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { Goal } from '../../store/goalStore';
import { GoalHealth, checkAffordability, simulateWhatIf } from '../../services/goalIntelligence';
import { Money } from '../../utils/money';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_SPRING = { damping: 15, stiffness: 300 };

interface Props {
  visible: boolean;
  goalName?: string;
  goal?: Goal;
  health?: GoalHealth;
  savingsBudgetRemainingPaise?: number;
  onClose: () => void;
  onSubmit: (amount: string) => Promise<void>;
}

export const AddFundsSheet: React.FC<Props> = ({
  visible,
  goalName,
  goal,
  health,
  savingsBudgetRemainingPaise,
  onClose,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useSpecTheme();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountPaise = Money.toPaise(amount || '0');
  // NOTE: savingsBudgetRemainingPaise (from useGoalIntelligence) is already net
  // of this month's contributions, so monthlyContributedSoFarPaise is 0 here —
  // passing a non-zero value would double-subtract. See task notes.
  const affordability = goal && health && savingsBudgetRemainingPaise !== undefined
    ? checkAffordability(amountPaise, 0, savingsBudgetRemainingPaise)
    : null;

  const whatIfChips = [50000, 100000, 200000]; // ₹500 / ₹1,000 / ₹2,000, in paise

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
    if (!amount) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(amount);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      setAmount('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !amount || isSubmitting;

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
              
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Funds</Text>
              {goalName && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>to {goalName}</Text>}
              
              <View style={styles.amountSection}>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, { color: colors.textPrimary }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    value={amount}
                    onChangeText={text => setAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              </View>

              {affordability && (
                <Text
                  style={{ color: affordability.affordable ? colors.textSecondary : colors.danger, marginTop: 8, fontFamily: 'Satoshi-Medium', fontSize: 13 }}
                >
                  {affordability.message}
                </Text>
              )}

              {goal && health && (
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
                  {whatIfChips.map(extraPaise => {
                    const preview = simulateWhatIf(goal, health, extraPaise);
                    if (!preview.etaLabel) return null;
                    return (
                      <PressableScale key={extraPaise} onPress={() => setAmount(String(extraPaise / 100))}>
                        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.chipBg }}>
                          <Text style={{ fontSize: 12, fontFamily: 'Satoshi-Medium', color: colors.textPrimary }}>
                            +₹{extraPaise / 100} → {preview.etaLabel}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
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
                  <Text style={[styles.submitButtonText, { color: colors.segmentActiveText }]}>{isSubmitting ? 'Saving...' : 'Add Funds'}</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
    marginBottom: 24,
  },

  // Amount
  amountSection: { marginBottom: 32, marginTop: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 36, fontFamily: 'Satoshi-Black', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 42, fontFamily: 'Satoshi-Regular', padding: 0 },

  // Submit
  submitButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
});
