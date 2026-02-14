import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heading, BodyText, Caption } from '../../components/core/Typography';
import { TransactionCard, Transaction } from '../../components/transaction/TransactionCard';
import { COLORS, SPACING, RADIUS } from '../../theme';
import {
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  X,
  Calendar,
  Tag,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'TransactionsList'>;

type FilterType = 'all' | 'expense' | 'income';
type SortType = 'date' | 'amount';

// Mock data - replace with actual data from context/API
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    amount: 1250,
    type: 'expense',
    category: {
      id: 'food',
      name: 'Food & Dining',
      icon: 'food',
      color: COLORS.softPeach,
    },
    description: 'Dinner at Taj Restaurant',
    date: new Date(2024, 10, 28),
    paymentMethod: 'UPI',
  },
  {
    id: '2',
    amount: 5000,
    type: 'income',
    category: {
      id: 'salary',
      name: 'Salary',
      icon: 'default',
      color: COLORS.successGreen,
    },
    description: 'Monthly salary',
    date: new Date(2024, 10, 25),
    paymentMethod: 'Bank',
  },
  {
    id: '3',
    amount: 450,
    type: 'expense',
    category: {
      id: 'transport',
      name: 'Transport',
      icon: 'transport',
      color: COLORS.babyBlue,
    },
    description: 'Uber to office',
    date: new Date(2024, 10, 27),
    paymentMethod: 'Card',
  },
  {
    id: '4',
    amount: 2100,
    type: 'expense',
    category: {
      id: 'shopping',
      name: 'Shopping',
      icon: 'shopping',
      color: COLORS.lavender,
    },
    description: 'New shoes',
    date: new Date(2024, 10, 26),
    paymentMethod: 'Card',
  },
  {
    id: '5',
    amount: 850,
    type: 'expense',
    category: {
      id: 'entertainment',
      name: 'Entertainment',
      icon: 'entertainment',
      color: COLORS.mintGreen,
    },
    description: 'Movie tickets',
    date: new Date(2024, 10, 20),
    paymentMethod: 'Cash',
  },
];

export const TransactionsListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...MOCK_TRANSACTIONS];

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.category.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filterType, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    // Navigate to transaction details
    console.log('Transaction pressed:', transaction.id);
  };

  const handleFilterPress = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setShowFilters(!showFilters);
  };

  const handleFilterSelect = (type: FilterType) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setFilterType(type);
    setShowFilters(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats Summary */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
        style={styles.statsCard}
      >
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: `${COLORS.successGreen}20` }]}>
            <TrendingUp size={16} color={COLORS.successGreen} strokeWidth={2.5} />
          </View>
          <Caption color={COLORS.grayText} style={styles.statLabel}>
            Income
          </Caption>
          <BodyText color={COLORS.successGreen} medium style={styles.statValue}>
            ₹{totals.income.toLocaleString()}
          </BodyText>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: `${COLORS.errorPink}20` }]}>
            <TrendingDown size={16} color={COLORS.errorPink} strokeWidth={2.5} />
          </View>
          <Caption color={COLORS.grayText} style={styles.statLabel}>
            Expense
          </Caption>
          <BodyText color={COLORS.errorPink} medium style={styles.statValue}>
            ₹{totals.expense.toLocaleString()}
          </BodyText>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Caption color={COLORS.grayText} style={styles.statLabel}>
            Net
          </Caption>
          <BodyText
            color={totals.net >= 0 ? COLORS.successGreen : COLORS.errorPink}
            medium
            style={styles.statValue}
          >
            ₹{Math.abs(totals.net).toLocaleString()}
          </BodyText>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
          style={styles.searchBar}
        >
          <Search size={20} color={COLORS.grayText} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={COLORS.grayText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <X size={18} color={COLORS.grayText} strokeWidth={2} />
            </Pressable>
          )}
        </LinearGradient>

        <Pressable onPress={handleFilterPress} style={styles.filterButton}>
          <LinearGradient
            colors={
              showFilters || filterType !== 'all'
                ? COLORS.gradientBlue
                : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']
            }
            style={styles.filterButtonGradient}
          >
            <SlidersHorizontal
              size={20}
              color={showFilters || filterType !== 'all' ? '#FFFFFF' : COLORS.navyText}
              strokeWidth={2}
            />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Filter Pills */}
      {showFilters && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.filterPills}
        >
          <FilterPill
            label="All"
            active={filterType === 'all'}
            onPress={() => handleFilterSelect('all')}
          />
          <FilterPill
            label="Income"
            active={filterType === 'income'}
            onPress={() => handleFilterSelect('income')}
            color={COLORS.successGreen}
          />
          <FilterPill
            label="Expense"
            active={filterType === 'expense'}
            onPress={() => handleFilterSelect('expense')}
            color={COLORS.errorPink}
          />
        </Animated.View>
      )}

      <Caption color={COLORS.grayText} style={styles.resultCount}>
        {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
      </Caption>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Tag size={48} color={COLORS.grayText} strokeWidth={1.5} />
      </View>
      <Heading level={4} color={COLORS.navyText} style={styles.emptyTitle}>
        No transactions found
      </Heading>
      <Caption color={COLORS.grayText} align="center" style={styles.emptyDescription}>
        {searchQuery ? 'Try adjusting your search or filters' : 'Start adding transactions to see them here'}
      </Caption>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with gradient */}
      <LinearGradient
        colors={COLORS.gradientMint}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Heading level={2} color="#FFFFFF" style={styles.headerTitle}>
          Transactions
        </Heading>
      </LinearGradient>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onPress={() => handleTransactionPress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.babyBlue}
            colors={[COLORS.babyBlue]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const FilterPill: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}> = ({ label, active, onPress, color = COLORS.navyText }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pillPressable}
      >
        <LinearGradient
          colors={
            active
              ? [color, color]
              : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']
          }
          style={styles.pill}
        >
          <Caption color={active ? '#FFFFFF' : COLORS.navyText} medium>
            {label}
          </Caption>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerContainer: {
    marginBottom: SPACING.md,
  },
  statsCard: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderGray,
    marginHorizontal: SPACING.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
    color: COLORS.navyText,
    fontWeight: '500',
  },
  clearButton: {
    padding: SPACING.xs,
  },
  filterButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  filterButtonGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  filterPills: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  pillPressable: {
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  pill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  resultCount: {
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.grayText}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    maxWidth: 240,
  },
});
