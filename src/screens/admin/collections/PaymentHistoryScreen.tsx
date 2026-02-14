import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { CheckCircle, XCircle, Calendar, Search, Filter } from 'lucide-react-native';
import type { PaymentHistory, PaymentMethod } from '../../../types/collection';
import firestore from '@react-native-firebase/firestore';

// Mock payment history data (mix of successful and failed payments)
const DUMMY_HISTORY: PaymentHistory[] = [
  {
    id: '1',
    groupId: 'group1',
    groupName: 'Monthly Savings Group',
    memberId: 'member1',
    memberName: 'Sanjay Kumar',
    memberPhone: '+919876543230',
    amount: 5000,
    paymentDate: firestore.Timestamp.fromDate(new Date(2025, 11, 5)),
    paymentMethod: 'upi' as PaymentMethod,
    transactionId: 'TXN1234567890',
    status: 'paid',
    receiptUrl: '',
    notes: 'Payment via UPI',
    recordedBy: 'admin1',
    recordedDate: firestore.Timestamp.fromDate(new Date(2025, 11, 5)),
    createdAt: firestore.Timestamp.fromDate(new Date(2025, 11, 5)),
    updatedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 5)),
  },
  {
    id: '2',
    groupId: 'group2',
    groupName: 'Family Chit Fund',
    memberId: 'member2',
    memberName: 'Meera Iyer',
    memberPhone: '+919876543231',
    amount: 7500,
    paymentDate: firestore.Timestamp.fromDate(new Date(2025, 11, 3)),
    paymentMethod: 'cash' as PaymentMethod,
    status: 'paid',
    receiptUrl: '',
    notes: 'Cash payment collected',
    recordedBy: 'admin1',
    recordedDate: firestore.Timestamp.fromDate(new Date(2025, 11, 3)),
    createdAt: firestore.Timestamp.fromDate(new Date(2025, 11, 3)),
    updatedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 3)),
  },
  {
    id: '3',
    groupId: 'group3',
    groupName: 'Office Colleagues Fund',
    memberId: 'member3',
    memberName: 'Rajesh Nair',
    memberPhone: '+919876543232',
    amount: 3000,
    paymentDate: firestore.Timestamp.fromDate(new Date(2025, 11, 1)),
    paymentMethod: 'bank_transfer' as PaymentMethod,
    transactionId: 'TXN0987654321',
    status: 'paid',
    receiptUrl: '',
    notes: 'Bank transfer completed',
    recordedBy: 'admin1',
    recordedDate: firestore.Timestamp.fromDate(new Date(2025, 11, 1)),
    createdAt: firestore.Timestamp.fromDate(new Date(2025, 11, 1)),
    updatedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 1)),
  },
  {
    id: '4',
    groupId: 'group1',
    groupName: 'Monthly Savings Group',
    memberId: 'member4',
    memberName: 'Pooja Desai',
    memberPhone: '+919876543233',
    amount: 5000,
    paymentDate: firestore.Timestamp.fromDate(new Date(2025, 10, 28)),
    paymentMethod: 'upi' as PaymentMethod,
    transactionId: 'TXN1122334455',
    status: 'failed',
    failureReason: 'Insufficient funds',
    receiptUrl: '',
    notes: 'Payment failed - UPI transaction declined',
    recordedBy: 'admin1',
    recordedDate: firestore.Timestamp.fromDate(new Date(2025, 10, 28)),
    createdAt: firestore.Timestamp.fromDate(new Date(2025, 10, 28)),
    updatedAt: firestore.Timestamp.fromDate(new Date(2025, 10, 28)),
  },
  {
    id: '5',
    groupId: 'group2',
    groupName: 'Family Chit Fund',
    memberId: 'member5',
    memberName: 'Anil Reddy',
    memberPhone: '+919876543234',
    amount: 7500,
    paymentDate: firestore.Timestamp.fromDate(new Date(2025, 10, 25)),
    paymentMethod: 'cheque' as PaymentMethod,
    transactionId: 'CHQ123456',
    status: 'pending',
    receiptUrl: '',
    notes: 'Cheque submitted - pending clearance',
    recordedBy: 'admin1',
    recordedDate: firestore.Timestamp.fromDate(new Date(2025, 10, 25)),
    createdAt: firestore.Timestamp.fromDate(new Date(2025, 10, 25)),
    updatedAt: firestore.Timestamp.fromDate(new Date(2025, 10, 25)),
  },
  {
    id: '6',
    groupId: 'group3',
    groupName: 'Office Colleagues Fund',
    memberId: 'member6',
    memberName: 'Divya Pillai',
    memberPhone: '+919876543235',
    amount: 3000,
    paymentDate: firestore.Timestamp.fromDate(new Date(2025, 10, 20)),
    paymentMethod: 'cash' as PaymentMethod,
    status: 'paid',
    receiptUrl: '',
    notes: 'Cash payment received',
    recordedBy: 'admin1',
    recordedDate: firestore.Timestamp.fromDate(new Date(2025, 10, 20)),
    createdAt: firestore.Timestamp.fromDate(new Date(2025, 10, 20)),
    updatedAt: firestore.Timestamp.fromDate(new Date(2025, 10, 20)),
  },
];

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

type FilterStatus = 'all' | 'paid' | 'failed' | 'pending';

interface Props {
  navigation: any;
}

const StatusChip: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    onPress={() => {
      ReactNativeHapticFeedback.trigger('selection');
      onPress();
    }}
    style={[styles.statusChip, isActive && styles.activeStatusChip]}>
    <Text style={[styles.statusChipText, isActive && styles.activeStatusChipText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const HistoryCard: React.FC<{
  payment: PaymentHistory;
  index: number;
  onPress: () => void;
}> = ({ payment, index, onPress }) => {
  const paymentDate = payment.paymentDate.toDate();
  const formattedDate = paymentDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getStatusIcon = () => {
    switch (payment.status) {
      case 'paid':
        return <CheckCircle size={20} color="#5cb85c" />;
      case 'failed':
        return <XCircle size={20} color="#D32F2F" />;
      default:
        return <Calendar size={20} color="#f0ad4e" />;
    }
  };

  const getStatusColor = () => {
    switch (payment.status) {
      case 'paid':
        return '#5cb85c';
      case 'failed':
        return '#D32F2F';
      default:
        return '#f0ad4e';
    }
  };

  const getMethodLabel = () => {
    const labels: Record<PaymentMethod, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      card: 'Card',
      auto_debit: 'Auto Debit',
    };
    return labels[payment.paymentMethod] || payment.paymentMethod;
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify(SPRING_CONFIG)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {getStatusIcon()}
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.memberName}>{payment.memberName}</Text>
          <Text style={styles.groupName}>{payment.groupName}</Text>
          <Text style={styles.amount}>₹{payment.amount.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodText}>{getMethodLabel()}</Text>
          </View>
          {payment.transactionId && (
            <Text style={styles.transactionId}>ID: {payment.transactionId}</Text>
          )}
        </View>

        {payment.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {payment.notes}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredPayments = useMemo(() => {
    return DUMMY_HISTORY.filter(payment => {
      // Filter by status
      if (filterStatus !== 'all' && payment.status !== filterStatus) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          payment.memberName.toLowerCase().includes(query) ||
          payment.groupName.toLowerCase().includes(query) ||
          payment.transactionId?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const paid = DUMMY_HISTORY.filter(p => p.status === 'paid').reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const failed = DUMMY_HISTORY.filter(p => p.status === 'failed').length;
    const pending = DUMMY_HISTORY.filter(p => p.status === 'pending').length;
    return { paid, failed, pending };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handlePaymentPress = (payment: PaymentHistory) => {
    console.log('Payment history pressed:', payment.id);
    // TODO: Navigate to payment receipt/details
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).springify(SPRING_CONFIG)} style={styles.header}>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSubtitle}>
          ₹{stats.paid.toLocaleString('en-IN')} collected • {stats.failed} failed • {stats.pending}{' '}
          pending
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
        style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          placeholder="Search by name, group or transaction ID..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </Animated.View>

      {/* Status Filter Chips */}
      <Animated.View
        entering={FadeInDown.delay(150).springify(SPRING_CONFIG)}
        style={styles.filterContainer}>
        <Filter size={18} color="#666" />
        <StatusChip label="All" isActive={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
        <StatusChip label="Paid" isActive={filterStatus === 'paid'} onPress={() => setFilterStatus('paid')} />
        <StatusChip label="Failed" isActive={filterStatus === 'failed'} onPress={() => setFilterStatus('failed')} />
        <StatusChip label="Pending" isActive={filterStatus === 'pending'} onPress={() => setFilterStatus('pending')} />
      </Animated.View>

      {/* History List */}
      <FlatList
        data={filteredPayments}
        renderItem={({ item, index }) => (
          <HistoryCard payment={item} index={index} onPress={() => handlePaymentPress(item)} />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#121723" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <CheckCircle size={64} color="#CCC" />
            <Text style={styles.emptyText}>No payment history</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No payments recorded yet'}
            </Text>
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
    fontSize: 13,
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
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  activeStatusChip: {
    backgroundColor: '#121723',
    borderColor: '#121723',
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#666',
  },
  activeStatusChipText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#999',
  },
  cardBody: {
    marginBottom: 12,
  },
  memberName: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
    marginBottom: 8,
  },
  amount: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  methodText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#666',
  },
  transactionId: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#999',
  },
  notes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
    fontStyle: 'italic',
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

export default PaymentHistoryScreen;
