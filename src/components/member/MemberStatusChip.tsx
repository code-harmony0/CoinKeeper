/**
 * MemberStatusChip Component
 * Displays member status with appropriate colors
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending';

interface MemberStatusChipProps {
  status: MemberStatus;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<
  MemberStatus,
  { label: string; backgroundColor: string; textColor: string }
> = {
  active: {
    label: 'Active',
    backgroundColor: '#E8F5E9',
    textColor: '#2E7D32',
  },
  inactive: {
    label: 'Inactive',
    backgroundColor: '#F5F5F5',
    textColor: '#616161',
  },
  suspended: {
    label: 'Suspended',
    backgroundColor: '#FFEBEE',
    textColor: '#C62828',
  },
  pending: {
    label: 'Pending',
    backgroundColor: '#FFF3E0',
    textColor: '#E65100',
  },
};

export const MemberStatusChip: React.FC<MemberStatusChipProps> = ({ status, size = 'medium' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.backgroundColor },
        isSmall && styles.containerSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.textColor },
          isSmall && styles.textSmall,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  containerSmall: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.xs,
  },
  text: {
    fontSize: theme.fonts.size.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
});
