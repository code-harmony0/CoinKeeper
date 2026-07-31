/**
 * GroupsScreen - Enhanced UI/UX
 * Main groups list with improved search, filters, and animations
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, SlideInRight, useAnimatedScrollHandler, ZoomIn } from 'react-native-reanimated';
import Svg, { Path, Circle, Line } from 'react-native-svg'; // Changed to Svg
import { useGroups, useGroupFilters } from '../../../hooks/useGroups';
import { GroupCard } from '../../../components/group';
import { Button } from '../../../../../components/ui/Button';
import { theme } from '../../../../../theme';
import type { GroupStatus, GroupFilters } from '../../../types/group';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTabBarScroll } from '../../../../../context/TabBarScrollContext';

interface GroupsScreenProps {
  navigation: any;
  adminId: string;
}

// ============================================
// CUSTOM ICONS (Matching Bottom Tab Style)
// Stroke Width: 2.2px, LineCap: Round
// ============================================
const SW = 2.2;
const ICON_COLOR = theme.colors.textPrimary;

const SearchIcon = ({ color = ICON_COLOR, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={SW} strokeLinecap="round" />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

const FilterIcon = ({ color = ICON_COLOR, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    <Path d="M1 14h6M9 8h6M17 16h6" stroke={color} strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

const PlusIcon = ({ color = '#FFFFFF', size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </Svg>
);

const ClearIcon = ({ color = theme.colors.textTertiary, size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

const UsersIcon = ({ color = theme.colors.textTertiary, size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={2} />
    <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M21 21v-2a4 4 0 00-3-3.87" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const FILTER_OPTIONS: { label: string; value: GroupStatus; color: string }[] = [
  { label: 'Active', value: 'active', color: '#2E7D32' },
  { label: 'Inactive', value: 'inactive', color: '#757575' },
  { label: 'Pending', value: 'pending', color: '#F57C00' },
  { label: 'Closed', value: 'closed', color: '#D32F2F' },
];

const SORT_OPTIONS: {
  label: string;
  value: GroupFilters['sortBy'];
  icon: string;
}[] = [
  { label: 'Recent', value: 'createdAt', icon: '🕐' },
  { label: 'Name', value: 'name', icon: '📝' },
  { label: 'Members', value: 'members', icon: '👥' },
  { label: 'Amount', value: 'amount', icon: '💰' },
];

export const GroupsScreen: React.FC<GroupsScreenProps> = ({ navigation, adminId }) => {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();

  const { groups, isLoading, error } = useGroups(adminId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<GroupStatus[]>([]);
  const [sortBy, setSortBy] = useState<GroupFilters['sortBy']>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Scroll Handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const filters: GroupFilters = useMemo(
    () => ({
      searchQuery,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      sortBy,
      sortOrder,
    }),
    [searchQuery, selectedStatuses, sortBy, sortOrder]
  );

  const filteredGroups = useGroupFilters(groups, filters);

  const handleStatusToggle = (status: GroupStatus) => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSortChange = (value: GroupFilters['sortBy']) => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
    });
    if (sortBy === value) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(value);
      setSortOrder('desc');
    }
  };

  const handleCreateGroup = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
    });
    navigation.navigate('CreateGroup');
  };

  const handleGroupPress = (groupId: string) => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    navigation.navigate('GroupDetails', { groupId });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Data is real-time, just show refresh indicator briefly
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const clearFilters = () => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    setSearchQuery('');
    setSelectedStatuses([]);
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchQuery || selectedStatuses.length > 0 || sortBy !== 'createdAt';

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#121723" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Groups</Text>
            <Text style={styles.headerSubtitle}>
              {filteredGroups.length} of {groups.length} groups
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.searchContainer}
      >
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <ClearIcon size={18} color={theme.colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            showFilters && styles.filterButtonActive,
            pressed && styles.filterButtonPressed,
          ]}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', {
              enableVibrateFallback: true,
            });
            setShowFilters(!showFilters);
          }}
        >
          <FilterIcon
            size={22}
            color={showFilters ? '#FFFFFF' : theme.colors.textPrimary}
          />
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </Pressable>
      </Animated.View>

      {/* Filter Panel */}
      {showFilters && (
        <Animated.View
          entering={SlideInRight.springify()}
          style={styles.filterPanel}
        >
          {/* Status Filters */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {selectedStatuses.length > 0 && (
                <Pressable onPress={() => setSelectedStatuses([])}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.filterChips}>
              {FILTER_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterChip,
                    selectedStatuses.includes(option.value) && {
                      backgroundColor: option.color,
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => handleStatusToggle(option.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedStatuses.includes(option.value) &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionActive,
                  ]}
                  onPress={() => handleSortChange(option.value)}
                >
                  <Text style={styles.sortIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Text style={styles.sortOrder}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {hasActiveFilters && (
            <Button
              title="Clear All Filters"
              onPress={clearFilters}
              variant="outline"
              size="medium"
              style={{ marginTop: 8 }}
            />
          )}
        </Animated.View>
      )}

      {/* Groups List */}
      <Animated.ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#121723"
            colors={['#121723']}
          />
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {filteredGroups.length === 0 ? (
          <Animated.View entering={FadeIn.delay(100)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <UsersIcon size={56} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedStatuses.length > 0
                ? 'No groups found'
                : 'No groups yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || selectedStatuses.length > 0
                ? 'Try adjusting your filters'
                : 'Create your first group to get started'}
            </Text>
            {hasActiveFilters ? (
              <Button
                title="Clear Filters"
                onPress={clearFilters}
                variant="outline"
              />
            ) : (
              <Button
                title="Create Group"
                icon={<PlusIcon size={18} color="#FFFFFF" />}
                onPress={handleCreateGroup}
              />
            )}
          </Animated.View>
        ) : (
          filteredGroups.map((group, index) => (
            <GroupCard
              key={group.id}
              group={group}
              index={index}
              onPress={() => handleGroupPress(group.id)}
            />
          ))
        )}
      </Animated.ScrollView>

      {/* Floating Action Button (FAB) */}
      <Animated.View
        entering={ZoomIn.delay(300).springify()}
        style={[
          styles.fabContainer,
          { bottom: insets.bottom + 100 }
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed
          ]}
          onPress={handleCreateGroup}
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
    backgroundColor: '#E2B6CF', // Pink Theme
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#121723',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Squircle Radius (was full)
    paddingHorizontal: theme.spacing.md,
    height: 52,
    ...theme.shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    height: '100%',
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 20, // Squircle Radius (was full)
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  filterButtonActive: {
    backgroundColor: '#121723',
  },
  filterButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  filterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F57C00',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterPanel: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: 24, // Squircle Radius
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  filterSection: {
    marginBottom: theme.spacing.lg,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57C00',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16, // Squircle Radius
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortOptions: {
    gap: theme.spacing.xs,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: 16, // Squircle Radius
    backgroundColor: '#F5F5F5',
  },
  sortOptionActive: {
    backgroundColor: '#121723',
  },
  sortIcon: {
    fontSize: 18,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
  },
  sortOrder: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  emptyState: {
    paddingVertical: theme.spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 40, // Squircle Radius
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptyDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  // FAB Styles
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 24, // Squircle Radius
    backgroundColor: '#121723',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});
