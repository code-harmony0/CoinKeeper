/**
 * StatusChip - Shared component for status badges
 * Used across payment, draw, and settlement screens
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../theme/colors';

export type StatusType =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'scheduled'
  | 'upcoming'
  | 'in_progress'
  | 'overdue'
  | 'reminded'
  | 'paid'
  | 'verified'
  | 'rejected'
  | 'settlement_partial'
  | 'open'
  | 'executing';

interface StatusChipProps {
  status: StatusType | string;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  // Payment/Transaction statuses
  pending: { bg: '#FFF3E0', text: '#E65100' },
  processing: { bg: '#E3F2FD', text: '#1565C0' },
  completed: { bg: '#E8F5E9', text: '#2E7D32' },
  failed: { bg: '#FFEBEE', text: '#C62828' },
  cancelled: { bg: '#ECEFF1', text: '#546E7A' },
  
  // Draw statuses
  scheduled: { bg: '#E3F2FD', text: '#1565C0' },
  upcoming: { bg: '#E3F2FD', text: '#1976D2' },
  in_progress: { bg: '#FFF8E1', text: '#F9A825' },
  open: { bg: '#E8F5E9', text: '#388E3C' },
  executing: { bg: '#FFF3E0', text: '#EF6C00' },
  settlement_partial: { bg: '#FCE4EC', text: '#AD1457' },
  
  // Payment collection statuses
  overdue: { bg: '#FFEBEE', text: '#D32F2F' },
  reminded: { bg: '#FFF3E0', text: '#F57C00' },
  paid: { bg: '#E8F5E9', text: '#388E3C' },
  verified: { bg: '#E8F5E9', text: '#2E7D32' },
  rejected: { bg: '#FFEBEE', text: '#C62828' },
  
  // Default
  default: { bg: '#F5F5F5', text: '#757575' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  scheduled: 'Scheduled',
  upcoming: 'Upcoming',
  in_progress: 'In Progress',
  open: 'Open',
  executing: 'Executing',
  settlement_partial: 'Partial',
  overdue: 'Overdue',
  reminded: 'Reminded',
  paid: 'Paid',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const StatusChip: React.FC<StatusChipProps> = memo(({
  status,
  label,
  size = 'medium',
  style,
  textStyle,
}) => {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  const colors = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.default;
  const displayLabel = label || STATUS_LABELS[normalizedStatus] || status;

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      text: styles.textSmall,
    },
    medium: {
      container: styles.containerMedium,
      text: styles.textMedium,
    },
    large: {
      container: styles.containerLarge,
      text: styles.textLarge,
    },
  };

  return (
    <View
      style={[
        styles.container,
        sizeStyles[size].container,
        { backgroundColor: colors.bg },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStyles[size].text,
          { color: colors.text },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
});

StatusChip.displayName = 'StatusChip';

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 12,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  containerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  containerLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  text: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    textTransform: 'capitalize',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 11,
  },
  textLarge: {
    fontSize: 13,
  },
});

export default StatusChip;
