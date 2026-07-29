/**
 * TransactionRow Component
 * Displays transaction information in a list
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react-native';
import type { GroupTransaction } from '../../types/group';
import { theme } from '../../../../theme';

interface TransactionRowProps {
  transaction: GroupTransaction;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const isIncome = transaction.type === 'income' || transaction.type === 'contribution';

  const getIcon = () => {
    if (transaction.type === 'contribution') {
      return <DollarSign size={18} color="#1976D2" strokeWidth={2.5} />;
    }
    return isIncome ? (
      <ArrowDownLeft size={18} color="#2E7D32" strokeWidth={2.5} />
    ) : (
      <ArrowUpRight size={18} color="#D32F2F" strokeWidth={2.5} />
    );
  };

  const getIconBackgroundColor = () => {
    if (transaction.type === 'contribution') return '#E3F2FD';
    return isIncome ? '#E8F5E9' : '#FFEBEE';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed':
        return '#2E7D32';
      case 'pending':
        return '#F57C00';
      case 'failed':
        return '#D32F2F';
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: getIconBackgroundColor() }]}>
        {getIcon()}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.memberName} numberOfLines={1}>
          {transaction.memberName}
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>

      {/* Amount & Status */}
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? '#2E7D32' : '#D32F2F' },
          ]}
        >
          {isIncome ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </Text>
        {transaction.status !== 'completed' && (
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        )}
      </View>
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  info: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  memberName: {
    fontSize: theme.fonts.size.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  description: {
    fontSize: theme.fonts.size.xs,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  date: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: theme.fonts.size.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
