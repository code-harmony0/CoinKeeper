import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Wallet, ArrowUp, ArrowDown, Plus, Minus, TrendingUp } from 'lucide-react-native';
import type { WalletTransaction } from '../../../types/wallet';
import firestore from '@react-native-firebase/firestore';

// Mock wallet data
const DUMMY_BALANCE = 125000;
const DUMMY_TOTAL_DEPOSITS = 250000;
const DUMMY_TOTAL_WITHDRAWALS = 125000;

const DUMMY_RECENT_TRANSACTIONS: WalletTransaction[] = [
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
];

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

interface Props {
  navigation: any;
}

const TransactionItem: React.FC<{
  transaction: WalletTransaction;
  index: number;
}> = ({ transaction, index }) => {
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
    <Animated.View entering={FadeInDown.delay(index * 50).springify(SPRING_CONFIG)}>
      <View style={styles.transactionItem}>
        <View style={[styles.txnIcon, { backgroundColor: isCredit ? '#E8F5E9' : '#FFEBEE' }]}>
          {isCredit ? (
            <ArrowDown size={20} color="#5cb85c" />
          ) : (
            <ArrowUp size={20} color="#D32F2F" />
          )}
        </View>
        <View style={styles.txnDetails}>
          <Text style={styles.txnDescription}>{transaction.description}</Text>
          <Text style={styles.txnDate}>{formattedDate} • {formattedTime}</Text>
        </View>
        <Text style={[styles.txnAmount, { color: isCredit ? '#5cb85c' : '#D32F2F' }]}>
          {isCredit ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    </Animated.View>
  );
};

export const WalletOverviewScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [balance] = useState(DUMMY_BALANCE);
  const [totalDeposits] = useState(DUMMY_TOTAL_DEPOSITS);
  const [totalWithdrawals] = useState(DUMMY_TOTAL_WITHDRAWALS);
  const [recentTransactions] = useState(DUMMY_RECENT_TRANSACTIONS);

  const handleAddFunds = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('AddFunds');
  };

  const handleWithdraw = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('WithdrawFunds');
  };

  const handleViewAllTransactions = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.navigate('TransactionHistory');
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify(SPRING_CONFIG)}
          style={styles.header}>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <Text style={styles.headerSubtitle}>Manage your funds</Text>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View
          entering={FadeInDown.delay(50).springify(SPRING_CONFIG)}
          style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Wallet size={28} color="#FFFFFF" />
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>₹{balance.toLocaleString('en-IN')}</Text>
          <View style={styles.balanceFooter}>
            <TrendingUp size={16} color="#FFFFFF" />
            <Text style={styles.balanceGrowth}>+12.5% this month</Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
          style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={handleAddFunds}
            style={[styles.actionButton, styles.addFundsButton]}>
            <Plus size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWithdraw}
            style={[styles.actionButton, styles.withdrawButton]}>
            <Minus size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Statistics */}
        <Animated.View
          entering={FadeInDown.delay(150).springify(SPRING_CONFIG)}
          style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <ArrowDown size={20} color="#5cb85c" />
            </View>
            <Text style={styles.statLabel}>Total Deposits</Text>
            <Text style={styles.statValue}>₹{totalDeposits.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFEBEE' }]}>
              <ArrowUp size={20} color="#D32F2F" />
            </View>
            <Text style={styles.statLabel}>Total Withdrawals</Text>
            <Text style={styles.statValue}>₹{totalWithdrawals.toLocaleString('en-IN')}</Text>
          </View>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View
          entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
          style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={handleViewAllTransactions}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.map((txn, index) => (
            <TransactionItem key={txn.id} transaction={txn} index={index} />
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C2DFF7',
  },
  scrollContent: {
    paddingBottom: 40,
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
  balanceCard: {
    backgroundColor: '#121723',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#CCCCCC',
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceGrowth: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#5cb85c',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addFundsButton: {
    backgroundColor: '#5cb85c',
  },
  withdrawButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  transactionsSection: {
    paddingHorizontal: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#2196F3',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
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
    marginBottom: 4,
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
});

export default WalletOverviewScreen;
