/**
 * TransactionsScreen - Spec Theme Design
 * Left-aligned header, income/expense summary, animated segmented filter, list
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  TextInput,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  Wallet,
  MoreHorizontal,
  Search,
  Trash2,
  Tag,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTransactions } from '../../hooks/useTransactions';
import { useSecureScreen } from '../../hooks/useSecureScreen';
import { useSpecTheme } from '../../theme/specTheme';
import { Transaction } from '../../types/transaction';
import { CountUp, PressableScale } from '../../components/anim';
import { PiggyBankIllustration } from '../../components/illustrations';
import { groupTransactionsByDate, GroupedRow } from '../../utils/groupTransactionsByDate';

type Props = NativeStackScreenProps<any, 'Transactions'>;

type FilterTab = 'all' | 'income' | 'expense';
const TABS: FilterTab[] = ['all', 'income', 'expense'];
const TAB_LABELS: Record<FilterTab, string> = {
  all: 'All',
  income: 'Income',
  expense: 'Expense',
};

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  food: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  bills: Receipt,
  entertainment: Film,
  health: HeartPulse,
  salary: Wallet,
  other: MoreHorizontal,
};

export const TransactionsScreen: React.FC<Props> = ({ navigation }) => {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, spring, iconShadow } = useSpecTheme();

  // Feeds the shared scroll offset the tab bar reads to auto-hide. FlashList
  // is not a Reanimated component, so this writes the shared value from JS
  // rather than through useAnimatedScrollHandler.
  const { scrollY } = useTabBarScroll();
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );
  const { transactions, deleteTransaction } = useTransactions();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  // Rows removed from view optimistically — via swipe (pendingDelete tracks
  // which one for the undo banner) or multi-select (no undo, committed
  // straight away). The mocked useTransactions hook in tests returns a
  // static transactions array regardless of deleteTransaction calls, same
  // as a real store would look mid-flight before its next render — so the
  // list has to hide rows itself rather than waiting on the source array.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const indicatorX = useSharedValue(0);

  const filteredTx = useMemo(
    () => (activeTab === 'all' ? transactions : transactions.filter(t => t.type === activeTab)),
    [transactions, activeTab],
  );

  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredTx;
    return filteredTx.filter(
      t => (t.description ?? '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [filteredTx, searchQuery]);

  const grouped = useMemo(
    () => groupTransactionsByDate(searched.filter(t => !hiddenIds.has(t.id))),
    [searched, hiddenIds],
  );

  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const requestDelete = (tx: Transaction) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setPendingDelete(tx);
    setHiddenIds(prev => new Set(prev).add(tx.id));
    undoTimer.current = setTimeout(() => {
      deleteTransaction(tx.id);
      setPendingDelete(null);
    }, 5000);
  };

  const undoDelete = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (pendingDelete) next.delete(pendingDelete.id);
      return next;
    });
    setPendingDelete(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterSelection = (id: string) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setSelectedIds(new Set([id]));
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    setHiddenIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    await Promise.all(ids.map(id => deleteTransaction(id)));
  };

  const handleTabPress = (tab: FilterTab, index: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setActiveTab(tab);
    indicatorX.value = withSpring(index * segmentWidth, spring);
  };

  const onSegmentLayout = (e: LayoutChangeEvent) => {
    const width = (e.nativeEvent.layout.width - 8) / TABS.length;
    setSegmentWidth(width);
    indicatorX.value = TABS.indexOf(activeTab) * width;
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth,
  }));

  const formatAmount = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const renderRow = (item: Transaction, index: number) => {
    const Icon = CATEGORY_ICONS[item.categoryIcon] || MoreHorizontal;
    const isIncome = item.type === 'income';
    const isSelected = selectedIds.has(item.id);

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
        <Swipeable
          renderRightActions={() => (
            <Pressable
              testID={`swipe-delete-${item.id}`}
              onPress={() => requestDelete(item)}
              style={[styles.swipeDelete, { backgroundColor: colors.danger }]}
            >
              <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          )}
        >
          <Pressable
            testID={`row-${item.id}`}
            onLongPress={() => enterSelection(item.id)}
            onPress={() => (selectedIds.size > 0 ? toggleSelected(item.id) : undefined)}
            style={[styles.row, isSelected && { backgroundColor: colors.chipBg }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.chipBg }, iconShadow]}>
              <Icon size={20} color={colors.textPrimary} strokeWidth={2} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.description || item.category}
              </Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowAmount, { color: isIncome ? colors.success : colors.danger }]}>
                {isIncome ? '+' : '-'}
                {formatAmount(item.amount)}
              </Text>
            </View>
          </Pressable>
        </Swipeable>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<GroupedRow>) => {
    if (item.type === 'header') {
      return (
        <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{item.label}</Text>
      );
    }
    return renderRow(item.tx, index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerSection, { paddingTop: insets.top + 16 }]}>
        <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.headerRow}>
          {selectedIds.size > 0 ? (
            <>
              <PressableScale
                onPress={() => setSelectedIds(new Set())}
                style={[styles.backButton, { backgroundColor: colors.chipBg }]}
              >
                <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
              </PressableScale>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {selectedIds.size} selected
              </Text>
              <Pressable onPress={deleteSelected} style={styles.selectionDeleteButton}>
                <Text style={{ color: colors.danger, fontFamily: 'Satoshi-Bold', fontSize: 15 }}>
                  Delete
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <PressableScale
                onPress={() => navigation.goBack()}
                style={[styles.backButton, { backgroundColor: colors.chipBg }]}
              >
                <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
              </PressableScale>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Transactions</Text>
              <PressableScale
                onPress={() => navigation.navigate('Categories')}
                style={[styles.categoriesButton, { backgroundColor: colors.chipBg }]}
              >
                <Tag size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </PressableScale>
            </>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.incomeTint, borderRadius: cardRadius }]}>
            <View style={styles.summaryIconRow}>
              <ArrowUpRight size={18} color={colors.success} strokeWidth={2.2} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            </View>
            <CountUp value={totalIncome} prefix="₹" style={[styles.summaryValue, { color: colors.textPrimary }]} />
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.expenseTint, borderRadius: cardRadius }]}>
            <View style={styles.summaryIconRow}>
              <ArrowDownRight size={18} color={colors.danger} strokeWidth={2.2} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
            </View>
            <CountUp value={totalExpense} prefix="₹" style={[styles.summaryValue, { color: colors.textPrimary }]} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.segmentWrapper}>
          <View
            style={[styles.segmentContainer, { backgroundColor: colors.segmentInactiveBg }]}
            onLayout={onSegmentLayout}
          >
            {segmentWidth > 0 && (
              <Animated.View
                style={[
                  styles.segmentIndicator,
                  { backgroundColor: colors.segmentActiveBg, borderRadius: cardRadius - 4 },
                  indicatorStyle,
                ]}
              />
            )}
            {TABS.map((tab, index) => (
              <Pressable
                key={tab}
                style={styles.segmentItem}
                onPress={() => handleTabPress(tab, index)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: activeTab === tab ? colors.segmentActiveText : colors.segmentInactiveText },
                  ]}
                >
                  {TAB_LABELS[tab]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={[styles.searchRow, { backgroundColor: colors.inputBg }]}>
          <Search size={18} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search transactions"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>
      </View>

      <View style={styles.content}>
        <FlashList
          data={grouped}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          getItemType={item => item.type}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: insets.bottom + 144,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <PiggyBankIllustration size={120} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add your first expense to get started
              </Text>
            </View>
          }
        />
      </View>

      {pendingDelete && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.undoBanner, { backgroundColor: colors.primaryAccent, bottom: insets.bottom + 24 }]}
        >
          <Text style={styles.undoText} numberOfLines={1}>
            {pendingDelete.description || pendingDelete.category} deleted
          </Text>
          <Pressable onPress={undoDelete}>
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    flex: 1,
  },
  categoriesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
  },

  segmentWrapper: {
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    overflow: 'hidden',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    padding: 0,
  },

  selectionDeleteButton: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  content: {
    flex: 1,
  },

  dateHeader: {
    fontSize: 13,
    fontFamily: 'Satoshi-Bold',
    marginTop: 12,
    marginBottom: 8,
  },

  swipeDelete: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowInfo: { flex: 1, marginRight: 8 },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
  },
  rowMeta: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    marginTop: 3,
  },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
  },
  rowDate: {
    fontSize: 11,
    fontFamily: 'Satoshi-Regular',
    marginTop: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    marginTop: 2,
  },

  undoBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  undoText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    marginRight: 12,
  },
  undoAction: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Satoshi-Bold',
  },
});

export default TransactionsScreen;
