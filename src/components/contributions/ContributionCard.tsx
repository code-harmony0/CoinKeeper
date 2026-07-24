/**
 * ContributionCard - Following GroupCard pattern
 * Displays contribution with status, amount, and member info
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Calendar, DollarSign, User } from 'lucide-react-native';
import { Contribution } from '../../types/transaction';
import { StatusChip } from '../shared/StatusChip';
import { colors, spacing, typography, radii, shadows } from '../../theme/designTokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ContributionCardProps {
  contribution: Contribution;
  index: number;
  onPress: () => void;
}

export const ContributionCard: React.FC<ContributionCardProps> = ({
  contribution,
  index,
  onPress,
}) => {
  // Status color mapping (following GroupCard pattern)
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
      case 'approved':
        return '#10B981'; // Green
      case 'pending':
        return '#F59E0B'; // Amber
      case 'failed':
      case 'overdue':
        return '#EF4444'; // Red
      default:
        return colors.textTertiary;
    }
  };

  // Format amount
  const formattedAmount = `₦${contribution.amount.toLocaleString()}`;

  // Format date
  const formattedDate = contribution.dueDate
    ? new Date(contribution.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  // Determine if overdue
  const isOverdue =
    contribution.status === 'pending' &&
    contribution.dueDate &&
    new Date(contribution.dueDate) < new Date();

  const displayStatus = isOverdue ? 'overdue' : contribution.status;
  const accentColor = getStatusColor(displayStatus);

  return (
    <Pressable
      onPress={() => {
        ReactNativeHapticFeedback.trigger('impactLight');
        onPress();
      }}
    >
      <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.card}>
        {/* Colored Accent Bar (following GroupCard pattern) */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.cardContent}>
          {/* Header with Member Info */}
          <View style={styles.header}>
            <View style={styles.memberInfo}>
              <View style={styles.iconCircle}>
                <User size={16} color={colors.primary} />
              </View>
              <View style={styles.memberDetails}>
                <Text style={styles.memberName}>{contribution.userName || 'Member'}</Text>
                <Text style={styles.groupName}>{contribution.groupName || 'Group'}</Text>
              </View>
            </View>
            <StatusChip status={displayStatus} />
          </View>

          {/* Stats Row (following GroupCard pattern) */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <DollarSign size={16} color={colors.textSecondary} />
              <Text style={styles.statValue}>{formattedAmount}</Text>
              <Text style={styles.statLabel}>Amount</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text style={styles.statValue}>{formattedDate}</Text>
              <Text style={styles.statLabel}>Due Date</Text>
            </View>
          </View>

          {/* Footer Badge (following GroupCard pattern) */}
          {contribution.paymentMethod && (
            <View style={styles.footer}>
              <View style={[styles.badge, { backgroundColor: `${accentColor}15` }]}>
                <Text style={[styles.badgeText, { color: accentColor }]}>
                  {contribution.paymentMethod}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    marginBottom: spacing.m,
    overflow: 'hidden',
    ...shadows.sm,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: spacing.l,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.sizes.m,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  groupName: {
    fontSize: typography.sizes.s,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.pillBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: typography.sizes.m,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.pillBorder,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: spacing.s,
  },
  badge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: radii.s,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
