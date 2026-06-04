/**
 * GroupCard Component
 * Card displaying group information in the list view
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Users, DollarSign, TrendingUp } from 'lucide-react-native';
import type { Group } from '../../types/group';
import { StatusChip } from './StatusChip';
import { theme } from '../../theme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface GroupCardProps {
  group: Group;
  onPress: () => void;
  index: number;
}

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_COLORS = {
  active: '#2E7D32',
  inactive: '#757575',
  pending: '#F57C00',
  closed: '#D32F2F',
};

const STATUS_BG_COLORS = {
  active: '#E8F5E9',
  inactive: '#F5F5F5',
  pending: '#FFF3E0',
  closed: '#FFEBEE',
};

export const GroupCard: React.FC<GroupCardProps> = ({ group, onPress, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, SPRING_CONFIG) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.97;
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const statusColor = STATUS_COLORS[group.status] || theme.colors.primaryBlue;
  const statusBg = STATUS_BG_COLORS[group.status] || '#F5F5F5';

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 50)
        .springify()
        .damping(16)
        .stiffness(140)}
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Colored Accent Bar */}
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.groupName} numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={styles.startDate}>Started {formatDate(group.startDate)}</Text>
          </View>
          <StatusChip status={group.status} size="small" />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Members */}
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Users size={16} color="#1976D2" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.statValue}>{group.activeMembers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
          </View>

          {/* Amount Pooled */}
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <DollarSign
                size={16}
                color="#2E7D32"
                strokeWidth={2.5}
              />
            </View>
            <View>
              <Text style={styles.statValue}>{formatCurrency(group.totalPooled)}</Text>
              <Text style={styles.statLabel}>Pooled</Text>
            </View>
          </View>

          {/* Contribution */}
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <TrendingUp
                size={16}
                color="#F57C00"
                strokeWidth={2.5}
              />
            </View>
            <View>
              <Text style={styles.statValue}>
                {formatCurrency(group.contributionAmount)}
              </Text>
              <Text style={styles.statLabel}>{group.cycleTime}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: statusBg }]}>
          <Text style={[styles.footerText, { color: statusColor }]}>
            Max {group.maxMembers} members • Auto-debit{' '}
            {group.autoDebit ? 'enabled' : 'disabled'}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md, // Increased spacing
    ...theme.shadows.soft,
    overflow: 'hidden', // For accent bar
    flexDirection: 'row',
  },
  accentBar: {
    width: 6,
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  groupName: {
    fontSize: 17, // Slightly larger
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  startDate: {
    fontSize: theme.fonts.size.xs,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 32, // Larger
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  footer: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
