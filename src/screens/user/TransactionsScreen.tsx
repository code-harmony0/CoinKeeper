/**
 * TransactionsScreen - Spec Theme Design
 * Left-aligned header, income/expense summary, animated segmented filter, list
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Text, LayoutChangeEvent } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTransactions } from '../../hooks/useTransactions';
import { useSpecTheme } from '../../theme/specTheme';
import { Transaction } from '../../types/transaction';
import { CountUp, PressableScale } from '../../components/anim';
import { PiggyBankIllustration } from '../../components/illustrations';

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
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, spring, iconShadow } = useSpecTheme();
  const { transactions } = useTransactions();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [segmentWidth, setSegmentWidth] = useState(0);

  const indicatorX = useSharedValue(0);

  const filteredTx = useMemo(
    () => (activeTab === 'all' ? transactions : transactions.filter(t => t.type === activeTab)),
    [transactions, activeTab],
  );

  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

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

  const renderItem = ({ item, index }: ListRenderItemInfo<Transaction>) => {
    const Icon = CATEGORY_ICONS[item.categoryIcon] || MoreHorizontal;
    const isIncome = item.type === 'income';
    const date = new Date(item.date);
    const dateLabel = isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
        <View style={styles.row}>
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
            {!!dateLabel && (
              <Text style={[styles.rowDate, { color: colors.textSecondary }]}>{dateLabel}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerSection, { paddingTop: insets.top + 16 }]}>
        <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.headerRow}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.chipBg }]}
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Transactions</Text>
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
      </View>

      <View style={styles.content}>
        <FlashList
          data={filteredTx}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: insets.bottom + 144,
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
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

  content: {
    flex: 1,
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
  separator: {
    height: StyleSheet.hairlineWidth,
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
});

export default TransactionsScreen;
