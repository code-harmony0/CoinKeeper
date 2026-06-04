import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Send, Download, Plus, MoreHorizontal } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../../theme/designTokens';

const actions = [
  { icon: Send, label: 'Send' },
  { icon: Download, label: 'Request' },
  { icon: Plus, label: 'Top Up' },
  { icon: MoreHorizontal, label: 'More' },
];

const QuickAction = ({ icon: Icon, label }: { icon: React.ElementType, label: string }) => (
  <TouchableOpacity style={styles.action}>
    <View style={styles.iconContainer}>
      <Icon color={colors.primary} size={24} />
    </View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

export const QuickActionsRow = () => (
    <View style={styles.container}>
        {actions.map(action => <QuickAction key={action.label} {...action} />)}
    </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: spacing.l,
    marginVertical: spacing.l,
  },
  action: { 
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
    ...shadows.card,
  },
  label: { 
    ...(typography.bodySmall as any),
  },
});