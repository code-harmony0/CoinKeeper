/**
 * EditGroupScreen - PREMIUM FORM
 * Premium Squircle inputs and visual selectors
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { 
  ArrowLeft, 
  Save, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock,
  CreditCard,
  Shield,
  Lock
} from 'lucide-react-native';
import { useGroupDetails, useGroups } from '../../../hooks/useGroups';
import { ToggleSwitch } from '../../../components/group';
import { theme } from '../../../../../theme';
import type { GroupCycleTime } from '../../../types/group';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface EditGroupScreenProps {
  route: {
    params: {
      groupId: string;
    };
  };
  navigation: any;
  adminId: string;
}

export const EditGroupScreen: React.FC<EditGroupScreenProps> = ({
  route,
  navigation,
  adminId,
}) => {
  const { groupId } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { group, isLoading } = useGroupDetails(groupId);
  const { updateGroup } = useGroups(adminId);

  const [formData, setFormData] = useState({
    name: '',
    contributionAmount: '',
    maxMembers: '',
    cycleTime: 'monthly' as GroupCycleTime,
    autoDebit: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        contributionAmount: group.contributionAmount.toString(),
        maxMembers: group.maxMembers.toString(),
        cycleTime: group.cycleTime,
        autoDebit: group.autoDebit,
      });
    }
  }, [group]);

  const handleSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }

    if (!formData.contributionAmount || parseFloat(formData.contributionAmount) <= 0) {
      newErrors.contributionAmount = 'Valid amount is required';
    }

    if (!formData.maxMembers || parseInt(formData.maxMembers, 10) <= 0) {
      newErrors.maxMembers = 'Valid member count is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      ReactNativeHapticFeedback.trigger('notificationError');
      return;
    }

    // Check if group is closed
    if (group?.closed) {
      Alert.alert('Error', 'Cannot edit a closed group');
      return;
    }

    setIsSubmitting(true);
    ReactNativeHapticFeedback.trigger('impactHeavy');

    try {
      await updateGroup(groupId, {
        name: formData.name.trim(),
        contributionAmount: parseFloat(formData.contributionAmount),
        cycleTime: formData.cycleTime,
        maxMembers: parseInt(formData.maxMembers, 10),
        autoDebit: formData.autoDebit,
      });

      ReactNativeHapticFeedback.trigger('notificationSuccess');

      Alert.alert('Success', 'Group updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClosed = group?.closed || false;

  const CycleOption = ({ value, label, icon: Icon }: { value: GroupCycleTime, label: string, icon: any }) => (
    <Pressable
      style={[
        styles.cycleCard,
        formData.cycleTime === value && styles.cycleCardActive,
        isClosed && styles.cycleCardDisabled
      ]}
      onPress={() => {
        if (!isClosed) {
          ReactNativeHapticFeedback.trigger('selection');
          setFormData({ ...formData, cycleTime: value });
        }
      }}
      disabled={isClosed}
    >
      <View style={[
        styles.cycleIcon,
        formData.cycleTime === value && styles.cycleIconActive
      ]}>
        <Icon size={20} color={formData.cycleTime === value ? '#FFFFFF' : theme.colors.textSecondary} />
      </View>
      <Text style={[
        styles.cycleLabel,
        formData.cycleTime === value && styles.cycleLabelActive
      ]}>
        {label}
      </Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#121723" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]} 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#121723" strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Group</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      {isClosed && (
        <Animated.View entering={FadeInDown.springify()} style={styles.warningBanner}>
          <Lock size={16} color="#E65100" />
          <Text style={styles.warningText}>This group is closed and cannot be edited</Text>
        </Animated.View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Details Section */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Group Details</Text>
            
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Group Name</Text>
              <View style={[styles.inputContainer, errors.name && styles.inputError, isClosed && styles.inputDisabled]}>
                <Users size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: '' });
                  }}
                  placeholder="e.g. Office Savings Circle"
                  placeholderTextColor={theme.colors.textTertiary}
                  editable={!isClosed}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Amount & Members Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Contribution</Text>
                <View style={[styles.inputContainer, errors.contributionAmount && styles.inputError, isClosed && styles.inputDisabled]}>
                  <DollarSign size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.contributionAmount}
                    onChangeText={(text) => {
                      setFormData({ ...formData, contributionAmount: text });
                      setErrors({ ...errors, contributionAmount: '' });
                    }}
                    placeholder="5000"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="numeric"
                    editable={!isClosed}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Max Members</Text>
                <View style={[styles.inputContainer, errors.maxMembers && styles.inputError, isClosed && styles.inputDisabled]}>
                  <Users size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.maxMembers}
                    onChangeText={(text) => {
                      setFormData({ ...formData, maxMembers: text });
                      setErrors({ ...errors, maxMembers: '' });
                    }}
                    placeholder="10"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="numeric"
                    editable={!isClosed}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Cycle Section */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Cycle Frequency</Text>
            <View style={styles.cycleGrid}>
              <CycleOption value="weekly" label="Weekly" icon={Clock} />
              <CycleOption value="biweekly" label="Bi-Weekly" icon={Calendar} />
              <CycleOption value="monthly" label="Monthly" icon={Calendar} />
            </View>
          </Animated.View>

          {/* Settings Section */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingIcon}>
                <CreditCard size={24} color="#00695C" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Debit</Text>
                <Text style={styles.settingDesc}>Automatically deduct funds</Text>
              </View>
              <ToggleSwitch
                value={formData.autoDebit}
                onValueChange={(value) => setFormData({ ...formData, autoDebit: value })}
                disabled={isClosed}
              />
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Action */}
      <Animated.View entering={FadeInUp.delay(400).springify()} style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (isSubmitting || isClosed) && styles.submitButtonDisabled,
            pressed && styles.buttonPressed
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isClosed}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Save Changes</Text>
              <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Light gray background for form
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#121723',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 56,
    paddingHorizontal: 16,
    ...theme.shadows.soft,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.7,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#121723',
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  // Cycle Grid
  cycleGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  cycleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadows.soft,
  },
  cycleCardActive: {
    borderColor: '#121723',
    backgroundColor: '#F8FAFC',
  },
  cycleCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
  },
  cycleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cycleIconActive: {
    backgroundColor: '#121723',
  },
  cycleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cycleLabelActive: {
    color: '#121723',
    fontWeight: '700',
  },
  // Settings
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    ...theme.shadows.soft,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121723',
  },
  settingDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitButton: {
    backgroundColor: '#121723',
    height: 56,
    borderRadius: 28, // Full pill
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...theme.shadows.medium,
  },
  submitButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
