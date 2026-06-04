/**
 * ContributionDetailScreen - View contribution details and generate receipt
 * Integrates receipt generation with PDF and WhatsApp sharing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowLeft,
  FileText,
  Share as ShareIcon,
  MessageCircle,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { getContributionById } from '../../../services/contributionService';
import { generateAndShareReceipt } from '../../../services/receiptService';
import { Contribution } from '../../../types/transaction';
import { StatusChip } from '../../../components/shared/StatusChip';
import { spacing as SPACING, typography as TYPOGRAPHY, radii as RADII, shadows as SHADOWS } from '../../../theme/designTokens';
import { COLORS } from '../../../theme/colors';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ContributionDetailScreenProps {
  navigation: any;
  route: any;
}

export const ContributionDetailScreen: React.FC<ContributionDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { contributionId } = route.params ?? {};

  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadContribution();
  }, [contributionId]);

  const loadContribution = async () => {
    try {
      setIsLoading(true);
      const data = await getContributionById(contributionId);
      setContribution(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contribution details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReceipt = async (shareMethod: 'whatsapp' | 'general') => {
    if (!contribution) return;

    setIsGenerating(true);
    ReactNativeHapticFeedback.trigger('impactMedium');

    try {
      await generateAndShareReceipt(contribution, shareMethod);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError');
      Alert.alert('Error', 'Failed to generate or share receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        </View>
      </View>
    );
  }

  if (!contribution) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Contribution not found</Text>
        </View>
      </View>
    );
  }

  const formattedAmount = `₦${contribution.amount.toLocaleString()}`;
  const formattedDate = contribution.dueDate
    ? new Date(contribution.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';
  const formattedPaidDate = contribution.paidAt
    ? new Date(contribution.paidAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not paid';

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
        <Text style={styles.headerTitle}>Contribution Details</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>{formattedAmount}</Text>
          <StatusChip status={contribution.status} />
        </Animated.View>

        {/* Details Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <User size={20} color={COLORS.primaryBlue} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Member</Text>
                <Text style={styles.detailValue}>{contribution.userName || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <User size={20} color={COLORS.primaryBlue} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Group</Text>
                <Text style={styles.detailValue}>{contribution.groupName || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Calendar size={20} color={COLORS.primaryBlue} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>
            </View>

            {contribution.paidAt && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <CheckCircle size={20} color={COLORS.successGreen} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Paid On</Text>
                    <Text style={styles.detailValue}>{formattedPaidDate}</Text>
                  </View>
                </View>
              </>
            )}

            {contribution.paymentMethod && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <CreditCard size={20} color={COLORS.primaryBlue} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailValue}>{contribution.paymentMethod}</Text>
                  </View>
                </View>
              </>
            )}

            {contribution.transactionId && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <FileText size={20} color={COLORS.primaryBlue} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Transaction ID</Text>
                    <Text style={styles.detailValue}>{contribution.transactionId}</Text>
                  </View>
                </View>
              </>
            )}

            {contribution.notes && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <FileText size={20} color={COLORS.primaryBlue} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{contribution.notes}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Action Buttons */}
      {contribution.status === 'paid' && (
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.whatsappButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => handleGenerateReceipt('whatsapp')}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <MessageCircle size={20} color={COLORS.surface} strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Share via WhatsApp</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.shareButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => handleGenerateReceipt('general')}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <ShareIcon size={20} color={COLORS.surface} strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Share Receipt</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
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
    borderRadius: RADII.s,
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
  amountCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.l,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  amountLabel: {
    fontSize: TYPOGRAPHY.sizes.s,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  amountValue: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primaryBlue,
    marginBottom: SPACING.m,
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
  detailCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.l,
    padding: SPACING.l,
    ...SHADOWS.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    paddingVertical: SPACING.s,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primaryBlue}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.s,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.s,
    padding: SPACING.l,
    backgroundColor: COLORS.surfaceLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    height: 56,
    borderRadius: RADII.round,
    ...SHADOWS.md,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  shareButton: {
    backgroundColor: COLORS.primaryBlue,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '700',
    color: COLORS.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.m,
    color: COLORS.errorCoral,
    textAlign: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
