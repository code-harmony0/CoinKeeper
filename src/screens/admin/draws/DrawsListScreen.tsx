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
import { Trophy, Calendar, Users, TrendingUp, DollarSign, Search, Plus, AlertCircle } from 'lucide-react-native';
import type { Draw, DrawStatus } from '../../../types/draw';
import { useDraws, useDrawSummary } from '../../../hooks/useDraws';
import { COLORS } from '../../../theme/colors';
import { StatusChip } from '../../../components/shared/StatusChip';

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

type FilterStatus = 'all' | 'upcoming' | 'in_progress' | 'completed';

interface Props {
  navigation: any;
}

const FilterChip: React.FC<{
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

const DrawCard: React.FC<{
  draw: Draw;
  index: number;
  onPress: () => void;
}> = ({ draw, index, onPress }) => {
  const scheduledDate = draw.scheduledDate.toDate();
  const formattedDate = scheduledDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getStatusColor = () => {
    switch (draw.status) {
      case 'upcoming':
        return '#2196F3';
      case 'in_progress':
        return '#f0ad4e';
      case 'completed':
        return '#5cb85c';
      case 'cancelled':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusLabel = () => {
    switch (draw.status) {
      case 'upcoming':
        return 'Upcoming';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return draw.status;
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify(SPRING_CONFIG)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={styles.drawCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.drawNumberBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.drawNumberText}>#{draw.drawNumber}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.groupName}>{draw.groupName}</Text>
              <View style={styles.dateRow}>
                <Calendar size={14} color="#666" />
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusLabel()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.prizeSection}>
            <DollarSign size={20} color="#121723" />
            <View>
              <Text style={styles.prizeLabel}>Prize Pool</Text>
              <Text style={styles.prizeAmount}>₹{draw.totalPrizeAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <TrendingUp size={16} color="#666" />
              <Text style={styles.statText}>{draw.bidsReceived} Bids</Text>
            </View>
            <View style={styles.statItem}>
              <Users size={16} color="#666" />
              <Text style={styles.statText}>{draw.participantCount} Participants</Text>
            </View>
          </View>
        </View>

        {draw.status === 'completed' && draw.winningBid && (
          <View style={styles.cardFooter}>
            <View style={styles.winnerBadge}>
              <Trophy size={16} color="#FFD700" />
              <Text style={styles.winnerText}>
                Won with bid: ₹{draw.winningBid.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const DrawsListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Use real data hooks
  const statusFilter = filterStatus === 'all' ? undefined : [filterStatus];
  const { draws, isLoading, error, refresh } = useDraws({ status: statusFilter });
  const { summary } = useDrawSummary();

  const filteredDraws = useMemo(() => {
    if (!searchQuery) return draws;

    const query = searchQuery.toLowerCase();
    return draws.filter(draw =>
      draw.groupName?.toLowerCase().includes(query) ||
      draw.drawNumber?.toString().includes(query)
    );
  }, [draws, searchQuery]);

  const stats = useMemo(() => {
    return {
      upcoming: summary?.scheduledDraws || 0,
      inProgress: summary?.activeDraws || 0,
      completed: summary?.completedDraws || 0,
    };
  }, [summary]);

  const handleDrawPress = useCallback((draw: Draw) => {
    navigation.navigate('DrawDetails', { drawId: draw.id, draw });
  }, [navigation]);

  const handleCreateDraw = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('CreateDraw');
  }, [navigation]);

  // Loading state
  if (isLoading && draws.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading draws...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && draws.length === 0) {
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
      <Animated.View entering={FadeInDown.delay(0).springify(SPRING_CONFIG)} style={styles.header}>
        <Text style={styles.headerTitle}>Draws</Text>
        <Text style={styles.headerSubtitle}>
          {stats.upcoming} upcoming • {stats.inProgress} in progress • {stats.completed} completed
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
        style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          placeholder="Search by group or draw number..."
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
        <FilterChip label="All" isActive={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
        <FilterChip label="Upcoming" isActive={filterStatus === 'upcoming'} onPress={() => setFilterStatus('upcoming')} />
        <FilterChip label="In Progress" isActive={filterStatus === 'in_progress'} onPress={() => setFilterStatus('in_progress')} />
        <FilterChip label="Completed" isActive={filterStatus === 'completed'} onPress={() => setFilterStatus('completed')} />
      </Animated.View>

      {/* Draws List */}
      <FlatList
        data={filteredDraws}
        renderItem={({ item, index }) => (
          <DrawCard draw={item} index={index} onPress={() => handleDrawPress(item)} />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.primaryBlue} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Trophy size={64} color="#CCC" />
            <Text style={styles.emptyText}>No draws found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No draws scheduled yet'}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={handleCreateDraw}
        style={[styles.fab, { bottom: insets.bottom + 100 }]}>
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  drawCard: {
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  drawNumberBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawNumberText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  cardBody: {
    marginBottom: 12,
  },
  prizeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  prizeLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
    marginBottom: 2,
  },
  prizeAmount: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#666',
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  winnerText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#F57C00',
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
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#121723',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#D32F2F',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#121723',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#FFFFFF',
  },
});

export default DrawsListScreen;
