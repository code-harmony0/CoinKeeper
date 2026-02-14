import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../theme/designTokens';

export type Transaction = {
  id: string;
  name: string;
  date: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  icon: React.ReactNode;
};

export const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
  const isIncome = transaction.type === 'income';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {transaction.icon}
      </View>
      <View style={styles.details}>
        <Text style={styles.name}>{transaction.name}</Text>
        <Text style={styles.date}>{transaction.date}</Text>
      </View>
      <View style={styles.amountContainer}>
         <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
            {isIncome ? '+' : '-'}{transaction.amount}
        </Text>
        {isIncome 
            ? <ArrowDownLeft size={16} color={colors.primary} /> 
            : <ArrowUpRight size={16} color={styles.expense.color} />
        }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    marginHorizontal: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.m,
    backgroundColor: colors.pillBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  details: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontFamily: 'Inter-Medium',
    color: colors.textTitle,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    ...typography.body,
    fontFamily: 'Inter-SemiBold',
    marginRight: spacing.s,
  },
  income: {
    color: colors.primary,
  },
  expense: {
    color: colors.accent,
  },
});
