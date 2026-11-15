/**
 * ReportsScreen — Spec Theme Design
 * Left-aligned header, income/expense summary, animated segmented filter, category breakdown
 */
import React, { useMemo, useState, useCallback } from 'react';
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

import { brand, onInk, useSpecTheme } from '../../theme/specTheme';
import { Bezel } from '../../components/shared/Bezel';
import { ProgressBar } from '../../components/shared/ProgressBar';
import { RollingNumber } from '../../components/anim/RollingNumber';
import { useBudgetStore } from '../../store/budgetStore';
import { PressableScale } from '../../components/anim';
import { ChartIllustration } from '../../components/illustrations';
import { FinancialIntelligenceEngine, ReportSnapshot } from '../../services/FinancialIntelligenceEngine';
import { Money } from '../../utils/money';

type Props = NativeStackScreenProps<any, 'Reports'>;

type FilterTab = 'expense' | 'income' | 'budget' | 'savings';
const TABS: FilterTab[] = ['expense', 'income', 'savings', 'budget'];
const TAB_LABELS: Record<FilterTab, string> = {
  expense: 'Spending',
  income: 'Income',
  savings: 'Savings',
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
  const { colors, cardRadius, isDark, spring } = useSpecTheme();
  const { settings } = useBudgetStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('expense');
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [report, setReport] = useState<ReportSnapshot | null>(null);
  const indicatorX = useSharedValue(0);

  React.useEffect(() => {
    FinancialIntelligenceEngine.getReportForMonth(currentDate).then(setReport);
  }, [currentDate]);

  /**
   * A category row is the natural place to ask "what did I actually buy?" —
   * it used to be a dead tap. Hands the name to the Transactions tab, which
   * filters on an exact match and shows a chip the user can clear.
   */
  const openCategory = useCallback(
    (categoryName: string) => {
      navigation.navigate('UserTabs', {
        screen: 'Transactions',
        params: { category: categoryName },
      } as never);
    },
    [navigation],
  );

  const activeCategories = useMemo(() => {
    if (!report) return [];
    if (activeTab === 'expense') return report.categoryBreakdown.expense;
    if (activeTab === 'income') return report.categoryBreakdown.income;
    if (activeTab === 'savings') return report.categoryBreakdown.transfers;
    return [];
  }, [report, activeTab]);

  const totalForTab = useMemo(
    () => activeCategories.reduce((sum, c) => sum + c.amountPaise, 0),
    [activeCategories],
  );

  const totalExpense = report?.totalExpense || 0;
  const totalIncome = report?.totalIncome || 0;
  const budgetStats = report?.budgetStats;

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

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.heroWrap}>
          <Bezel tone="ink" solid>
            {totalExpense + totalIncome > 0 ? (
              <>
                <Text style={styles.heroLabel}>Spent this month</Text>
                <RollingNumber
                  valuePaise={totalExpense}
                  fontSize={44}
                  lineHeight={52}
                  letterSpacing={-1.5}
                  color={brand.signal}
                />
                {totalIncome > 0 && (
                  <View style={styles.heroBar}>
                    <ProgressBar ratio={totalExpense / totalIncome} tone="signal" />
                    <Text style={styles.heroBarText}>
                      {Math.round((totalExpense / totalIncome) * 100)}% of the money that came in
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.heroLabel}>No activity this month yet</Text>
            )}

            <View style={styles.inlineStatsRow}>
              <View style={styles.inlineStat}>
                <Text style={styles.inlineStatLabel}>Money in</Text>
                <Text style={styles.inlineStatValue}>{Money.format(totalIncome, { zeroDecimals: true })}</Text>
              </View>
              <View style={styles.inlineStat}>
                <Text style={styles.inlineStatLabel}>Money spent</Text>
                <Text style={styles.inlineStatValue}>{Money.format(totalExpense, { zeroDecimals: true })}</Text>
              </View>
            </View>

            {activeTab === 'budget' && totalIncome > 0 && (
              <Text style={styles.heroBarText}>
                At this rate you'll save {Money.format(Math.max(0, totalIncome - totalExpense * 1.2), { zeroDecimals: true })} by month end.
              </Text>
            )}
          </Bezel>
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
          ) : budgetStats ? (
            <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.budgetContainer}>
              {/* Needs */}
              <View style={[styles.categoryCard, { borderBottomColor: colors.border }]}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: isDark ? colors.chipBg : '#111111' }]}>
                    <HeartPulse size={20} color="#FFFFFF" strokeWidth={1.7} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      Needs ({budgetStats.needs.percent}%)
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.chipBg }]}>
                      <View style={[styles.progressFill, { width: `${Math.min((budgetStats.needs.spent / budgetStats.needs.target) * 100, 100)}%`, backgroundColor: budgetStats.needs.spent > budgetStats.needs.target ? colors.danger : colors.textPrimary }]} />
                    </View>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>
                      {Money.format(budgetStats.needs.spent, { zeroDecimals: true })}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      of {Money.format(budgetStats.needs.target, { zeroDecimals: true })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Wants */}
              <View style={[styles.categoryCard, { borderBottomColor: colors.border }]}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: isDark ? colors.chipBg : '#111111' }]}>
                    <ShoppingBag size={20} color="#FFFFFF" strokeWidth={1.7} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      Wants ({budgetStats.wants.percent}%)
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.chipBg }]}>
                      <View style={[styles.progressFill, { width: `${Math.min((budgetStats.wants.spent / budgetStats.wants.target) * 100, 100)}%`, backgroundColor: budgetStats.wants.spent > budgetStats.wants.target ? colors.danger : colors.textPrimary }]} />
                    </View>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>
                      {Money.format(budgetStats.wants.spent, { zeroDecimals: true })}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      of {Money.format(budgetStats.wants.target, { zeroDecimals: true })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Savings */}
              <View style={[styles.categoryCard, { borderBottomColor: colors.border }]}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: isDark ? colors.chipBg : '#111111' }]}>
                    <TrendingUp size={20} color="#FFFFFF" strokeWidth={1.7} />
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
                      {Money.format(budgetStats.savings.spent, { zeroDecimals: true })}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      of {Money.format(budgetStats.savings.target, { zeroDecimals: true })}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : null
        ) : activeTab === 'savings' ? (
          report?.transferDetails && report.transferDetails.length > 0 ? (
            report.transferDetails.map((transfer, index) => {
              const progressPercentage = transfer.goalTarget > 0 ? Math.min(100, (transfer.goalCurrent / transfer.goalTarget) * 100) : 0;
              const formattedDate = new Date(transfer.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              const remainingAmount = Math.max(0, transfer.goalTarget - transfer.goalCurrent);
              const monthsToComplete = transfer.amountPaise > 0 ? Math.ceil(remainingAmount / transfer.amountPaise) : 0;
              
              let etaText = 'No estimate';
              if (remainingAmount === 0) {
                etaText = 'Completed';
              } else if (monthsToComplete > 0) {
                const etaDate = new Date();
                etaDate.setMonth(etaDate.getMonth() + monthsToComplete);
                etaText = `ETA: ${etaDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
              }

              let trendText = 'On Track';
              let trendColor = colors.textSecondary;
              if (transfer.goalDeadline) {
                const now = new Date();
                const deadline = new Date(transfer.goalDeadline);
                const monthsLeft = (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth());
                if (monthsLeft > 0) {
                  const requiredPerMonth = remainingAmount / monthsLeft;
                  if (transfer.amountPaise < requiredPerMonth) {
                    trendText = 'Behind';
                    trendColor = colors.textPrimary;
                  } else if (transfer.amountPaise > requiredPerMonth * 1.1) {
                    trendText = 'Ahead';
                    trendColor = colors.textPrimary;
                  }
                } else if (remainingAmount > 0) {
                  trendText = 'Behind (Past Due)';
                  trendColor = colors.danger;
                }
              }

              return (
                <Animated.View
                  key={transfer.id}
                  entering={FadeInDown.delay(180 + index * 20).springify()}
                  style={[styles.categoryCard, { borderBottomColor: colors.border, paddingBottom: 20 }]}
                >
                  <View style={styles.categoryRow}>
                    <View style={[styles.categoryIcon, { backgroundColor: isDark ? colors.chipBg : '#111111' }]}>
                      <TrendingUp size={20} color="#FFFFFF" strokeWidth={1.7} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {transfer.goalName}
                      </Text>
                      <Text style={[styles.categoryPercentage, { color: colors.textSecondary, marginBottom: 8 }]}>
                        Transferred {formattedDate}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontFamily: 'Satoshi-Bold', fontSize: 12, color: colors.textPrimary }}>
                          {progressPercentage.toFixed(0)}% Complete
                        </Text>
                        <Text style={{ fontFamily: 'Satoshi-Medium', fontSize: 12, color: colors.textSecondary }}>
                          {Money.format(remainingAmount, { zeroDecimals: true })} left
                        </Text>
                      </View>

                      <View style={[styles.progressBar, { backgroundColor: colors.chipBg, marginBottom: 12 }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progressPercentage}%`, backgroundColor: colors.textPrimary },
                          ]}
                        />
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Satoshi-Medium', fontSize: 12, color: colors.textSecondary }}>
                          {etaText}
                        </Text>
                        <Text style={{ fontFamily: 'Satoshi-Bold', fontSize: 12, color: trendColor }}>
                          {trendText}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.categoryAmountContainer, { alignSelf: 'flex-start' }]}>
                      <Text style={[styles.categoryAmount, { color: colors.textPrimary }]}>
                        +{Money.format(transfer.amountPaise, { zeroDecimals: true })}
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
                No savings activity yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Fund a goal to see your savings activity here
              </Text>
            </Animated.View>
          )
        ) : activeCategories.length > 0 ? (
          activeCategories.map((cat, index) => {
            const percentage = totalForTab > 0 ? (cat.amountPaise / totalForTab) * 100 : 0;
            const Icon = CATEGORY_ICONS[cat.categoryName.toLowerCase()] || MoreHorizontal;
            const accentColor = colors.textPrimary;

            return (
              <Animated.View
                key={cat.categoryName}
                entering={FadeInDown.delay(180 + index * 20).springify()}
              >
                <PressableScale
                  haptic="impactLight"
                  accessibilityRole="button"
                  accessibilityLabel={`See ${cat.categoryName} transactions`}
                  onPress={() => openCategory(cat.categoryName)}
                  style={[styles.categoryCard, { borderBottomColor: colors.border }]}
                >
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: isDark ? colors.chipBg : '#111111' }]}>
                    <Icon size={20} color="#FFFFFF" strokeWidth={1.7} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {cat.categoryName}
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
                      {Money.format(cat.amountPaise, { zeroDecimals: true })}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.textSecondary }]}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
                </PressableScale>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { fontSize: 28, lineHeight: 36, fontFamily: 'Satoshi-Black' },

  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  monthBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 18,
    fontFamily: 'Satoshi-Bold',
  },

  // Hero
  heroWrap: { marginBottom: 32 },
  heroLabel: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  heroBar: { marginTop: 16, gap: 8 },
  heroBarText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid, marginTop: 8 },
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
  inlineStatsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: onInk.hairline,
  },
  inlineStat: { flex: 1, gap: 2 },
  inlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inlineStatLabel: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  inlineStatValue: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold', color: onInk.high },

  // Section Header
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold' },

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
  
  budgetContainer: {},

  // Category Card
  categoryCard: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: {
    fontSize: 16,
    lineHeight: 24,
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
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Satoshi-Bold',
  },
  categoryPercentage: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Satoshi-Medium',
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
