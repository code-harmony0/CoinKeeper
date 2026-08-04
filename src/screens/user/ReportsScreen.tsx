/**
 * ReportsScreen — Spec Theme Design
 * Left-aligned header, income/expense summary, animated segmented filter, category breakdown
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, LayoutChangeEvent } from 'react-native';
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
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  Wallet,
  TrendingUp,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';
import { useSpecTheme } from '../../theme/specTheme';
import { useBudgetStore } from '../../store/budgetStore';
import { PressableScale } from '../../components/anim';
import { ChartIllustration } from '../../components/illustrations';
import { StatRing } from '../../components/premium';

type Props = NativeStackScreenProps<any, 'Reports'>;

type FilterTab = 'expense' | 'income' | 'budget';
const TABS: FilterTab[] = ['expense', 'income', 'budget'];
const TAB_LABELS: Record<FilterTab, string> = {
  expense: 'Spending',
  income: 'Income',
  budget: 'Budget',
};

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  food: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  bills: Receipt,
  entertainment: Film,
  health: HeartPulse,
  salary: Wallet,
  freelance: Wallet,
  investment: TrendingUp,
  other: MoreHorizontal,
  others: MoreHorizontal,
};

export const ReportsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow, spring } = useSpecTheme();
  const { transactions } = useTransactions();
  const { settings } = useBudgetStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('expense');
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  const indicatorX = useSharedValue(0);

  // Filter transactions by selected month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  }, [transactions, currentDate]);

  // Calculate category totals for the active tab
  const sortedCategories = useMemo(() => {
    const categoryTotals = monthlyTransactions
      .filter((t) => t.type === activeTab)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
  }, [monthlyTransactions, activeTab]);

  const total = useMemo(
    () => sortedCategories.reduce((sum, [, amount]) => sum + amount, 0),
    [sortedCategories],
  );

  // Calculate totals for summary
  const totalExpense = useMemo(
    () => monthlyTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [monthlyTransactions],
  );
  const totalIncome = useMemo(
    () => monthlyTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [monthlyTransactions],
  );

  const handleTabPress = (tab: FilterTab, index: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setActiveTab(tab);
    indicatorX.value = withSpring(index * segmentWidth, spring);
  };

  const nextMonth = () => {
    const today = new Date();
    // Guard against future months
    if (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() >= today.getMonth()) return;
    if (currentDate.getFullYear() > today.getFullYear()) return;

    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Budget calculations
  const budgetStats = useMemo(() => {
    let needsSpent = 0;
    let wantsSpent = 0;

    monthlyTransactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category.toLowerCase();
        if (['food', 'transport', 'bills', 'health', 'education'].includes(cat)) {
          needsSpent += t.amount;
        } else if (['shopping', 'entertainment', 'other', 'others', 'investment', 'savings'].includes(cat)) {
          wantsSpent += t.amount;
        } else {
          wantsSpent += t.amount; // default to wants
        }
      }
    });

    const needsTarget = totalIncome * (settings.needsPercent / 100);
    const wantsTarget = totalIncome * (settings.wantsPercent / 100);
    const savingsTarget = totalIncome * (settings.savingsPercent / 100);
    
    // Savings is simply whatever money was not spent.
    const actualSavings = Math.max(0, totalIncome - needsSpent - wantsSpent);

    return {
      needs: { spent: needsSpent, target: needsTarget, percent: settings.needsPercent },
      wants: { spent: wantsSpent, target: wantsTarget, percent: settings.wantsPercent },
      savings: { spent: actualSavings, target: savingsTarget, percent: settings.savingsPercent }
    };
  }, [monthlyTransactions, totalIncome, settings]);

  const onSegmentLayout = (e: LayoutChangeEvent) => {
    const width = (e.nativeEvent.layout.width - 8) / TABS.length;
    setSegmentWidth(width);
    indicatorX.value = TABS.indexOf(activeTab) * width;
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 },
        ]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.headerRow}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.chipBg }]}
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Reports</Text>
        </Animated.View>

        {/* Month Selector */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.monthSelector}>
          <PressableScale onPress={prevMonth} style={[styles.monthBtn, { backgroundColor: colors.chipBg }]}>
            <ChevronLeft size={20} color={colors.textPrimary} />
          </PressableScale>
          <Text style={[styles.monthText, { color: colors.textPrimary }]}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <PressableScale onPress={nextMonth} style={[styles.monthBtn, { backgroundColor: colors.chipBg }]}>
            <ChevronRight size={20} color={colors.textPrimary} />
          </PressableScale>
        </Animated.View>

        {/* Hero Stat Ring */}
        <Animated.View
          entering={FadeInDown.delay(60).springify()}
          style={[styles.heroCard, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}
        >
          {totalExpense + totalIncome > 0 ? (
            <StatRing
              value={totalExpense}
              total={totalExpense + totalIncome}
              size={160}
              strokeWidth={14}
              tint="peach"
              label="spent this month"
              centerValue={
                <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
                  ₹{totalExpense.toLocaleString('en-IN')}
                </Text>
              }
            />
          ) : (
            <Text style={[styles.heroEmpty, { color: colors.textSecondary }]}>No activity yet</Text>
          )}

          <View style={styles.inlineStatsRow}>
            <View style={styles.inlineStat}>
              <View style={[styles.inlineDot, { backgroundColor: colors.mint }]} />
              <Text style={[styles.inlineStatLabel, { color: colors.textSecondary }]}>Income</Text>
              <Text style={[styles.inlineStatValue, { color: colors.mintDeep }]}>
                ₹{totalIncome.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.inlineStat}>
              <View style={[styles.inlineDot, { backgroundColor: colors.peach }]} />
              <Text style={[styles.inlineStatLabel, { color: colors.textSecondary }]}>Expense</Text>
              <Text style={[styles.inlineStatValue, { color: colors.peachDeep }]}>
                ₹{totalExpense.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
          
          {/* Projection text */}
          {activeTab === 'budget' && totalIncome > 0 && (
            <View style={[styles.projectionWrap, { backgroundColor: colors.chipBg }]}>
              <Text style={[styles.projectionText, { color: colors.textSecondary }]}>
                At this rate, you'll save <Text style={{ color: colors.mintDeep, fontFamily: 'Satoshi-Bold' }}>₹{Math.max(0, totalIncome - totalExpense * 1.2).toLocaleString('en-IN')}</Text> by month end
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Category Breakdown Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Category Breakdown</Text>
        </Animated.View>

        {/* Segmented control */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.segmentWrapper}>
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
              <PressableScale
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
              </PressableScale>
            ))}
          </View>
        </Animated.View>

        {/* Category / Budget List */}
        {activeTab === 'budget' ? (
          totalIncome === 0 ? (
            <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.emptyState}>
              <ChartIllustration size={120} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Income This Month
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add your income to see how your spending matches your {settings.needsPercent}/{settings.wantsPercent}/{settings.savingsPercent} budget rule.
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.budgetContainer}>
              {/* Needs */}
              <View style={[styles.categoryCard, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.incomeTint }]}>
                    <HeartPulse size={20} color={colors.mintDeep} strokeWidth={2} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      Needs ({budgetStats.needs.percent}%)
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.chipBg }]}>
                      <View style={[styles.progressFill, { width: `${Math.min((budgetStats.needs.spent / budgetStats.needs.target) * 100, 100)}%`, backgroundColor: budgetStats.needs.spent > budgetStats.needs.target ? colors.danger : colors.mintDeep }]} />
                    </View>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>
                      ₹{budgetStats.needs.spent.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      of ₹{budgetStats.needs.target.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Wants */}
              <View style={[styles.categoryCard, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.expenseTint }]}>
                    <ShoppingBag size={20} color={colors.peachDeep} strokeWidth={2} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      Wants ({budgetStats.wants.percent}%)
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.chipBg }]}>
                      <View style={[styles.progressFill, { width: `${Math.min((budgetStats.wants.spent / budgetStats.wants.target) * 100, 100)}%`, backgroundColor: budgetStats.wants.spent > budgetStats.wants.target ? colors.danger : colors.peachDeep }]} />
                    </View>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>
                      ₹{budgetStats.wants.spent.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      of ₹{budgetStats.wants.target.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Savings */}
              <View style={[styles.categoryCard, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.chipBg }]}>
                    <TrendingUp size={20} color={colors.textPrimary} strokeWidth={2} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      Savings ({budgetStats.savings.percent}%)
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.chipBg }]}>
                      <View style={[styles.progressFill, { width: `${Math.min((budgetStats.savings.spent / budgetStats.savings.target) * 100, 100)}%`, backgroundColor: colors.textPrimary }]} />
                    </View>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>
                      ₹{budgetStats.savings.spent.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      of ₹{budgetStats.savings.target.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )
        ) : sortedCategories.length > 0 ? (
          sortedCategories.map(([category, amount], index) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0;
            const Icon = CATEGORY_ICONS[category.toLowerCase()] || MoreHorizontal;
            const accentColor = activeTab === 'income' ? colors.success : colors.danger;

            return (
              <Animated.View
                key={category}
                entering={FadeInDown.delay(180 + index * 20).springify()}
                style={[styles.categoryCard, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}
              >
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.chipBg }]}>
                    <Icon size={20} color={colors.textPrimary} strokeWidth={2} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {category}
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.chipBg }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${percentage}%`, backgroundColor: accentColor },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>
                      ₹{amount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          })
        ) : (
          <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.emptyState}>
            <ChartIllustration size={120} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No {activeTab === 'expense' ? 'spending' : 'income'} data yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add a {activeTab === 'expense' ? 'expense' : 'income'} transaction to see it here
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { fontSize: 26, fontFamily: 'Satoshi-Black' },

  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 18,
    fontFamily: 'Satoshi-Bold',
  },

  // Hero
  heroCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  heroValue: {
    fontSize: 32,
    fontFamily: 'Satoshi-Black',
  },
  heroEmpty: { marginTop: 40, marginBottom: 20, fontSize: 16, fontFamily: 'Satoshi-Medium' },
  projectionWrap: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  projectionText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
  },
  inlineStatsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 24 },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inlineStatLabel: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
  },
  inlineStatValue: {
    fontSize: 13,
    fontFamily: 'Satoshi-Bold',
  },

  // Section Header
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontFamily: 'Satoshi-Bold' },

  // Segmented control
  segmentWrapper: { marginBottom: 16 },
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
  
  budgetContainer: {
    gap: 12,
  },

  // Category Card
  categoryCard: {
    padding: 16,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  categoryAmountContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  categoryAmount: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
  },
  categoryPercentage: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    marginTop: 2,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
  },
});

export default ReportsScreen;
