/**
 * AddMemberScreen
 * Form to add a new member without KYC
 */

import React, { useState } from 'react';
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
import { ArrowLeft, Check, User, Mail, Phone, Users } from 'lucide-react-native';
import { theme } from '../../../../../theme';
import { useMembers } from '../../../hooks/useMembers';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface AddMemberScreenProps {
  navigation: any;
}

export const AddMemberScreen: React.FC<AddMemberScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { addMember } = useMembers();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    group: '', // Dummy group selection
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      ReactNativeHapticFeedback.trigger('notificationError');
      return;
    }

    setIsSubmitting(true);
    ReactNativeHapticFeedback.trigger('impactHeavy');

    // Simulate API call
    setTimeout(() => {
      addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        groups: formData.group ? [formData.group] : [],
      });

      ReactNativeHapticFeedback.trigger('notificationSuccess');
      setIsSubmitting(false);
      
      Alert.alert('Success', 'Member added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 1000);
  };

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
        <Text style={styles.headerTitle}>Add Member</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                <User size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: '' });
                  }}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Mail size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    setErrors({ ...errors, email: '' });
                  }}
                  placeholder="john@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                <Phone size={20} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => {
                    setFormData({ ...formData, phone: text });
                    setErrors({ ...errors, phone: '' });
                  }}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Group Assignment</Text>
            <Pressable
              style={styles.groupSelector}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('selection');
                // TODO: Open group selection modal
                setFormData({ ...formData, group: 'g1' }); // Dummy selection
              }}
            >
              <View style={styles.groupIcon}>
                <Users size={24} color="#00695C" />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupLabel}>Assign to Group</Text>
                <Text style={styles.groupValue}>
                  {formData.group ? 'Office Savings Circle' : 'Select a group (Optional)'}
                </Text>
              </View>
              {formData.group && <Check size={20} color="#00695C" />}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Add Member</Text>
              <Check size={20} color="#FFFFFF" strokeWidth={3} />
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
    backgroundColor: '#F8FAFC',
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
  // Group Selector
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    ...theme.shadows.soft,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121723',
  },
  groupValue: {
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
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...theme.shadows.medium,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
