/**
 * ContributionsScreen - All Transactions List
 * Following GroupsScreen pattern with filters, sorting, auto-hide tab bar
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
  Filter,
  Plus as PlusIcon,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react-native';
import { useAllContributions } from '../../../hooks/useContributions';
import { ContributionCard } from '../../../components/contributions/ContributionCard';
import { useTabBarScroll } from '../../../context/TabBarScrollContext';
import { COLORS, SPACING, TYPOGRAPHY, RADII, SHADOWS } from '../../../theme/designTokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ContributionsScreenProps {
  navigation: any;
}

type FilterType = 'all' | 'pending' | 'paid' | 'approved' | 'failed' | 'overdue';
type SortType = 'date' | 'amount' | 'status';

export const ContributionsScreen: React.FC<ContributionsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  const {
    contributions,
    isLoading,
    error,
    refreshContributions,
  } = useAllContributions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('date');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Scroll handler for auto-hiding tab bar
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Filter and sort contributions
  const filteredContributions = useMemo(() => {
    let filtered = [...contributions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.userName?.toLowerCase().includes(query) ||
          c.groupName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterType !== 'all') {
      if (filterType === 'overdue') {
        filtered = filtered.filter(
          (c) =>
            c.status === 'pending' &&
            c.dueDate &&
            new Date(c.dueDate) < new Date()
        );
      } else {
        filtered = filtered.filter((c) => c.status === filterType);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortType) {
        case 'amount':
          return b.amount - a.amount;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
    });

    return filtered;
  }, [contributions, searchQuery, filterType, sortType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshContributions();
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

  const handleAddContribution = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('AddContribution');
  };

  const handleContributionPress = (contributionId: string) => {
    navigation.navigate('ContributionDetail', { contributionId });
  };

  // Filter buttons
  const filters: { type: FilterType; label: string; count?: number }[] = [
    { type: 'all', label: 'All', count: contributions.length },
    { type: 'pending', label: 'Pending', count: contributions.filter((c) => c.status === 'pending').length },
    { type: 'paid', label: 'Paid', count: contributions.filter((c) => c.status === 'paid').length },
    { type: 'approved', label: 'Approved', count: contributions.filter((c) => c.status === 'approved').length },
    { type: 'overdue', label: 'Overdue', count: contributions.filter((c) => c.status === 'pending' && c.dueDate && new Date(c.dueDate) < new Date()).length },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Contributions</Text>
        <Text style={styles.headerSubtitle}>
          {filteredContributions.length} {filteredContributions.length === 1 ? 'transaction' : 'transactions'}
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by member or group..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.sortButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSortPress}
        >
          <ArrowUpDown size={20} color={COLORS.textPrimary} />
        </Pressable>
      </Animated.View>

      {/* Filter Chips */}
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
              style={[
                styles.filterChip,
                filterType === filter.type && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(filter.type)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterType === filter.type && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
              {filter.count !== undefined && (
                <View
                  style={[
                    styles.countBadge,
                    filterType === filter.type && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeText,
                      filterType === filter.type && styles.countBadgeTextActive,
                    ]}
                  >
                    {filter.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </Animated.ScrollView>
      </Animated.View>

      {/* Contributions List */}
      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      ) : filteredContributions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No contributions found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first contribution to get started'}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredContributions}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ContributionCard
              contribution={item}
              index={index}
              onPress={() => handleContributionPress(item.id)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <Animated.View
        entering={ZoomIn.delay(300).springify()}
        style={[styles.fabContainer, { bottom: insets.bottom + 100 }]}
      >
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={handleAddContribution}
        >
          <PlusIcon size={32} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textPrimary,
    height: '100%',
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  filtersContainer: {
    marginBottom: SPACING.md,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surfaceLight,
    gap: SPACING.xs,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.border,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: '#EF4444',
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: SPACING.lg,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
