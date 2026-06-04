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
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AlertCircle, Calendar, Clock, Search, Bell } from 'lucide-react-native';
import type { ScheduledPayment } from '../../../types/payment';
import { useOverduePayments } from '../../../hooks/useScheduledPayments';
import { COLORS } from '../../../theme/colors';

// SPRING_CONFIG removed for chained methods

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
  onRemind: () => void;
}> = ({ payment, index, onPress, onRemind }) => {
  const dueDate = payment.dueDate?.toDate?.() ?? new Date();
  const formattedDate = dueDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const daysOverdue = (payment as any).daysOverdue ?? 0;
  const lateFee = payment.lateFeeAmount ?? 0;
  const totalDue = payment.amount + lateFee;

  const getUrgencyColor = () => {
    if (daysOverdue > 30) return COLORS.errorCoral;
    if (daysOverdue > 14) return COLORS.warningAmber;
    return COLORS.warningAmber;
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(16).stiffness(140).mass(1)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={[styles.overdueCard, { borderLeftColor: getUrgencyColor(), borderLeftWidth: 6 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor() }]}>
            <AlertCircle size={18} color={COLORS.surface} />
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
          <View style={styles.footerLeft}>
            <View style={styles.footerItem}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={styles.footerText}>Due: {formattedDate}</Text>
            </View>
            <View style={styles.footerItem}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Text style={styles.footerText}>{payment.remindersSent ?? 0} sent</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              ReactNativeHapticFeedback.trigger('impactMedium');
              onRemind();
            }}
            style={styles.remindButton}>
            <Bell size={16} color={COLORS.surface} />
            <Text style={styles.remindButtonText}>Remind</Text>
          </TouchableOpacity>
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
        return ((b as any).daysOverdue ?? 0) - ((a as any).daysOverdue ?? 0);
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

  const handleSendReminder = useCallback((payment: ScheduledPayment) => {
    const daysOverdue = (payment as any).daysOverdue ?? 0;
    Alert.alert(
      'Send Overdue Reminder',
      `Send overdue reminder to ${payment.memberName}?\n\nAmount: ₹${payment.amount.toLocaleString('en-IN')}\nOverdue: ${daysOverdue} days`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reminder',
          style: 'destructive',
          onPress: () => {
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            Alert.alert('Sent', `Overdue reminder sent to ${payment.memberName}`);
          },
        },
      ],
    );
  }, []);

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
        entering={FadeInDown.delay(0).springify().damping(16).stiffness(140).mass(1)}
        style={styles.header}>
        <Text style={styles.headerTitle}>Overdue Payments</Text>
        <Text style={styles.headerSubtitle}>
          {count} overdue • ₹{totalOverdueAmount.toLocaleString('en-IN')} pending
        </Text>
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

      {/* Sort Buttons */}
      <Animated.View
        entering={FadeInDown.delay(150).springify().damping(16).stiffness(140).mass(1)}
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
            onRemind={() => handleSendReminder(item)}
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: COLORS.errorCoral,
    fontWeight: '600',
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
    fontFamily: 'PlusJakartaSans-Regular',
    color: COLORS.textPrimary,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  activeSortButton: {
    backgroundColor: COLORS.primaryBlue,
    borderColor: COLORS.primaryBlue,
  },
  sortButtonText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: COLORS.textSecondary,
  },
  activeSortButtonText: {
    color: COLORS.surface,
  },
  listContent: {
    paddingBottom: 20,
  },
  overdueCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: COLORS.neumorphic.shadow,
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
    backgroundColor: COLORS.errorCoralDark,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  daysOverdueText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: COLORS.surface,
  },
  cardBody: {
    marginBottom: 16,
  },
  memberName: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  groupName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  amount: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerLeft: {
    gap: 6,
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.errorCoral,
    gap: 6,
  },
  remindButtonText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: COLORS.surface,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: COLORS.textSecondary,
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
    color: COLORS.successGreen,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: COLORS.errorCoral,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.errorCoral,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: COLORS.surface,
  },
});

export default OverduePaymentsScreen;
