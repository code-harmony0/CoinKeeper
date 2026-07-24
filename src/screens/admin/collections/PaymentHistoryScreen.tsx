import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { CheckCircle, XCircle, Calendar, Search, Filter } from 'lucide-react-native';
import { paymentService } from '../../../services/paymentService';
import type { Payment, PaymentStatus } from '../../../types/payment';
import { COLORS } from '../../../theme/colors';

// SPRING_CONFIG removed for chained methods

type FilterStatus = 'all' | 'success' | 'failed' | 'initiated';

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
  payment: Payment;
  index: number;
  onPress: () => void;
}> = ({ payment, index, onPress }) => {
  const paymentDate = payment.createdAt ? payment.createdAt.toDate() : new Date();
  const formattedDate = paymentDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getStatusIcon = () => {
    switch (payment.status) {
      case 'success':
        return <CheckCircle size={20} color={COLORS.successGreen} />;
      case 'failed':
        return <XCircle size={20} color={COLORS.errorCoral} />;
      default:
        return <Calendar size={20} color={COLORS.warningAmber} />;
    }
  };

  const getStatusColor = () => {
    switch (payment.status) {
      case 'success':
        return COLORS.successGreen;
      case 'failed':
        return COLORS.errorCoral;
      default:
        return COLORS.warningAmber;
    }
  };

  const getMethodLabel = () => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      card: 'Card',
      auto_debit: 'Auto Debit',
      gateway: 'Gateway',
      manual: 'Manual',
    };
    return labels[payment.method] || payment.method;
  };

  const displayStatus = () => {
    if (payment.status === 'success') return 'Paid';
    if (payment.status === 'initiated') return 'Pending';
    return payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(16).stiffness(140).mass(1)}>
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
              {displayStatus()}
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

        {!!payment.metadata?.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {String(payment.metadata.notes)}
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const result = await paymentService.getPaymentHistory({
        status: filterStatus !== 'all' ? [filterStatus as PaymentStatus] : undefined,
      }, { limit: 50, orderBy: 'createdAt', orderDirection: 'desc' });
      setPayments(result.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery) return payments;
    
    const query = searchQuery.toLowerCase();
    return payments.filter(payment => {
      return (
        payment.memberName.toLowerCase().includes(query) ||
        payment.groupName.toLowerCase().includes(query) ||
        payment.transactionId?.toLowerCase().includes(query)
      );
    });
  }, [payments, searchQuery]);

  const stats = useMemo(() => {
    const paid = payments.filter(p => p.status === 'success').reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const failed = payments.filter(p => p.status === 'failed').length;
    const pending = payments.filter(p => p.status === 'initiated').length;
    return { paid, failed, pending };
  }, [payments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const handlePaymentPress = (payment: Payment) => {
    console.log('Payment history pressed:', payment.id);
    // Navigate to details if needed
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).springify().damping(16).stiffness(140).mass(1)} style={styles.header}>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSubtitle}>
          ₹{stats.paid.toLocaleString('en-IN')} collected • {stats.failed} failed • {stats.pending}{' '}
          pending
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify().damping(16).stiffness(140).mass(1)}
        style={styles.searchContainer}>
        <Search size={20} color={COLORS.iconSecondary} />
        <TextInput
          placeholder="Search by name, group or transaction ID..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </Animated.View>

      {/* Status Filter Chips */}
      <Animated.View
        entering={FadeInDown.delay(150).springify().damping(16).stiffness(140).mass(1)}
        style={styles.filterContainer}>
        <Filter size={18} color={COLORS.iconSecondary} />
        <StatusChip label="All" isActive={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
        <StatusChip label="Paid" isActive={filterStatus === 'success'} onPress={() => setFilterStatus('success')} />
        <StatusChip label="Failed" isActive={filterStatus === 'failed'} onPress={() => setFilterStatus('failed')} />
        <StatusChip label="Pending" isActive={filterStatus === 'initiated'} onPress={() => setFilterStatus('initiated')} />
      </Animated.View>

      {/* History List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
          renderItem={({ item, index }) => (
            <HistoryCard payment={item} index={index} onPress={() => handlePaymentPress(item)} />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryBlue} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CheckCircle size={64} color={COLORS.borderGray} />
              <Text style={styles.emptyText}>No payment history</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search' : 'No payments recorded yet'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: COLORS.neumorphic.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textPrimary,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  activeStatusChip: {
    backgroundColor: COLORS.primaryBlue,
    borderColor: COLORS.primaryBlue,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.textSecondary,
  },
  activeStatusChipText: {
    color: COLORS.textOnPrimary,
  },
  listContent: {
    paddingBottom: 20,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: COLORS.neumorphic.shadow,
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
    fontFamily: 'Satoshi-Bold',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textTertiary,
  },
  cardBody: {
    marginBottom: 12,
  },
  memberName: {
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  groupName: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 22,
    fontFamily: 'Satoshi-Black',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  methodText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Bold',
    color: COLORS.textSecondary,
  },
  transactionId: {
    fontSize: 10,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textTertiary,
  },
  notes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textSecondary,
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
    fontFamily: 'Satoshi-Black',
    color: COLORS.textTertiary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
});

export default PaymentHistoryScreen;
