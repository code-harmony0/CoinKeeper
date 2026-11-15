/**
 * TransactionsScreen - Spec Theme Design
 * Left-aligned header, income/expense summary, animated segmented filter, list
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Search,
  Trash2,
  Tag,
  MessageSquare,
  X,
  SlidersHorizontal,
  Plus,
  CircleAlert,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';
import { useTransactionStore } from '../../store/transactionStore';
import { Money } from '../../utils/money';
import { useSecureScreen } from '../../hooks/useSecureScreen';
import { brand, onInk, useSpecTheme } from '../../theme/specTheme';
import { Transaction } from '../../types/transaction';
import { CountUp, PressableScale } from '../../components/anim';
import { PiggyBankIllustration } from '../../components/illustrations';
import { AppHeader } from '../../components/ui/AppHeader';
import { groupTransactionsByDate, GroupedRow } from '../../utils/groupTransactionsByDate';
import { categoryLabel } from '../../utils/categoryLabel';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { isWithinPeriod, PeriodFilter } from '../../utils/transactionPeriod';
import { TransactionFiltersSheet } from '../../components/transaction/TransactionFiltersSheet';
import { TransactionDetailSheet } from '../../components/transaction/TransactionDetailSheet';
import { CategoryPickerSheet, PickableCategory } from '../../components/transaction/CategoryPickerSheet';
import { matchesSearch } from '../../utils/transactionSearch';
import { needsReview } from '../../utils/transactionReview';
import { AmountDateFilter, matchesAmountDateFilter, isFilterActive, matchesCategory } from '../../utils/transactionFilters';

type Props = NativeStackScreenProps<any, 'Transactions'>;

type FilterTab = 'all' | 'income' | 'expense' | 'transfer_to_goal';
const TABS: FilterTab[] = ['all', 'income', 'expense', 'transfer_to_goal'];

export const TransactionsScreen: React.FC<Props> = ({ navigation, route }) => {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, spring, iconShadow, isDark } = useSpecTheme();

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
  const { transactions, deleteTransaction, updateTransaction } = useTransactions();
  const formatNet = (paise: number) => `${paise < 0 ? '−' : paise > 0 ? '+' : ''}${Money.format(Math.abs(paise), { zeroDecimals: true })}`;
  const markAwaitingReturn = useTransactionStore(state => state.markAwaitingReturn);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  // "All Time" by default: an SMS import brings in months of history, and
  // scoping to the current month hid all of it behind a filter nobody knew
  // to change — the import looked like it had done nothing.
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  // Set when the user drills in from a Reports category. Held as state, not read
  // straight from params, so clearing the chip sticks instead of springing back.
  const [categoryFilter, setCategoryFilter] = useState<string | null>(
    (route?.params as { category?: string } | undefined)?.category ?? null,
  );
  const [amountDateFilter, setAmountDateFilter] = useState<AmountDateFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  // Review mode lists every uncategorised transaction, whatever the period
  // or tab, and a tap on a row goes straight to picking its category.
  const [reviewOnly, setReviewOnly] = useState(false);
  const [categoryTarget, setCategoryTarget] = useState<Transaction | null>(null);
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
  // Mirrors pendingDelete in a ref so the unmount cleanup can read the
  // current value without capturing a stale closure.
  const pendingDeleteRef = useRef<Transaction | null>(null);

  const indicatorX = useSharedValue(0);

  // Keep pendingDeleteRef in sync so the unmount cleanup always has the
  // current value (state in cleanup closures is stale).
  useEffect(() => {
    pendingDeleteRef.current = pendingDelete;
  }, [pendingDelete]);

  // Commit any pending delete when the user navigates away before the
  // 5-second timer fires — prevents silent data loss on unmount.
  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) {
        clearTimeout(undoTimer.current);
        if (pendingDeleteRef.current) {
          deleteTransaction(pendingDeleteRef.current.id);
        }
      }
    };
  }, [deleteTransaction]);

  // Money that left and came back is not spending and not income — it belongs
  // on the Lent & returned screen, not in this list or its totals.
  const settled = useMemo(
    () => transactions.filter(t => !t.awaitingReturn && !t.settlementOf),
    [transactions],
  );

  const filteredTx = useMemo(
    () => (activeTab === 'all' ? settled.filter(t => t.type !== 'transfer_to_goal') : settled.filter(t => t.type === activeTab)),
    [settled, activeTab],
  );

  const reviewTx = useMemo(() => settled.filter(needsReview), [settled]);

  const inPeriod = useMemo(
    () => (reviewOnly ? reviewTx : filteredTx.filter(t => isWithinPeriod(t.date, period))),
    [reviewOnly, reviewTx, filteredTx, period],
  );

  // Categorising the last one ends the review — nothing left to show.
  useEffect(() => {
    if (reviewOnly && reviewTx.length === 0) setReviewOnly(false);
  }, [reviewOnly, reviewTx.length]);

  // Summary cards and tab badge counts answer "what happened this period" and should
  // stay stable across the type tabs — only `inPeriod` (used for the visible list) is
  // scoped to `activeTab`.
  const inPeriodAllTabs = useMemo(
    () => settled.filter(t => isWithinPeriod(t.date, period)),
    [settled, period],
  );

  // The Transactions tab stays mounted, so a second drill-down from Reports
  // arrives as a param change on a live screen — useState's initial value alone
  // would silently keep showing the first category.
  const routeCategory = (route?.params as { category?: string } | undefined)?.category;
  useEffect(() => {
    if (routeCategory) setCategoryFilter(routeCategory);
  }, [routeCategory]);

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return inPeriod;
    return inPeriod.filter(t => matchesSearch(t, searchQuery));
  }, [inPeriod, searchQuery]);

  const filtered = useMemo(
    () =>
      searched.filter(
        t =>
          matchesAmountDateFilter(t, amountDateFilter) &&
          matchesCategory(t, categoryFilter),
      ),
    [searched, amountDateFilter, categoryFilter],
  );

  const grouped = useMemo(
    () => groupTransactionsByDate(filtered.filter(t => !hiddenIds.has(t.id))),
    [filtered, hiddenIds],
  );
  const headerIndices = useMemo(
    () => grouped.reduce<number[]>((acc, row, i) => (row.type === 'header' ? [...acc, i] : acc), []),
    [grouped],
  );

  const totalIncome = useMemo(
    () => inPeriodAllTabs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amountPaise || 0), 0),
    [inPeriodAllTabs],
  );
  const totalExpense = useMemo(
    () => inPeriodAllTabs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amountPaise || 0), 0),
    [inPeriodAllTabs],
  );

  const incomeCount = inPeriodAllTabs.filter(t => t.type === 'income').length;
  const expenseCount = inPeriodAllTabs.filter(t => t.type === 'expense').length;
  const transferCount = inPeriodAllTabs.filter(t => t.type === 'transfer_to_goal').length;
  const allCount = inPeriodAllTabs.filter(t => t.type !== 'transfer_to_goal').length;

  const tabCounts = {
    all: allCount,
    income: incomeCount,
    expense: expenseCount,
    transfer_to_goal: transferCount,
  };

  /**
   * Only offer a filter that would actually filter something.
   *
   * "Transfers (0)" sat in this row on every account that had never moved
   * money to a goal — a control that does nothing, taking the width that
   * pushed the row past the right edge and clipped its own label. A filter
   * for an empty bucket is chrome, not a feature.
   *
   * The currently-selected tab always stays visible, so the row can never
   * yank the option out from under a user whose filter just emptied.
   */
  const visibleTabs = useMemo(
    () => TABS.filter(t => t === 'all' || t === activeTab || tabCounts[t] > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, allCount, incomeCount, expenseCount, transferCount],
  );

  // Material Snackbar pattern: commit the previous pending delete immediately
  // when a new swipe arrives, then start a fresh 5-second window for the new
  // one. Prevents the old timer from firing as an orphan and silently deleting
  // an item the user had no chance to undo.
  const requestDelete = useCallback(
    (tx: Transaction) => {
      ReactNativeHapticFeedback.trigger('impactMedium');

      if (undoTimer.current !== null) {
        clearTimeout(undoTimer.current);
        undoTimer.current = null;
        // Commit whatever was pending before this new swipe arrived:
        if (pendingDelete) {
          deleteTransaction(pendingDelete.id);
        }
        setPendingDelete(null);
      }

      setHiddenIds(prev => new Set(prev).add(tx.id));
      setPendingDelete(tx);
      undoTimer.current = setTimeout(() => {
        deleteTransaction(tx.id);
        setPendingDelete(null);
        undoTimer.current = null;
      }, 5000);
    },
    [pendingDelete, deleteTransaction],
  );

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

  const handleRecategorize = async (category: PickableCategory) => {
    const target = categoryTarget;
    setCategoryTarget(null);
    if (!target) return;
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    await updateTransaction(target.id, {
      category: category.name,
      categoryId: category.id,
      categoryIcon: category.icon,
      categoryColor: category.color,
    });
  };

  const handleSaveDetail = async (id: string, updates: Partial<Transaction>) => {
    // "I'll get this back" is its own column with its own action — updateTransaction
    // writes the money fields and would drop it silently.
    const { awaitingReturn, ...moneyFields } = updates;
    await updateTransaction(id, moneyFields);
    if (awaitingReturn !== undefined) {
      await markAwaitingReturn(id, awaitingReturn);
    }
    setDetailTx(null);
  };

  const handleDeleteDetail = async (id: string) => {
    await deleteTransaction(id);
    setDetailTx(null);
  };

  const handleTabPress = (tab: FilterTab, index: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setActiveTab(tab);
    indicatorX.value = withSpring(index * segmentWidth, spring);
  };

  // Both the slot width and the resting position key off `visibleTabs`, not
  // the full TABS list — hiding an empty filter changes how many slots there
  // are, and an indicator sized for four slots under a row of three sits
  // permanently offset from the label it is supposed to be under.
  const onSegmentLayout = (e: LayoutChangeEvent) => {
    const width = (e.nativeEvent.layout.width - 8) / visibleTabs.length;
    setSegmentWidth(width);
    indicatorX.value = Math.max(0, visibleTabs.indexOf(activeTab)) * width;
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth,
  }));

  const formatAmount = (amount: number) => Money.format(amount, { zeroDecimals: true });

  const renderRow = (item: Transaction, index: number) => {
    const Icon = resolveCategoryIcon(item.categoryId, item.categoryIcon, item.description);
    const isIncome = item.type === 'income';
    const isSelected = selectedIds.has(item.id);

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
        <Swipeable
          renderLeftActions={(_progress: unknown, _drag: unknown, swipeable: any) => (
            <Pressable
              testID={`swipe-category-${item.id}`}
              onPress={() => {
                swipeable?.close?.();
                setCategoryTarget(item);
              }}
              style={[styles.swipeCategory, { backgroundColor: colors.primaryAccent }]}
            >
              <Tag size={20} color={colors.onAccent} strokeWidth={2} />
            </Pressable>
          )}
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
          <PressableScale
            testID={`row-${item.id}`}
            onLongPress={() => enterSelection(item.id)}
            onPress={() =>
              selectedIds.size > 0
                ? toggleSelected(item.id)
                : reviewOnly
                  ? setCategoryTarget(item)
                  : setDetailTx(item)
            }
            style={[styles.row, isSelected && { backgroundColor: colors.chipBg }]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${item.description || categoryLabel(item.category)}. ${categoryLabel(item.category)}. ${isIncome ? 'Income' : 'Expense'} of ${formatAmount(item.amountPaise)} rupees`}
          >
            <View
              testID={`row-icon-${item.id}`}
              style={[styles.rowIcon, { backgroundColor: item.categoryColor || colors.chipBg }, iconShadow]}
            >
              <Icon size={20} color={colors.textPrimary} strokeWidth={2} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.description || categoryLabel(item.category)}
              </Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                {categoryLabel(item.category)}
                {item.paymentMethod && item.paymentMethod.toLowerCase() !== 'manual'
                  ? ` • ${item.paymentMethod.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())}`
                  : ''}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowAmount, { color: isIncome ? colors.mintDeep : colors.textPrimary }]}>
                {isIncome ? '+' : ''}{formatAmount(item.amountPaise)}
              </Text>
            </View>
          </PressableScale>
        </Swipeable>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<GroupedRow>) => {
    if (item.type === 'header') {
      return (
        <View style={[styles.dateHeaderContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.dateHeader, { color: colors.textSecondary, backgroundColor: colors.background }]}>
            {item.label}
          </Text>
          <View style={[styles.dateHeaderLine, { backgroundColor: colors.border || colors.chipBg }]} />
          {item.netPaise !== 0 && (
            <Text style={[styles.dateNet, { color: item.netPaise > 0 ? colors.mintDeep : colors.textSecondary }]}>
              {formatNet(item.netPaise)}
            </Text>
          )}
        </View>
      );
    }
    return renderRow(item.tx, index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerSection, { paddingTop: insets.top + 16 }]}>
        {selectedIds.size > 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.headerRow}>
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
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.headerRow}>
            <AppHeader
              title="Transactions"
              rightActions={
                <>
                  <PressableScale
                    onPress={() => navigation.navigate('SmsReview')}
                    accessibilityRole="button"
                    accessibilityLabel="Review SMS transactions"
                    style={[styles.categoriesButton, { backgroundColor: colors.chipBg }]}
                  >
                    <MessageSquare size={18} color={colors.textPrimary} strokeWidth={2.2} />
                  </PressableScale>
                  <PressableScale
                    onPress={() => navigation.navigate('Categories')}
                    accessibilityRole="button"
                    accessibilityLabel="Manage categories"
                    style={[styles.categoriesButton, { backgroundColor: colors.chipBg }]}
                  >
                    <Tag size={18} color={colors.textPrimary} strokeWidth={2.2} />
                  </PressableScale>
                </>
              }
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.chipBg : brand.ink, borderRadius: 16 }]}>
            <View style={styles.summaryIconRow}>
              <ArrowUpRight size={18} color={brand.signal} strokeWidth={2.4} />
              <Text style={[styles.summaryLabel, { color: onInk.mid }]}>Money in</Text>
            </View>
            <CountUp testID="summary-income" value={totalIncome} prefix="₹" isPaise style={[styles.summaryValue, { color: onInk.high }]} />
          </View>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.chipBg : brand.ink, borderRadius: 16 }]}>
            <View style={styles.summaryIconRow}>
              <ArrowDownRight size={18} color={onInk.mid} strokeWidth={2.4} />
              <Text style={[styles.summaryLabel, { color: onInk.mid }]}>Money spent</Text>
            </View>
            <CountUp testID="summary-expense" value={totalExpense} prefix="₹" isPaise style={[styles.summaryValue, { color: onInk.high }]} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={[styles.periodRow, reviewOnly && styles.hidden]}>
          {(['week', 'month', 'all'] as PeriodFilter[]).map(p => (
            <Pressable
              key={p}
              testID={`period-${p}`}
              onPress={() => setPeriod(p)}
              style={[styles.periodPill, period === p && { backgroundColor: colors.chipBg }]}
            >
              <Text style={[styles.periodText, { color: period === p ? colors.textPrimary : colors.textSecondary }]}>
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.segmentWrapper, reviewOnly && styles.hidden]}>
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
            {visibleTabs.map((tab, index) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={styles.segmentItem}
                  onPress={() => handleTabPress(tab, index)}
                  accessible={true}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[
                      styles.segmentText,
                      { color: isActive ? colors.segmentActiveText : colors.segmentInactiveText },
                    ]}
                  >
                    {tab === 'transfer_to_goal' ? 'Transfers' : tab.charAt(0).toUpperCase() + tab.slice(1)} ({tabCounts[tab]})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {categoryFilter && (
          <Animated.View entering={FadeInDown.springify()} style={styles.categoryChipRow}>
            <Pressable
              testID="clear-category-filter"
              accessibilityRole="button"
              accessibilityLabel={`Showing ${categoryFilter} only. Clear this filter`}
              onPress={() => setCategoryFilter(null)}
              style={[styles.categoryChip, { backgroundColor: colors.chipBg }]}
            >
              <Text style={[styles.categoryChipText, { color: colors.textPrimary }]}>
                {categoryFilter}
              </Text>
              <X size={14} color={colors.textSecondary} />
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(120).springify()} style={[styles.searchRow, { backgroundColor: colors.inputBg }]}>
          <Search size={18} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search merchant, category or amount"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={12}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable testID="open-filters" onPress={() => setShowFilters(true)} style={styles.filterIconBtn}>
            <SlidersHorizontal
              size={18}
              color={isFilterActive(amountDateFilter) ? colors.primaryAccent : colors.textSecondary}
              strokeWidth={2}
            />
          </Pressable>
        </Animated.View>

        {reviewTx.length > 0 && (
          <Animated.View entering={FadeInDown.springify()} style={styles.reviewWrap}>
            <Pressable
              testID="review-banner"
              accessibilityRole="button"
              accessibilityLabel={reviewOnly ? 'Stop reviewing' : `${reviewTx.length} transactions need a category. Review them`}
              onPress={() => setReviewOnly(v => !v)}
              style={[styles.reviewBanner, { backgroundColor: reviewOnly ? colors.primaryAccent : colors.expenseTint, borderRadius: cardRadius }]}
            >
              <CircleAlert size={18} color={reviewOnly ? colors.onAccent : colors.danger} strokeWidth={2.2} />
              <Text style={[styles.reviewText, { color: reviewOnly ? colors.onAccent : colors.textPrimary }]} numberOfLines={1}>
                {reviewOnly
                  ? `Tap a transaction to categorise it · ${reviewTx.length} left`
                  : `${reviewTx.length} ${reviewTx.length === 1 ? 'transaction needs' : 'transactions need'} a category`}
              </Text>
              <Text style={[styles.reviewAction, { color: reviewOnly ? colors.onAccent : colors.primaryAccent }]}>
                {reviewOnly ? 'Done' : 'Review'}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      <View style={styles.content}>
        <FlashList
          data={grouped}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          stickyHeaderIndices={headerIndices}
          getItemType={item => item.type}
          // FlashList ignores width/alignment on its content container, and
          // setting them there left the list measuring wrong — rows drew behind
          // the tab bar with empty space above. Centring belongs on the parent.
          contentContainerStyle={{
            paddingHorizontal: 24,
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
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary, marginBottom: 16 }]}>
                Add your first expense to get started
              </Text>
              <PressableScale onPress={() => navigation.navigate('Add')} style={[styles.quickAddBtn, { backgroundColor: colors.primaryAccent, borderRadius: cardRadius }]}>
                <Text style={[styles.quickAddText, { color: colors.onAccent }]}>Quick Add</Text>
              </PressableScale>
            </View>
          }
        />
      </View>

      <TransactionFiltersSheet
        visible={showFilters}
        initialFilter={amountDateFilter}
        onApply={setAmountDateFilter}
        onClose={() => setShowFilters(false)}
      />

      <CategoryPickerSheet
        visible={!!categoryTarget}
        selectedCategoryId={categoryTarget?.categoryId}
        onSelect={handleRecategorize}
        onClose={() => setCategoryTarget(null)}
      />

      <TransactionDetailSheet
        visible={!!detailTx}
        transaction={detailTx}
        onClose={() => setDetailTx(null)}
        onSave={handleSaveDetail}
        onDelete={handleDeleteDetail}
        allTransactions={transactions}
      />

      {pendingDelete && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.undoBanner, { backgroundColor: colors.primaryAccent, bottom: insets.bottom + 24 }]}
        >
          <Text style={[styles.undoText, { color: colors.onAccent }]} numberOfLines={1}>
            {pendingDelete.description || categoryLabel(pendingDelete.category)} deleted
          </Text>
          <Pressable onPress={undoDelete}>
            <Text style={[styles.undoAction, { color: colors.onAccent }]}>Undo</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    paddingHorizontal: 24,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  swipeCategory: { width: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginRight: 8 },
  dateNet: { fontSize: 12, fontFamily: 'Satoshi-Bold', marginLeft: 8 },
  reviewWrap: { marginTop: 12 },
  reviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
  reviewText: { flex: 1, fontSize: 13, fontFamily: 'Satoshi-Medium' },
  reviewAction: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
  },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  periodText: { fontSize: 12, fontFamily: 'Satoshi-Bold' },

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
    // Flex children refuse to shrink below their content without this, so a
    // long label ("Transfers (10)") pushed the row wider than its container —
    // and overflow:hidden then clipped the neighbouring tab out of sight.
    minWidth: 0,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    // Four tabs on a 360dp screen leave ~85dp each; the label scales down to
    // fit its slot rather than spilling into the tab beside it.
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  categoryChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
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
  filterIconBtn: { paddingLeft: 8 },

  selectionDeleteButton: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  content: {
    // Nothing but flex here on purpose: a maxWidth/alignSelf wrapper left
    // FlashList resolving its width a frame late, and a long list then failed
    // to paint at all until a scroll nudged it.
    flex: 1,
  },

  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  hidden: { display: 'none' },
  dateHeader: {
    fontSize: 13,
    fontFamily: 'Satoshi-Bold',
    paddingRight: 12,
    zIndex: 1,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
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
    paddingVertical: 16,
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
    fontFamily: 'Satoshi-Black',
    letterSpacing: 0.2,
  },
  rowMeta: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    marginTop: 3,
  },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: {
    fontSize: 15,
    fontFamily: 'Satoshi-Black',
    fontVariant: ['tabular-nums'],
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
    fontSize: 18,
    fontFamily: 'Satoshi-Bold',
    marginTop: 24,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  quickAddBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  quickAddText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
  },

  undoBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
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
