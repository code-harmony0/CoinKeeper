/**
 * AddTransactionScreen
 * Form to manually add a transaction
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ArrowLeft, User, Users, DollarSign, FileText } from 'lucide-react-native';
import { theme } from '../../../../../theme';
import { useAllContributions } from '../../../hooks/useContributions';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface AddTransactionScreenProps {
  navigation: any;
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { createNewContribution } = useAllContributions();
  
  const [amount, setAmount] = useState('');
  const [memberId, setMemberId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [reference, setReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (!amount || !memberId || !groupId) {
      ReactNativeHapticFeedback.trigger('notificationError');
      // Show error toast
      return;
    }

    setIsLoading(true);
    ReactNativeHapticFeedback.trigger('impactHeavy');

    // Simulate API delay
    setTimeout(() => {
      createNewContribution({
        amount: parseFloat(amount),
        memberId: memberId, // In real app, this would be selected from a list
        memberName: 'Selected Member', // Dummy
        groupId: groupId,
        groupName: 'Selected Group', // Dummy
        status: 'pending',
        notes: reference,
      });
      setIsLoading(false);
      navigation.goBack();
    }, 1000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#121723" strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Amount Input */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.amountContainer}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountInputWrapper}>
              <DollarSign size={24} color="#121723" />
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
          </Animated.View>

          {/* Form Fields */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Member</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="Select Member ID"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={memberId}
                  onChangeText={setMemberId}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Group</Text>
              <View style={styles.inputWrapper}>
                <Users size={20} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="Select Group ID"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={groupId}
                  onChangeText={setGroupId}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reference (Optional)</Text>
              <View style={styles.inputWrapper}>
                <FileText size={20} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="UPI Ref, Cheque No, etc."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={reference}
                  onChangeText={setReference}
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitText}>
              {isLoading ? 'Processing...' : 'Add Transaction'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  amountContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...theme.shadows.soft,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '800',
    color: '#121723',
    flex: 1,
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#121723',
    height: '100%',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitButton: {
    backgroundColor: '#121723',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
