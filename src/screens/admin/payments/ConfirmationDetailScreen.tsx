/**
 * ConfirmationDetailScreen - View and act on a single payment confirmation
 * Following ContributionDetailScreen pattern
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  Hash,
  Calendar,
  ImageIcon,
} from 'lucide-react-native';
import { getConfirmationById, confirmPayment, rejectPayment, disputePayment } from '../../../services/paymentConfirmationService';
import { COLORS, SPACING, TYPOGRAPHY, RADII, SHADOWS } from '../../../theme/designTokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { PaymentConfirmation } from '../../../types/paymentConfirmation';

interface ConfirmationDetailScreenProps {
  navigation: any;
  route: { params: { confirmationId: string } };
}

export const ConfirmationDetailScreen: React.FC<ConfirmationDetailScreenProps> = ({ navigation, route }) => {
  const { confirmationId } = route.params;
  const insets = useSafeAreaInsets();
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    const fetchConfirmation = async () => {
      try {
        setIsLoading(true);
        const data = await getConfirmationById(confirmationId);
        setConfirmation(data);
      } catch (error) {
        console.error('Error fetching confirmation:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfirmation();
  }, [confirmationId]);

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Payment',
      'Are you sure you want to confirm this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsActioning(true);
              ReactNativeHapticFeedback.trigger('impactMedium');
              await confirmPayment(confirmationId, 'admin', 'Admin');
              setConfirmation((prev) => prev ? { ...prev, status: 'confirmed' } : null);
            } catch (error) {
              Alert.alert('Error', 'Failed to confirm payment');
            } finally {
              setIsActioning(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.prompt(
      'Reject Payment',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              setIsActioning(true);
              ReactNativeHapticFeedback.trigger('impactMedium');
              await rejectPayment(confirmationId, 'admin', reason || 'No reason provided');
              setConfirmation((prev) => prev ? { ...prev, status: 'rejected', rejectionReason: reason } : null);
            } catch (error) {
              Alert.alert('Error', 'Failed to reject payment');
            } finally {
              setIsActioning(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDispute = () => {
    Alert.prompt(
      'Raise Dispute',
      'Please describe the dispute:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            try {
              setIsActioning(true);
              ReactNativeHapticFeedback.trigger('impactMedium');
              await disputePayment(confirmationId, 'admin', reason || 'No reason provided');
              setConfirmation((prev) => prev ? { ...prev, status: 'disputed', disputeReason: reason } : null);
            } catch (error) {
              Alert.alert('Error', 'Failed to raise dispute');
            } finally {
              setIsActioning(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return COLORS.success;
      case 'rejected': return COLORS.error;
      case 'disputed': return COLORS.warning;
      default: return COLORS.accent;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!confirmation) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Confirmation not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Payment Detail</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(confirmation.status) + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(confirmation.status) }]}>
              {confirmation.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.amountCard}>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>₹{confirmation.amount.toLocaleString()}</Text>
          <Text style={styles.cycleText}>Cycle #{confirmation.cycleNumber}</Text>
        </Animated.View>

        {/* Details */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}><User size={18} color={COLORS.textTertiary} /></View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Member</Text>
              <Text style={styles.detailValue}>{confirmation.memberName}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}><Hash size={18} color={COLORS.textTertiary} /></View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Group</Text>
              <Text style={styles.detailValue}>{confirmation.groupName}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}><CreditCard size={18} color={COLORS.textTertiary} /></View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{confirmation.paymentMethod.toUpperCase()}</Text>
            </View>
          </View>

          {confirmation.referenceId && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}><Hash size={18} color={COLORS.textTertiary} /></View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Reference ID</Text>
                <Text style={styles.detailValue}>{confirmation.referenceId}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}><Calendar size={18} color={COLORS.textTertiary} /></View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Submitted</Text>
              <Text style={styles.detailValue}>
                {confirmation.createdAt?.toDate?.()
                  ? confirmation.createdAt.toDate().toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Screenshot */}
        {confirmation.screenshotUrl && (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Payment Screenshot</Text>
            <View style={styles.screenshotContainer}>
              <Image source={{ uri: confirmation.screenshotUrl }} style={styles.screenshot} resizeMode="contain" />
            </View>
          </Animated.View>
        )}

        {/* Rejection/Dispute Reason */}
        {(confirmation.rejectionReason || confirmation.disputeReason) && (
          <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>
              {confirmation.rejectionReason ? 'Rejection Reason' : 'Dispute Reason'}
            </Text>
            <Text style={styles.reasonText}>
              {confirmation.rejectionReason || confirmation.disputeReason}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Action Buttons - only show for pending status */}
      {confirmation.status === 'pending' && (
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.md }]}
        >
          <Pressable
            style={({ pressed }) => [styles.rejectButton, pressed && styles.buttonPressed]}
            onPress={handleReject}
            disabled={isActioning}
          >
            <XCircle size={20} color={COLORS.error} />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.disputeButton, pressed && styles.buttonPressed]}
            onPress={handleDispute}
            disabled={isActioning}
          >
            <AlertTriangle size={20} color={COLORS.warning} />
            <Text style={styles.disputeButtonText}>Dispute</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.confirmButton, pressed && styles.buttonPressed]}
            onPress={handleConfirm}
            disabled={isActioning}
          >
            {isActioning ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft },
  headerContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  statusBadge: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADII.full },
  statusBadgeText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: '700' },
  scrollContent: { paddingHorizontal: SPACING.lg },
  amountCard: { backgroundColor: COLORS.primary, borderRadius: RADII.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.md },
  amountLabel: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: SPACING.xs },
  amountValue: { fontSize: 36, fontWeight: '900', color: '#FFFFFF' },
  cycleText: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: SPACING.xs },
  detailsCard: { backgroundColor: COLORS.card, borderRadius: RADII.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.soft },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textTertiary },
  detailValue: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  screenshotContainer: { borderRadius: RADII.md, overflow: 'hidden', backgroundColor: COLORS.backgroundSecondary },
  screenshot: { width: '100%', height: 300 },
  reasonCard: { backgroundColor: COLORS.errorBackground, borderRadius: RADII.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  reasonTitle: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '700', color: COLORS.error, marginBottom: SPACING.xs },
  reasonText: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.textPrimary },
  actionBar: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: RADII.md, backgroundColor: COLORS.errorMuted, gap: SPACING.xs },
  rejectButtonText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '700', color: COLORS.error },
  disputeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: RADII.md, backgroundColor: COLORS.warningMuted, gap: SPACING.xs },
  disputeButtonText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '700', color: COLORS.warning },
  confirmButton: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: RADII.md, backgroundColor: COLORS.primary, gap: SPACING.xs },
  confirmButtonText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '700', color: '#FFFFFF' },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  errorText: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.error },
});
