/**
 * TransactionCard Component
 * Displays transaction details with status and type indicators
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { theme } from '../../theme';
import type { Contribution } from '../../types/transaction';

interface TransactionCardProps {
  transaction: Contribution;
  onPress?: () => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onPress }) => {
  const isCredit = transaction.status !== 'refunded';
  
  const dateObj = transaction.paidDate?.toDate?.() || transaction.createdAt?.toDate?.() || new Date();
  const dateStr = dateObj.toLocaleDateString();
  
  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'approved':
        return <CheckCircle size={16} color="#2E7D32" />;
      case 'failed':
        return <XCircle size={16} color="#C62828" />;
      default:
        return <Clock size={16} color="#F57C00" />;
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'approved':
        return '#E8F5E9';
      case 'failed':
        return '#FFEBEE';
      default:
        return '#FFF3E0';
    }
  };

  const getStatusTextColor = () => {
    switch (transaction.status) {
      case 'approved':
        return '#2E7D32';
      case 'failed':
        return '#C62828';
      default:
        return '#E65100';
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: isCredit ? '#E0F2F1' : '#FFEBEE' }]}>
        {isCredit ? (
          <ArrowDownLeft size={24} color="#00695C" />
        ) : (
          <ArrowUpRight size={24} color="#C62828" />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.userName}>{transaction.userName || transaction.memberName}</Text>
          <Text style={[styles.amount, { color: isCredit ? '#2E7D32' : '#C62828' }]}>
            {isCredit ? '+' : '-'}₹{transaction.amount.toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.bottomRow}>
          <Text style={styles.groupName}>{transaction.groupName || 'Group'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            {getStatusIcon()}
            <Text style={[styles.statusText, { color: getStatusTextColor() }]}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.date}>{dateStr}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Squircle
    padding: 16,
    ...theme.shadows.soft,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121723',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  date: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
});
