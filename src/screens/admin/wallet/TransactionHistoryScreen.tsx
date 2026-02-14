import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { ArrowUp, ArrowDown, Search, Calendar } from 'lucide-react-native';
import type { WalletTransaction } from '../../../types/wallet';
import firestore from '@react-native-firebase/firestore';

// Mock transaction data (15 transactions)
const DUMMY_TRANSACTIONS: WalletTransaction[] = [
  {
    id: '1',
    userId: 'admin1',
    type: 'credit',
    amount: 25000,
    description: 'Draw winnings from Monthly Savings Group',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 11, 5, 14, 30)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '2',
    userId: 'admin1',
    type: 'debit',
    amount: 10000,
    description: 'Withdrawal to Bank Account',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 11, 4, 10, 15)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '3',
    userId: 'admin1',
    type: 'credit',
    amount: 50000,
    description: 'Deposit from Family Chit Fund',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 11, 3, 16, 45)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '4',
    userId: 'admin1',
    type: 'debit',
    amount: 15000,
    description: 'Payment to Group Member',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 11, 2, 11, 20)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '5',
    userId: 'admin1',
    type: 'credit',
    amount: 20000,
    description: 'Group contribution received',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 11, 1, 9, 10)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '6',
    userId: 'admin1',
    type: 'debit',
    amount: 8000,
    description: 'Refund to member',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 10, 28, 15, 30)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '7',
    userId: 'admin1',
    type: 'credit',
    amount: 30000,
    description: 'Monthly collection received',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 10, 25, 10, 0)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '8',
    userId: 'admin1',
    type: 'debit',
    amount: 12000,
    description: 'Withdrawal to Bank',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 10, 20, 14, 45)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '9',
    userId: 'admin1',
    type: 'credit',
    amount: 45000,
    description: 'Draw prize collection',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 10, 15, 16, 20)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '10',
    userId: 'admin1',
    type: 'debit',
    amount: 20000,
    description: 'Emergency fund payout',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 10, 10, 11, 0)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '11',
    userId: 'admin1',
    type: 'credit',
    amount: 15000,
    description: 'Member joining fee',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 10, 5, 9, 30)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '12',
    userId: 'admin1',
    type: 'credit',
    amount: 25000,
    description: 'Group savings deposit',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 9, 28, 10, 15)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '13',
    userId: 'admin1',
    type: 'debit',
    amount: 18000,
    description: 'Withdrawal to personal account',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 9, 22, 14, 0)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '14',
    userId: 'admin1',
    type: 'credit',
    amount: 35000,
    description: 'Interest earned on savings',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 9, 15, 9, 0)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '15',
    userId: 'admin1',
    type: 'debit',
    amount: 10000,
    description: 'Administrative fee payment',
    timestamp: firestore.Timestamp.fromDate(new Date(2025, 9, 10, 11, 30)),
    status: 'completed',
    createdAt: firestore.Timestamp.now(),
  },
];

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

type FilterType = 'all' | 'credit' | 'debit';

interface Props {
  navigation: any;
}

const FilterButton: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    onPress={() => {
      ReactNativeHapticFeedback.trigger('selection');
      onPress();
    }}
    style={[styles.filterButton, isActive && styles.activeFilterButton]}>
    <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const TransactionCard: React.FC<{
  transaction: WalletTransaction;
  index: number;
  onPress: () => void;
}> = ({ transaction, index, onPress }) => {
  const txnDate = transaction.timestamp.toDate();
  const formattedDate = txnDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = txnDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isCredit = transaction.type === 'credit';

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).springify(SPRING_CONFIG)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={styles.transactionCard}>
        <View style={[styles.txnIcon, { backgroundColor: isCredit ? '#E8F5E9' : '#FFEBEE' }]}>
          {isCredit ? (
            <ArrowDown size={20} color="#5cb85c" />
          ) : (
            <ArrowUp size={20} color="#D32F2F" />
          )}
        </View>
        <View style={styles.txnDetails}>
          <Text style={styles.txnDescription}>{transaction.description}</Text>
          <View style={styles.txnFooter}>
            <Calendar size={12} color="#999" />
            <Text style={styles.txnDate}>{formattedDate} • {formattedTime}</Text>
          </View>
        </View>
        <Text style={[styles.txnAmount, { color: isCredit ? '#5cb85c' : '#D32F2F' }]}>
          {isCredit ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const TransactionHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredTransactions = useMemo(() => {
    let filtered = DUMMY_TRANSACTIONS;

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(txn => txn.type === filter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(txn =>
        txn.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [filter, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleTransactionPress = (transaction: WalletTransaction) => {
    console.log('Transaction pressed:', transaction.id);
    // TODO: Navigate to transaction details or show modal
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(0).springify(SPRING_CONFIG)}
        style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.headerSubtitle}>
          {filteredTransactions.length} transactions
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(50).springify(SPRING_CONFIG)}
        style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          placeholder="Search transactions..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </Animated.View>

      {/* Filter Buttons */}
      <Animated.View
        entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
        style={styles.filterContainer}>
        <FilterButton
          label="All"
          isActive={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterButton
          label="Credits"
          isActive={filter === 'credit'}
          onPress={() => setFilter('credit')}
        />
        <FilterButton
          label="Debits"
          isActive={filter === 'debit'}
          onPress={() => setFilter('debit')}
        />
      </Animated.View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={({ item, index }) => (
          <TransactionCard
            transaction={item}
            index={index}
            onPress={() => handleTransactionPress(item)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Search size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>Try a different search or filter</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C2DFF7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#121723',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#121723',
    borderColor: '#121723',
  },
  filterButtonText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnDetails: {
    flex: 1,
  },
  txnDescription: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#121723',
    marginBottom: 6,
  },
  txnFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txnDate: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#999',
  },
  txnAmount: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#BBB',
    textAlign: 'center',
  },
});

export default TransactionHistoryScreen;
