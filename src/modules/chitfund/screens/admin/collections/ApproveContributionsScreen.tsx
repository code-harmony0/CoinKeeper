/**
 * ApproveContributionsScreen - Pending Approval Queue with Batch Operations
 * Following GroupsScreen pattern with multi-select and batch actions
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, X, CheckSquare, Square } from 'lucide-react-native';
import { usePendingContributions } from '../../../hooks/useContributions';
import { ContributionCard } from '../../../../../components/contributions/ContributionCard';
import { useTabBarScroll } from '../../../../../context/TabBarScrollContext';
import { spacing as SPACING, typography as TYPOGRAPHY, radii as RADII, shadows as SHADOWS } from '../../../../../theme/designTokens';
import { COLORS } from '../../../../../theme/colors';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ApproveContributionsScreenProps {
  navigation: any;
  route: any;
}

export const ApproveContributionsScreen: React.FC<ApproveContributionsScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  const adminId = route.params?.adminId || 'admin123'; // TODO: Get from auth context

  const {
    contributions,
    isLoading,
    error,
    refreshContributions,
    approveMultiple,
    rejectMultiple,
  } = usePendingContributions();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Scroll handler for auto-hiding tab bar
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshContributions();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSelectAll = () => {
    ReactNativeHapticFeedback.trigger('selection');
    if (selectedIds.length === contributions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contributions.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    ReactNativeHapticFeedback.trigger('selection');
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) {
      Alert.alert('No Selection', 'Please select contributions to approve');
      return;
    }

    Alert.alert(
      'Confirm Approval',
      `Approve ${selectedIds.length} ${selectedIds.length === 1 ? 'contribution' : 'contributions'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setIsProcessing(true);
            ReactNativeHapticFeedback.trigger('impactHeavy');

            try {
              const result = await approveMultiple(selectedIds, adminId);

              ReactNativeHapticFeedback.trigger('notificationSuccess');
              Alert.alert(
                'Approval Complete',
                `Successfully approved ${result.success} contributions.\n${result.failed > 0 ? `Failed: ${result.failed}` : ''}`
              );

              setSelectedIds([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to approve contributions');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) {
      Alert.alert('No Selection', 'Please select contributions to reject');
      return;
    }

    Alert.alert(
      'Confirm Rejection',
      `Reject ${selectedIds.length} ${selectedIds.length === 1 ? 'contribution' : 'contributions'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            ReactNativeHapticFeedback.trigger('impactHeavy');

            try {
              const result = await rejectMultiple(selectedIds, adminId, 'Rejected by admin');

              ReactNativeHapticFeedback.trigger('notificationSuccess');
              Alert.alert(
                'Rejection Complete',
                `Successfully rejected ${result.success} contributions.\n${result.failed > 0 ? `Failed: ${result.failed}` : ''}`
              );

              setSelectedIds([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to reject contributions');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Approve Contributions</Text>
          <Text style={styles.headerSubtitle}>
            {contributions.length} pending approval
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.selectAllButton, pressed && styles.buttonPressed]}
          onPress={handleSelectAll}
        >
          {selectedIds.length === contributions.length && contributions.length > 0 ? (
            <CheckSquare size={24} color={COLORS.primaryBlue} />
          ) : (
            <Square size={24} color={COLORS.textSecondary} />
          )}
        </Pressable>
      </Animated.View>

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <Animated.View entering={FadeInDown.springify()} style={styles.actionBar}>
          <Text style={styles.selectionCount}>{selectedIds.length} selected</Text>
          <View style={styles.actionButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.rejectButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBatchReject}
              disabled={isProcessing}
            >
              <X size={20} color={COLORS.surface} strokeWidth={2.5} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.approveButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBatchApprove}
              disabled={isProcessing}
            >
              <Check size={20} color={COLORS.surface} strokeWidth={2.5} />
              <Text style={styles.actionButtonText}>Approve</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Contributions List */}
      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      ) : contributions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No pending contributions</Text>
          <Text style={styles.emptySubtext}>All contributions have been reviewed</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={contributions}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => handleToggleSelect(item.id)}
              onLongPress={() => handleToggleSelect(item.id)}
            >
              <View style={styles.contributionWrapper}>
                {/* Selection Checkbox */}
                <View style={styles.checkbox}>
                  {selectedIds.includes(item.id) ? (
                    <CheckSquare size={24} color={COLORS.primaryBlue} />
                  ) : (
                    <Square size={24} color={COLORS.textTertiary} />
                  )}
                </View>
                {/* Contribution Card */}
                <View style={styles.cardWrapper}>
                  <ContributionCard
                    contribution={item}
                    index={index}
                    onPress={() => handleToggleSelect(item.id)}
                  />
                </View>
              </View>
            </Pressable>
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primaryBlue}
            />
          }
        />
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={COLORS.primaryBlue} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        </View>
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
    borderRadius: RADII.m,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.l,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.s,
    color: COLORS.textSecondary,
  },
  selectAllButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectionCount: {
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.s,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: RADII.m,
  },
  approveButton: {
    backgroundColor: COLORS.successGreen,
  },
  rejectButton: {
    backgroundColor: COLORS.errorCoral,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.sizes.s,
    fontWeight: '700',
    color: COLORS.surface,
  },
  listContent: {
    padding: SPACING.l,
  },
  contributionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  checkbox: {
    width: 32,
    alignItems: 'center',
  },
  cardWrapper: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.l,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.sizes.m,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.m,
    color: COLORS.errorCoral,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.xl,
    borderRadius: RADII.l,
    alignItems: 'center',
    gap: SPACING.m,
    ...SHADOWS.lg,
  },
  processingText: {
    fontSize: TYPOGRAPHY.sizes.m,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
