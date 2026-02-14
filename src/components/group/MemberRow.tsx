/**
 * MemberRow Component
 * Displays member information in a row with action buttons
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { User, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import type { GroupMember } from '../../types/group';
import { theme } from '../../theme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface MemberRowProps {
  member: GroupMember;
  onRemove?: (memberId: string) => void;
  isAdmin?: boolean;
}

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MemberRow: React.FC<MemberRowProps> = ({
  member,
  onRemove,
  isAdmin = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, SPRING_CONFIG) }],
  }));

  const handleRemovePress = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
    });
    onRemove?.(member.id);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusIcon = () => {
    switch (member.contributionStatus) {
      case 'paid':
        return <CheckCircle size={16} color="#2E7D32" strokeWidth={2.5} />;
      case 'overdue':
        return <XCircle size={16} color="#D32F2F" strokeWidth={2.5} />;
      case 'pending':
        return <Clock size={16} color="#F57C00" strokeWidth={2.5} />;
      default:
        return <Clock size={16} color="#757575" strokeWidth={2.5} />;
    }
  };

  const getStatusColor = () => {
    switch (member.contributionStatus) {
      case 'paid':
        return '#2E7D32';
      case 'overdue':
        return '#D32F2F';
      case 'pending':
        return '#F57C00';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <User size={20} color={theme.colors.textSecondary} strokeWidth={2.5} />
      </View>

      {/* Member Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {member.userName}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {member.userEmail}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Joined {formatDate(member.joinedDate)}</Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.metaText}>
            {formatCurrency(member.totalContributed)} contributed
          </Text>
        </View>
      </View>

      {/* Status & Actions */}
      <View style={styles.actions}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {member.contributionStatus}
          </Text>
        </View>

        {isAdmin && onRemove && (
          <AnimatedPressable
            style={[styles.removeButton, animatedStyle]}
            onPress={handleRemovePress}
            onPressIn={() => (scale.value = 0.9)}
            onPressOut={() => (scale.value = 1)}
          >
            <Trash2 size={18} color="#D32F2F" strokeWidth={2.5} />
          </AnimatedPressable>
        )}
      </View>

      {member.missedPayments > 0 && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>
            {member.missedPayments} missed payment{member.missedPayments > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    ...theme.shadows.neumorphic,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  info: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fonts.size.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  email: {
    fontSize: theme.fonts.size.xs,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  metaSeparator: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  actions: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  warningText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#E65100',
  },
});
