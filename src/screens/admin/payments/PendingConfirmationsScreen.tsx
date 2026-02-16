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
import { useTabBarScroll } from '../../../context/TabBarScrollContext';
import { COLORS, SPACING, TYPOGRAPHY, RADII, SHADOWS } from '../../../theme/designTokens';
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
      case 'confirmed': return <CheckCircle size={16} color={COLORS.success} />;
      case 'rejected': return <XCircle size={16} color={COLORS.error} />;
      case 'disputed': return <AlertTriangle size={16} color={COLORS.warning} />;
      default: return <Clock size={16} color={COLORS.accent} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return COLORS.successMuted;
      case 'rejected': return COLORS.errorMuted;
      case 'disputed': return COLORS.warningMuted;
      default: return COLORS.accentMuted;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'confirmed': return COLORS.success;
      case 'rejected': return COLORS.error;
      case 'disputed': return COLORS.warning;
      default: return COLORS.accent;
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
          <Search size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by member, group or ref ID..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={({ pressed }) => [styles.sortButton, pressed && styles.buttonPressed]}
          onPress={handleSortPress}
        >
          <ArrowUpDown size={20} color={COLORS.textPrimary} />
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
          <ActivityIndicator size="large" color={COLORS.primary} />
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
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.textSecondary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: RADII.md, paddingHorizontal: SPACING.md, height: 48, gap: SPACING.sm, ...SHADOWS.soft },
  searchInput: { flex: 1, fontSize: TYPOGRAPHY.sizes.md, color: COLORS.textPrimary, height: '100%' },
  sortButton: { width: 48, height: 48, borderRadius: RADII.md, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft },
  filtersContainer: { marginBottom: SPACING.md },
  filtersContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADII.full, backgroundColor: COLORS.surfaceLight, gap: SPACING.xs },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#FFFFFF' },
  countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADII.sm, backgroundColor: COLORS.border },
  countBadgeActive: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  countBadgeText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: '700', color: COLORS.textSecondary },
  countBadgeTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: SPACING.lg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyText: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs, textAlign: 'center' },
  emptySubtext: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.textSecondary, textAlign: 'center' },
  errorText: { fontSize: TYPOGRAPHY.sizes.md, color: '#EF4444', textAlign: 'center' },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  card: { backgroundColor: COLORS.card, borderRadius: RADII.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.soft },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  cardHeaderLeft: { flex: 1 },
  memberName: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  groupName: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADII.full, gap: 4 },
  statusText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: '600' },
  cardBody: { gap: SPACING.xs },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary },
  amountValue: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textTertiary },
  detailValue: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
});
