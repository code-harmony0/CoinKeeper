import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { ShoppingCart, Film, Droplets, ArrowDownLeft } from 'lucide-react-native';
import { Transaction, TransactionRow } from '../transaction/TransactionRow';
import { SectionHeader } from '../home/SectionHeader';
import { colors, spacing, radii, shadows } from '../../theme/designTokens';

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', name: 'Spotify', date: 'Today, 10:00 AM', amount: '$9.99', type: 'expense', category: 'Entertainment', icon: <Film size={24} color={colors.accent} /> },
  { id: '2', name: 'Income', date: 'Yesterday, 02:30 PM', amount: '$1,200.00', type: 'income', category: 'Salary', icon: <ArrowDownLeft size={24} color={colors.primary} /> },
  { id: '3', name: 'Amazon', date: '28 Nov, 08:20 AM', amount: '$42.50', type: 'expense', category: 'Shopping', icon: <ShoppingCart size={24} color={colors.accent} /> },
   { id: '4', name: 'Water Bill', date: '27 Nov, 01:15 PM', amount: '$24.00', type: 'expense', category: 'Bills', icon: <Droplets size={24} color={colors.accent} /> },
];

export const RecentTransactions = () => (
  <View style={styles.container}>
    <SectionHeader title="Recent Transactions" onSeeAll={() => {}} />
    <View style={styles.listContainer}>
        <FlatList
            data={MOCK_TRANSACTIONS}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <TransactionRow transaction={item} />}
            scrollEnabled={false}
        />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.l,
  },
  listContainer: {
    marginHorizontal: spacing.l,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    ...shadows.card,
    paddingVertical: spacing.s,
  }
});
