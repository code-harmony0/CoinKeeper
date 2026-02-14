/**
 * TransactionsScreen
 * List of all transactions with search and filter
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Search, Plus, Filter } from 'lucide-react-native';
import { theme } from '../../../theme';
import { useTransactions, TransactionStatus } from '../../../hooks/useTransactions';
import { TransactionCard } from '../../../components/transaction/TransactionCard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface TransactionsScreenProps {
  navigation: any;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions, isLoading } = useTransactions();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TransactionStatus | 'all'>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.groupName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || txn.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, activeFilter]);

  const handleAddTransaction = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('AddTransaction');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <Text style={styles.headerSubtitle}>{transactions.length} Total</Text>
      </Animated.View>

      {/* Search & Filter */}
      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <FlatList
          horizontal
          data={['all', 'pending', 'approved', 'rejected'] as const}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterChip,
                activeFilter === item && styles.filterChipActive,
              ]}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('selection');
                setActiveFilter(item);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === item && styles.filterTextActive,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#121723" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
              <TransactionCard 
                transaction={item} 
                onPress={() => navigation.navigate('TransactionDetails', { transactionId: item.id })}
              />
            </Animated.View>
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.fabContainer, { bottom: insets.bottom + 100 }]}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={handleAddTransaction}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.fabText}>Add Transaction</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#121723',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  controls: {
    padding: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    ...theme.shadows.soft,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#121723',
    height: '100%',
  },
  filterList: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#121723',
    borderColor: '#121723',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textTertiary,
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignSelf: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121723',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 32,
    ...theme.shadows.medium,
    gap: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
