import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Calendar, Clock, CheckCircle, Search, AlertCircle, Bell, TrendingUp } from 'lucide-react-native';
import type { ScheduledPayment, ScheduledPaymentStatus } from '../../../types/payment';
import { useUpcomingPayments } from '../../../hooks/useScheduledPayments';
import { useTabBarScroll } from '../../../../../context/TabBarScrollContext';
import { COLORS } from '../../../../../theme/colors';

// SPRING_CONFIG removed for chained methods

type FilterStatus = 'all' | 'pending' | 'reminded';

interface Props {
  navigation: any;
  route?: { params?: { groupId?: string } };
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

const PaymentCard: React.FC<{
  payment: ScheduledPayment;
  index: number;
  onPress: () => void;
  onRemind: () => void;
}> = ({ payment, index, onPress, onRemind }) => {
  const dueDate = payment.dueDate?.toDate?.() ?? new Date();
  const formattedDate = dueDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getStatusColor = () => {
    switch (payment.status) {
      case 'pending':
        return COLORS.successGreen;
      case 'reminded':
        return COLORS.warningAmber;
      case 'overdue':
        return COLORS.errorCoral;
      default:
        return COLORS.textTertiary;
    }
  };

  const getStatusLabel = () => {
    switch (payment.status) {
      case 'pending':
        return 'Scheduled';
      case 'reminded':
        return 'Reminded';
      case 'overdue':
        return 'Overdue';
      case 'paid':
        return 'Paid';
      default:
        return payment.status;
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(16).stiffness(140).mass(1)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={styles.paymentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Calendar size={20} color={COLORS.textPrimary} />
            <Text style={styles.dueDate}>{formattedDate}</Text>
          </View>
          {payment.remindersSent > 0 && (
            <View style={styles.remindedBadge}>
              <Bell size={14} color={COLORS.warningAmber} />
              <Text style={styles.remindedText}>{payment.remindersSent}x</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.memberName}>{payment.memberName}</Text>
          <Text style={styles.groupName}>{payment.groupName}</Text>
          <Text style={styles.amount}>₹{payment.amount.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <CheckCircle size={14} color={COLORS.surface} />
            <Text style={styles.statusText}>{getStatusLabel()}</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              ReactNativeHapticFeedback.trigger('impactMedium');
              onRemind();
            }}
            style={styles.remindButton}>
            <Bell size={16} color={COLORS.primaryBlue} />
            <Text style={styles.remindButtonText}>Remind</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const UpcomingPaymentsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Extract groupId from route params if available
  const groupId = route?.params?.groupId;

  // Use real data from hook
  const { payments, isLoading, error, refresh } = useUpcomingPayments(7, groupId);

  // Scroll handler for auto-hiding tab bar
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // Filter by status
      if (filterStatus !== 'all' && payment.status !== filterStatus) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          payment.memberName?.toLowerCase().includes(query) ||
          payment.groupName?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [payments, filterStatus, searchQuery]);

  const handlePaymentPress = useCallback((payment: ScheduledPayment) => {
    navigation.navigate('ContributionDetail', { paymentId: payment.id, payment });
  }, [navigation]);

  const handleSendReminder = useCallback((payment: ScheduledPayment) => {
    Alert.alert(
      'Send Reminder',
      `Send payment reminder to ${payment.memberName} for ₹${payment.amount.toLocaleString('en-IN')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            Alert.alert('Sent', `Reminder sent to ${payment.memberName}`);
          },
        },
      ],
    );
  }, []);

  // Calculate collection rate from filtered data
  const collectionRate = useMemo(() => {
    if (payments.length === 0) return 0;
    const paid = payments.filter(p => p.status === 'paid').length;
    return Math.round((paid / payments.length) * 100);
  }, [payments]);

  // Loading state
  if (isLoading && payments.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && payments.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <AlertCircle size={48} color={COLORS.errorCoral} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(0).springify().damping(16).stiffness(140).mass(1)}
        style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Payments</Text>
        <Text style={styles.headerSubtitle}>
          {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} due
        </Text>
      </Animated.View>

      {/* Collection Rate Bar */}
      <Animated.View
        entering={FadeInDown.delay(50).springify().damping(16).stiffness(140).mass(1)}
        style={styles.rateBar}>
        <View style={styles.rateInfo}>
          <TrendingUp size={18} color={COLORS.successGreen} />
          <Text style={styles.rateLabel}>Collection Rate</Text>
        </View>
        <View style={styles.rateTrack}>
          <View style={[styles.rateFill, { width: `${collectionRate}%` }]} />
        </View>
        <Text style={styles.rateValue}>{collectionRate}%</Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify().damping(16).stiffness(140).mass(1)}
        style={styles.searchContainer}>
        <Search size={20} color={COLORS.textSecondary} />
        <TextInput
          placeholder="Search by member or group..."
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
        <StatusChip
          label="All"
          isActive={filterStatus === 'all'}
          onPress={() => setFilterStatus('all')}
        />
        <StatusChip
          label="Pending"
          isActive={filterStatus === 'pending'}
          onPress={() => setFilterStatus('pending')}
        />
        <StatusChip
          label="Reminded"
          isActive={filterStatus === 'reminded'}
          onPress={() => setFilterStatus('reminded')}
        />
      </Animated.View>

      {/* Payments List */}
      <Animated.FlatList
        data={filteredPayments}
        renderItem={({ item, index }) => (
          <PaymentCard
            payment={item}
            index={index}
            onPress={() => handlePaymentPress(item)}
            onRemind={() => handleSendReminder(item)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.primaryBlue} />
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Clock size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No upcoming payments</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'All payments are up to date!'}
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
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textSecondary,
  },
  rateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: COLORS.neumorphic.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateLabel: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.textSecondary,
  },
  rateTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    backgroundColor: COLORS.successGreen,
    borderRadius: 3,
  },
  rateValue: {
    fontSize: 14,
    fontFamily: 'Satoshi-Black',
    color: COLORS.successGreen,
    minWidth: 36,
    textAlign: 'right',
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
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  activeStatusChip: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  statusChipText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.textSecondary,
  },
  activeStatusChipText: {
    color: COLORS.surface,
  },
  listContent: {
    paddingBottom: 20,
  },
  paymentCard: {
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
  },
  dueDate: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  remindedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  remindedText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Black',
    color: COLORS.warningAmber,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBlueLight,
    gap: 6,
  },
  remindButtonText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    color: COLORS.primaryBlue,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    color: COLORS.surface,
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.errorCoral,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    color: COLORS.surface,
  },
});

export default UpcomingPaymentsScreen;
