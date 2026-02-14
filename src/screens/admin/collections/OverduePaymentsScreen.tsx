import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AlertCircle, Calendar, Clock, Search } from 'lucide-react-native';
import type { ScheduledPayment } from '../../../types/payment';
import { useOverduePayments } from '../../../hooks/useScheduledPayments';
import { COLORS } from '../../../theme/colors';

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

type SortOption = 'days' | 'amount';

interface Props {
  navigation: any;
  route?: { params?: { groupId?: string } };
}

const SortButton: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    onPress={() => {
      ReactNativeHapticFeedback.trigger('selection');
      onPress();
    }}
    style={[styles.sortButton, isActive && styles.activeSortButton]}>
    <Text style={[styles.sortButtonText, isActive && styles.activeSortButtonText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const OverdueCard: React.FC<{
  payment: ScheduledPayment;
  index: number;
  onPress: () => void;
}> = ({ payment, index, onPress }) => {
  const dueDate = payment.dueDate?.toDate?.() ?? new Date();
  const formattedDate = dueDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const daysOverdue = payment.daysOverdue ?? 0;
  const lateFee = payment.lateFeeAmount ?? 0;
  const totalDue = payment.amount + lateFee;

  const getUrgencyColor = () => {
    if (daysOverdue > 30) return COLORS.errorCoral;
    if (daysOverdue > 14) return COLORS.warningAmber;
    return '#FFA726';
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify(SPRING_CONFIG)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={[styles.overdueCard, { borderLeftColor: getUrgencyColor(), borderLeftWidth: 6 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor() }]}>
            <AlertCircle size={18} color="#FFFFFF" />
            <Text style={styles.daysOverdueText}>{daysOverdue} days overdue</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.memberName}>{payment.memberName}</Text>
          <Text style={styles.groupName}>{payment.groupName}</Text>

          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Original Amount</Text>
              <Text style={styles.amount}>₹{payment.amount.toLocaleString('en-IN')}</Text>
            </View>
            <View>
              <Text style={styles.amountLabel}>With Penalty</Text>
              <Text style={[styles.amount, { color: getUrgencyColor() }]}>
                ₹{totalDue.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Calendar size={14} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>Due: {formattedDate}</Text>
          </View>
          <View style={styles.footerItem}>
            <Clock size={14} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>{payment.remindersSent ?? 0} reminders sent</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const OverduePaymentsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('days');

  // Extract groupId from route params if available
  const groupId = route?.params?.groupId;

  // Use real data from hook
  const { payments, isLoading, error, refresh, totalOverdueAmount, count } = useOverduePayments(groupId);

  const sortedAndFilteredPayments = useMemo(() => {
    let filtered = payments;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        payment =>
          payment.memberName?.toLowerCase().includes(query) ||
          payment.groupName?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'days') {
        return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
      } else {
        const aTotal = a.amount + (a.lateFeeAmount ?? 0);
        const bTotal = b.amount + (b.lateFeeAmount ?? 0);
        return bTotal - aTotal;
      }
    });

    return sorted;
  }, [payments, searchQuery, sortBy]);

  const handlePaymentPress = useCallback((payment: ScheduledPayment) => {
    navigation.navigate('ContributionDetail', { paymentId: payment.id, payment });
  }, [navigation]);

  // Loading state
  if (isLoading && payments.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.errorCoral} />
        <Text style={styles.loadingText}>Loading overdue payments...</Text>
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
        entering={FadeInDown.delay(0).springify(SPRING_CONFIG)}
        style={styles.header}>
        <Text style={styles.headerTitle}>Overdue Payments</Text>
        <Text style={styles.headerSubtitle}>
          {count} overdue • ₹{totalOverdueAmount.toLocaleString('en-IN')} pending
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
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

      {/* Sort Buttons */}
      <Animated.View
        entering={FadeInDown.delay(150).springify(SPRING_CONFIG)}
        style={styles.sortContainer}>
        <SortButton
          label="Sort by Days"
          isActive={sortBy === 'days'}
          onPress={() => setSortBy('days')}
        />
        <SortButton
          label="Sort by Amount"
          isActive={sortBy === 'amount'}
          onPress={() => setSortBy('amount')}
        />
      </Animated.View>

      {/* Overdue List */}
      <FlatList
        data={sortedAndFilteredPayments}
        renderItem={({ item, index }) => (
          <OverdueCard
            payment={item}
            index={index}
            onPress={() => handlePaymentPress(item)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.errorCoral} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AlertCircle size={64} color={COLORS.successGreen} />
            <Text style={styles.emptyText}>No overdue payments</Text>
            <Text style={styles.emptySubtext}>All members are up to date!</Text>
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
    color: '#D32F2F',
    fontWeight: '600',
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
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  activeSortButton: {
    backgroundColor: '#121723',
    borderColor: '#121723',
  },
  sortButtonText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#666',
  },
  activeSortButtonText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  overdueCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 16,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  daysOverdueText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  cardBody: {
    marginBottom: 16,
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
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#999',
    marginBottom: 4,
  },
  amount: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
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
    color: '#5cb85c',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#BBB',
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#E74C3C',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#FFFFFF',
  },
});

export default OverduePaymentsScreen;
