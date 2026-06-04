/**
 * AddContributionScreen - Manual Entry + CSV Bulk Import
 * Following CreateGroupScreen pattern with form validation
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
import {
  ArrowLeft,
  Check,
  Upload,
  FileText,
  DollarSign,
  Calendar,
  User,
  Users,
} from 'lucide-react-native';
import { useAllContributions } from '../../../hooks/useContributions';
import { ToggleSwitch } from '../../../components/group';
import { spacing as SPACING, typography as TYPOGRAPHY, radii as RADII, shadows as SHADOWS } from '../../../theme/designTokens';
import { COLORS } from '../../../theme/colors';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';

interface AddContributionScreenProps {
  navigation: any;
  route: any;
}

type EntryMode = 'manual' | 'bulk';

export const AddContributionScreen: React.FC<AddContributionScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { createNewContribution, bulkImportContributions } = useAllContributions();
  const adminId = route.params?.adminId || 'admin123'; // TODO: Get from auth context

  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [formData, setFormData] = useState({
    groupId: '',
    userId: '',
    userName: '',
    groupName: '',
    amount: '',
    dueDate: new Date(),
    paymentMethod: '',
    status: 'pending' as any,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleManualSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.groupId.trim()) {
      newErrors.groupId = 'Group ID is required';
    }
    if (!formData.userId.trim()) {
      newErrors.userId = 'User ID is required';
    }
    if (!formData.userName.trim()) {
      newErrors.userName = 'User name is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      ReactNativeHapticFeedback.trigger('notificationError');
      return;
    }

    setIsSubmitting(true);
    ReactNativeHapticFeedback.trigger('impactHeavy');

    try {
      await createNewContribution({
        groupId: formData.groupId.trim(),
        userId: formData.userId.trim(),
        memberId: formData.userId.trim(),
        userName: formData.userName.trim(),
        memberName: formData.userName.trim(),
        groupName: formData.groupName.trim() || 'Unknown Group',
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        status: formData.status,
        paymentMethod: formData.paymentMethod || undefined,
        paidAt: undefined,
        approvedAt: undefined,
        approvedBy: undefined,
        transactionId: undefined,
        notes: undefined,
      });

      ReactNativeHapticFeedback.trigger('notificationSuccess');

      Alert.alert('Success', 'Contribution created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await pick({
        type: [types.csv, types.plainText],
      });

      if (result && result.length > 0) {
        setSelectedFile(result[0]);
        ReactNativeHapticFeedback.trigger('notificationSuccess');
      }
    } catch (error) {
      if (!isErrorWithCode(error) || error.code !== errorCodes.OPERATION_CANCELED) {
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const contributions: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const contribution: any = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (header === 'amount') {
          contribution.amount = parseFloat(value) || 0;
        } else if (header === 'duedate') {
          contribution.dueDate = new Date(value);
        } else {
          contribution[header] = value;
        }
      });

      // Required fields validation
      if (
        contribution.groupid &&
        contribution.userid &&
        contribution.username &&
        contribution.amount > 0
      ) {
        contributions.push({
          groupId: contribution.groupid,
          userId: contribution.userid,
          userName: contribution.username,
          groupName: contribution.groupname || 'Unknown Group',
          amount: contribution.amount,
          dueDate: contribution.dueDate || new Date(),
          status: 'pending',
          paymentMethod: undefined,
          paidAt: undefined,
          approvedAt: undefined,
          approvedBy: undefined,
          transactionId: undefined,
          notes: undefined,
        });
      }
    }

    return contributions;
  };

  const handleBulkSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a CSV file');
      return;
    }

    setIsSubmitting(true);
    ReactNativeHapticFeedback.trigger('impactHeavy');

    try {
      // Read CSV file
      const csvText = await RNFS.readFile(selectedFile.uri, 'utf8');
      const parsedContributions = parseCSV(csvText);

      if (parsedContributions.length === 0) {
        Alert.alert('Error', 'No valid contributions found in CSV file');
        setIsSubmitting(false);
        return;
      }

      // Bulk import
      const result = await bulkImportContributions(parsedContributions, adminId);

      ReactNativeHapticFeedback.trigger('notificationSuccess');

      Alert.alert(
        'Import Complete',
        `Successfully imported ${result.success} contributions.\n${result.failed > 0 ? `Failed: ${result.failed}` : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import contributions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (entryMode === 'manual') {
      handleManualSubmit();
    } else {
      handleBulkSubmit();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Contribution</Text>
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
          {/* Mode Toggle */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Entry Mode</Text>
            <View style={styles.modeToggle}>
              <Pressable
                style={[
                  styles.modeButton,
                  entryMode === 'manual' && styles.modeButtonActive,
                ]}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('selection');
                  setEntryMode('manual');
                }}
              >
                <User size={20} color={entryMode === 'manual' ? COLORS.surface : COLORS.textSecondary} />
                <Text
                  style={[
                    styles.modeButtonText,
                    entryMode === 'manual' && styles.modeButtonTextActive,
                  ]}
                >
                  Manual Entry
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modeButton,
                  entryMode === 'bulk' && styles.modeButtonActive,
                ]}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('selection');
                  setEntryMode('bulk');
                }}
              >
                <Upload size={20} color={entryMode === 'bulk' ? COLORS.surface : COLORS.textSecondary} />
                <Text
                  style={[
                    styles.modeButtonText,
                    entryMode === 'bulk' && styles.modeButtonTextActive,
                  ]}
                >
                  CSV Import
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {entryMode === 'manual' ? (
            <>
              {/* Manual Entry Form */}
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                <Text style={styles.sectionTitle}>Contribution Details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Group ID</Text>
                  <View style={[styles.inputContainer, errors.groupId && styles.inputError]}>
                    <Users size={20} color={COLORS.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.groupId}
                      onChangeText={(text) => {
                        setFormData({ ...formData, groupId: text });
                        setErrors({ ...errors, groupId: '' });
                      }}
                      placeholder="e.g. group123"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                  {errors.groupId && <Text style={styles.errorText}>{errors.groupId}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>User ID</Text>
                  <View style={[styles.inputContainer, errors.userId && styles.inputError]}>
                    <User size={20} color={COLORS.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.userId}
                      onChangeText={(text) => {
                        setFormData({ ...formData, userId: text });
                        setErrors({ ...errors, userId: '' });
                      }}
                      placeholder="e.g. user456"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                  {errors.userId && <Text style={styles.errorText}>{errors.userId}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Member Name</Text>
                  <View style={[styles.inputContainer, errors.userName && styles.inputError]}>
                    <User size={20} color={COLORS.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.userName}
                      onChangeText={(text) => {
                        setFormData({ ...formData, userName: text });
                        setErrors({ ...errors, userName: '' });
                      }}
                      placeholder="e.g. John Doe"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                  {errors.userName && <Text style={styles.errorText}>{errors.userName}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount</Text>
                  <View style={[styles.inputContainer, errors.amount && styles.inputError]}>
                    <DollarSign size={20} color={COLORS.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.amount}
                      onChangeText={(text) => {
                        setFormData({ ...formData, amount: text });
                        setErrors({ ...errors, amount: '' });
                      }}
                      placeholder="5000"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                  {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
                </View>
              </Animated.View>
            </>
          ) : (
            <>
              {/* CSV Import */}
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                <Text style={styles.sectionTitle}>Upload CSV File</Text>
                <Text style={styles.helperText}>
                  CSV format: groupId, userId, userName, groupName, amount, dueDate
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.uploadButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleFileSelect}
                >
                  <Upload size={24} color={COLORS.primaryBlue} />
                  <Text style={styles.uploadButtonText}>
                    {selectedFile ? 'Change File' : 'Select CSV File'}
                  </Text>
                </Pressable>

                {selectedFile && (
                  <View style={styles.fileInfo}>
                    <FileText size={20} color={COLORS.primaryBlue} />
                    <Text style={styles.fileName}>{selectedFile.name}</Text>
                  </View>
                )}
              </Animated.View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Action */}
      <Animated.View
        entering={FadeInUp.delay(400).springify()}
        style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}
      >
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
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {entryMode === 'manual' ? 'Create Contribution' : 'Import Contributions'}
              </Text>
              <Check size={20} color={COLORS.surface} strokeWidth={3} />
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.surfaceLight,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADII.m,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.l,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.l,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.s,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.m,
  },
  helperText: {
    fontSize: TYPOGRAPHY.sizes.s,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: SPACING.s,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: RADII.m,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: COLORS.primaryBlue,
    borderColor: COLORS.primaryBlue,
  },
  modeButtonText: {
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeButtonTextActive: {
    color: COLORS.surface,
  },
  inputGroup: {
    marginBottom: SPACING.m,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.s,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 56,
    paddingHorizontal: SPACING.m,
    ...SHADOWS.sm,
  },
  inputError: {
    borderColor: COLORS.errorCoral,
  },
  inputIcon: {
    marginRight: SPACING.s,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '500',
    color: COLORS.textPrimary,
    height: '100%',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.errorCoral,
    marginTop: 4,
    marginLeft: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.l,
    borderRadius: RADII.m,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: COLORS.primaryBlue,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '600',
    color: COLORS.primaryBlue,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginTop: SPACING.m,
    padding: SPACING.m,
    borderRadius: RADII.m,
    backgroundColor: `${COLORS.primaryBlue}15`,
  },
  fileName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.s,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.l,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primaryBlue,
    height: 56,
    borderRadius: RADII.round,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.s,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '700',
    color: COLORS.surface,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
