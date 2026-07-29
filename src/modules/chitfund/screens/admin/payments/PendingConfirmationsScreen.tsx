/**
 * PendingConfirmationsScreen - Payment Confirmation List
 * Following ContributionsScreen pattern with filters, sorting, auto-hide tab bar
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react-native';
import { useAllPaymentConfirmations } from '../../../hooks/usePaymentConfirmations';
import { useTabBarScroll } from '../../../../../context/TabBarScrollContext';
import { colors, spacing, typography, radii, shadows } from '../../../../../theme/designTokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { PaymentConfirmation } from '../../../types/paymentConfirmation';

interface PendingConfirmationsScreenProps {
  navigation: any;
}

type FilterType = 'all' | 'pending' | 'confirmed' | 'rejected' | 'disputed';
type SortType = 'date' | 'amount' | 'status';

export const PendingConfirmationsScreen: React.FC<PendingConfirmationsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  const {
    confirmations,
    isLoading,
    error,
    refreshConfirmations,
  } = useAllPaymentConfirmations();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('date');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const filteredConfirmations = useMemo(() => {
    let filtered = [...confirmations];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.memberName?.toLowerCase().includes(query) ||
          c.groupName?.toLowerCase().includes(query) ||
          c.referenceId?.toLowerCase().includes(query)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((c) => c.status === filterType);
    }

    filtered.sort((a, b) => {
      switch (sortType) {
        case 'amount':
          return b.amount - a.amount;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });

    return filtered;
  }, [confirmations, searchQuery, filterType, sortType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshConfirmations();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleFilterPress = (type: FilterType) => {
    ReactNativeHapticFeedback.trigger('selection');
    setFilterType(type);
  };

  const handleSortPress = () => {
    ReactNativeHapticFeedback.trigger('selection');
    const sortOrder: SortType[] = ['date', 'amount', 'status'];
    const currentIndex = sortOrder.indexOf(sortType);
    const nextIndex = (currentIndex + 1) % sortOrder.length;
    setSortType(sortOrder[nextIndex]);
  };

  const handleConfirmationPress = (confirmation: PaymentConfirmation) => {
    navigation.navigate('ConfirmationDetail', { confirmationId: confirmation.id });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} color={colors.success} />;
      case 'rejected': return <XCircle size={16} color={colors.error} />;
      case 'disputed': return <AlertTriangle size={16} color={colors.warning} />;
      default: return <Clock size={16} color={colors.accent} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.successMuted;
      case 'rejected': return colors.errorMuted;
      case 'disputed': return colors.warningMuted;
      default: return colors.accentMuted;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'rejected': return colors.error;
      case 'disputed': return colors.warning;
      default: return colors.accent;
    }
  };

  const filters: { type: FilterType; label: string; count?: number }[] = [
    { type: 'all', label: 'All', count: confirmations.length },
    { type: 'pending', label: 'Pending', count: confirmations.filter((c) => c.status === 'pending').length },
    { type: 'confirmed', label: 'Confirmed', count: confirmations.filter((c) => c.status === 'confirmed').length },
    { type: 'rejected', label: 'Rejected', count: confirmations.filter((c) => c.status === 'rejected').length },
    { type: 'disputed', label: 'Disputed', count: confirmations.filter((c) => c.status === 'disputed').length },
  ];

  const renderConfirmationCard = ({ item, index }: { item: PaymentConfirmation; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handleConfirmationPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.memberName}>{item.memberName}</Text>
            <Text style={styles.groupName}>{item.groupName} - Cycle {item.cycleNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusTextColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₹{item.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method</Text>
            <Text style={styles.detailValue}>{item.paymentMethod.toUpperCase()}</Text>
          </View>
          {item.referenceId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ref ID</Text>
              <Text style={styles.detailValue}>{item.referenceId}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Payment Confirmations</Text>
        <Text style={styles.headerSubtitle}>
          {filteredConfirmations.length} {filteredConfirmations.length === 1 ? 'confirmation' : 'confirmations'}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by member, group or ref ID..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={({ pressed }) => [styles.sortButton, pressed && styles.buttonPressed]}
          onPress={handleSortPress}
        >
          <ArrowUpDown size={20} color={colors.textPrimary} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          style={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <Pressable
              key={filter.type}
              style={[styles.filterChip, filterType === filter.type && styles.filterChipActive]}
              onPress={() => handleFilterPress(filter.type)}
            >
              <Text style={[styles.filterChipText, filterType === filter.type && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
              {filter.count !== undefined && (
                <View style={[styles.countBadge, filterType === filter.type && styles.countBadgeActive]}>
                  <Text style={[styles.countBadgeText, filterType === filter.type && styles.countBadgeTextActive]}>
                    {filter.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </Animated.ScrollView>
      </Animated.View>

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      ) : filteredConfirmations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No confirmations found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'No payment confirmations submitted yet'}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredConfirmations}
          keyExtractor={(item) => item.id}
          renderItem={renderConfirmationCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.l, paddingVertical: spacing.m },
  headerTitle: { fontSize: typography.sizes.xxl, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  headerSubtitle: { fontSize: typography.sizes.m, color: colors.textSecondary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingHorizontal: spacing.l, marginBottom: spacing.m },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundLight, borderRadius: radii.m, paddingHorizontal: spacing.m, height: 48, gap: spacing.s, ...shadows.card },
  searchInput: { flex: 1, fontSize: typography.sizes.m, color: colors.textPrimary, height: '100%' },
  sortButton: { width: 48, height: 48, borderRadius: radii.m, backgroundColor: colors.backgroundLight, justifyContent: 'center', alignItems: 'center', ...shadows.card },
  filtersContainer: { marginBottom: spacing.m },
  filtersContent: { paddingHorizontal: spacing.l, gap: spacing.s },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: radii.round, backgroundColor: colors.backgroundLight, gap: spacing.xs },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: typography.sizes.s, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: '#FFFFFF' },
  countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.s, backgroundColor: colors.pillBorder },
  countBadgeActive: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  countBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary },
  countBadgeTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: spacing.l },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyText: { fontSize: typography.sizes.l, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
  emptySubtext: { fontSize: typography.sizes.m, color: colors.textSecondary, textAlign: 'center' },
  errorText: { fontSize: typography.sizes.m, color: '#EF4444', textAlign: 'center' },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  card: { backgroundColor: colors.card, borderRadius: radii.l, padding: spacing.m, marginBottom: spacing.m, ...shadows.card },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.s },
  cardHeaderLeft: { flex: 1 },
  memberName: { fontSize: typography.sizes.m, fontWeight: '700', color: colors.textPrimary },
  groupName: { fontSize: typography.sizes.s, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s, paddingVertical: 4, borderRadius: radii.round, gap: 4 },
  statusText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  cardBody: { gap: spacing.xs },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: typography.sizes.s, color: colors.textSecondary },
  amountValue: { fontSize: typography.sizes.l, fontWeight: '800', color: colors.textPrimary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: typography.sizes.s, color: colors.textTertiary },
  detailValue: { fontSize: typography.sizes.s, fontWeight: '600', color: colors.textSecondary },
});
