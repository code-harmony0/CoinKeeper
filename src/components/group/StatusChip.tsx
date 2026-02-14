/**
 * StatusChip Component
 * Displays group status with appropriate colors and styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GroupStatus } from '../../types/group';
import { theme } from '../../theme';

interface StatusChipProps {
  status: GroupStatus;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<
  GroupStatus,
  { label: string; backgroundColor: string; textColor: string }
> = {
  active: {
    label: 'Active',
    backgroundColor: '#E8F5E9',
    textColor: '#2E7D32',
  },
  inactive: {
    label: 'Inactive',
    backgroundColor: '#FFF3E0',
    textColor: '#E65100',
  },
  closed: {
    label: 'Closed',
    backgroundColor: '#F5F5F5',
    textColor: '#616161',
  },
  pending: {
    label: 'Pending',
    backgroundColor: '#E3F2FD',
    textColor: '#1565C0',
  },
};

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'medium' }) => {
  const config = STATUS_CONFIG[status];
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
