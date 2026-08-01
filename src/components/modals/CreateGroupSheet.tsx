/**
 * CreateGroupSheet - Blob Theme
 * Organic bottom sheet for creating chit groups
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
import { useSpecTheme } from '../../theme/specTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Path, Circle } from 'react-native-svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface CreateGroupSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, amount: number, members: number, duration: number) => void;
}

export const CreateGroupSheet: React.FC<CreateGroupSheetProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow, spring: springConfig } = useSpecTheme();
  
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [members, setMembers] = useState('');
  const [duration, setDuration] = useState('12');

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, springConfig);
      ReactNativeHapticFeedback.trigger('impactLight');
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 150 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const handleClose = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onClose();
  };

  const handleSubmit = () => {
    if (!name || !amount || !members) return;
    
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    onSubmit(name, parseFloat(amount), parseInt(members, 10), parseInt(duration, 10));

    // Reset
    setName('');
    setAmount('');
    setMembers('');
    setDuration('12');
  };

  if (!visible) return null;

  const isValid = name && amount && members;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30 }, sheetStyle]}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={[styles.handle, { backgroundColor: colors.chipBg }]} />
              <View style={styles.headerRow}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Create Group</Text>
                <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.chipBg }]}>
                  <CloseIcon color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.scrollWrapper}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
                
                {/* Group Name */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Group Name</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <UsersIcon color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Family Savings"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                {/* Monthly Contribution */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monthly Contribution</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <WalletIcon color={colors.textSecondary} />
                    <Text style={[styles.currencyPrefix, { color: colors.textPrimary }]}>₹</Text>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={amount}
                      onChangeText={text => setAmount(text.replace(/[^0-9]/g, ''))}
                      placeholder="5,000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* Total Members */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Total Members</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <GroupIcon color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={members}
                      onChangeText={text => setMembers(text.replace(/[^0-9]/g, ''))}
                      placeholder="12"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* Duration */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Duration (months)</Text>
                  <View style={styles.durationRow}>
                    {['6', '12', '18', '24'].map(d => (
                      <Pressable
                        key={d}
                        onPress={() => { ReactNativeHapticFeedback.trigger('impactLight'); setDuration(d); }}
                        style={[
                          styles.durationChip, 
                          { backgroundColor: duration === d ? colors.primaryAccent : colors.chipBg }
                        ]}
                      >
                        <Text style={[styles.durationText, { color: duration === d ? '#FFFFFF' : colors.textSecondary }]}>{d}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Submit */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={!isValid}
                  style={[styles.submitButton, { backgroundColor: colors.primaryAccent }, !isValid && styles.submitButtonDisabled]}
                >
                  <Text style={styles.submitButtonText}>Create Group</Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Icons
const SW = 2;

const CloseIcon = ({ color = '#475569' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const UsersIcon = ({ color = '#64748B' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={7} r={3} stroke={color} strokeWidth={SW} fill="none" />
    <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={color} strokeWidth={SW} strokeLinecap="round" fill="none" />
  </Svg>
);

const WalletIcon = ({ color = '#64748B' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M21 8V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-1" stroke={color} strokeWidth={SW} strokeLinecap="round" fill="none" />
    <Circle cx={17} cy={12} r={2} stroke={color} strokeWidth={SW} fill="none" />
  </Svg>
);

const GroupIcon = ({ color = '#64748B' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={7} r={3} stroke={color} strokeWidth={SW} fill="none" />
    <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" stroke={color} strokeWidth={SW} strokeLinecap="round" fill="none" />
  </Svg>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    overflow: 'hidden',
  },
  content: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Satoshi-Bold' },
  closeBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  scrollWrapper: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },

  // Input groups
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontFamily: 'Satoshi-Bold', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56, gap: 12 },
  currencyPrefix: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
  input: { flex: 1, fontSize: 16, fontFamily: 'Satoshi-Medium' },

  // Duration
  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  durationText: { fontSize: 15, fontFamily: 'Satoshi-Bold' },

  // Submit
  submitButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold', color: '#FFF' },
});

export default CreateGroupSheet;
