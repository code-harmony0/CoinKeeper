/**
 * UserDashboardScreen — Home
 *
 * One vertical scroll, one hero. The Money Map panel carries the PaceRing,
 * which owns the screen's single primary number (safe to spend today) and the
 * pacing verdict. Everything below it is a summary that opens one level
 * deeper on tap.
 *
 * Deliberately NOT a room switcher: forcing a Spending/Goals/Income choice
 * before the user sees anything adds a decision where the evidence says
 * removing decisions drives action.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, Alert, Dimensions, StatusBar } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ChevronUp } from 'lucide-react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { MoneyMap } from '../../components/insights/MoneyMap';
import { InsightPillRail } from '../../components/insights/InsightPillRail';
import { AddFundsSheet } from '../../components/modals/AddFundsSheet';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';
import { useSecureScreen } from '../../hooks/useSecureScreen';
import { useMonthLedger } from '../../hooks/useMonthLedger';
import { useIncomeHealth } from '../../hooks/useIncomeHealth';
import { brand, useSpecTheme } from '../../theme/specTheme';
import {
  PressableScale,
  BlueRefreshControl,
  BadgeCelebration,
} from '../../components/anim';
import { useBillStore } from '../../store/billStore';
import { useGoalStore } from '../../store/goalStore';
import {
  buildStatus,
  buildInsightPills,
  type PillTarget,
} from '../../services/homeNarrative';
import {
  headlineBadge,
  takeUncelebrated,
  type Badge,
  BADGE_LADDER,
  earnedBadges,
  nextBadgeProgress,
} from '../../services/badges';
import { computeAgeOfMoney } from '../../services/ageOfMoney';
import { buildWeeklyStory } from '../../services/weeklyStory';
import { WeeklyStoryCard } from '../../components/insights/WeeklyStoryCard';
import {
  generateInsights,
  getBudgetStreak,
  type Insight,
} from '../../services/insightsEngine';
import { FinancialIntelligenceEngine } from '../../services/FinancialIntelligenceEngine';
import { useGoalIntelligence } from '../../hooks/useGoalIntelligence';
import { SmartInsightCard } from '../../components/insights/SmartInsightCard';
import { IncomeSummaryRow } from '../../components/income/IncomeSummaryRow';
import { IncomeTransactionFlow } from '../../components/modals/IncomeTransactionFlow';
import { TransactionDraft } from '../../types/transactionDraft';
import { IncomeDistribution } from '../../services/income/IncomeRoutingEngine';
import { IncomeEngine } from '../../services/income/IncomeEngine';
import { financialEventBus } from '../../services/EventBus';
import { Money } from '../../utils/money';
import { EXPRESSIVE, STAGGER } from '../../theme/motion';
import { billsSummary, billStatus, upcomingBills } from '../../services/billSchedule';
import { HeroPace } from '../../components/home/HeroPace';
import { HeroTexture } from '../../components/home/HeroTexture';
import { HomeSection } from '../../components/home/HomeSection';
import { UpcomingList } from '../../components/home/UpcomingList';
import { GoalRings } from '../../components/home/GoalRings';
import { BadgeShelf } from '../../components/home/BadgeShelf';
import { StreakStrip, weekDots } from '../../components/home/StreakStrip';

// Guarded require, not a static import: CHITFUND_ENABLED is inlined as a
// literal at build time, so Metro drops this branch — and the whole
// src/modules/chitfund tree — from the lite bundle.
const DashboardChitsSection =
  process.env.CK_CHITFUND === '1'
    ? require('../../modules/chitfund/components/DashboardChitsSection').default
    : null;

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const CONTENT_W = Dimensions.get('window').width - 48 - 32;

/**
 * Arrival for anything below the hero.
 *
 * The hero owns the opening sequence; these cards are usually below the fold
 * when it plays, so tying them to a fixed delay would spend their entrance on
 * an empty viewport and leave them already-there when scrolled to. Reanimated's
 * `entering` fires on mount, and this list mounts as one — so the stagger is
 * carried here as a per-card index.
 */
const OnEnter: React.FC<{ index: number; children: React.ReactNode }> = ({
  index,
  children,
}) => (
  <Animated.View
    entering={FadeInDown.springify()
      .damping(18)
      .delay(index * STAGGER.normal)
      .reduceMotion(EXPRESSIVE)}
  >
    {children}
  </Animated.View>
);

type MonthSnapshot = {
  safeToSpend: number;
  safeToSpendToday: number;
  monthlyRemaining: number;
  income: number;
};

export const UserDashboardScreen: React.FC<any> = ({ navigation }) => {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { colors, cardRadius, cardShadow, chipRadius, iconShadow } =
    useSpecTheme();
  const { transactions, refreshTransactions } = useTransactions();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [isIncomeFlowVisible, setIncomeFlowVisible] = useState(false);
  const [snapshot, setSnapshot] = useState<MonthSnapshot | null>(null);
  const [celebrating, setCelebrating] = useState<Badge | null>(null);
  const [fundingGoalId, setFundingGoalId] = useState<string | null>(null);

  // Same ranking (rankGoalPriority) and the same goalStore-backed goal list
  // that GoalsScreen's Focus card uses — one source of truth for "which goal
  // is #1", so Dashboard and Goals can never disagree about it.
  const { rankedGoals, savingsBudgetRemainingPaise } = useGoalIntelligence();
  const { updateGoalProgress } = useGoalStore();
  const { bills, loadBills } = useBillStore();
  const incomeHealth = useIncomeHealth();
  // Cadence-aware: a half-yearly bill only counts here when it is actually
  // due this cycle, not every month.
  const unpaidBillsPaise = useMemo(() => billsSummary(bills).unpaidPaise, [bills]);

  // One pass over the ledger feeds the ring, the status line, the plan bar and
  // the pills, so none of them can disagree about the same month.
  const ledger = useMonthLedger(transactions);

  // Deliberately not scoped to the month like `ledger` is — the whole point of
  // this figure is that it spans however far back the ledger goes.
  const ageOfMoney = useMemo(
    () => computeAgeOfMoney(transactions),
    [transactions],
  );

  const weeklyStory = useMemo(
    () => buildWeeklyStory(transactions),
    [transactions],
  );

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleIncomeSubmit = async (
    draft: TransactionDraft,
    distribution: IncomeDistribution[],
  ) => {
    try {
      await IncomeEngine.processConfirmedIncome(draft, undefined, distribution);
      setIncomeFlowVisible(false);
      onRefresh();
    } catch (e) {
      // Previously this only console.error'd, so a failed insert looked to the
      // user exactly like a successful one — the sheet stayed open and nothing
      // was saved, with no explanation.
      console.error('[handleIncomeSubmit]', e);
      Alert.alert(
        'Could not save income',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  };

  const loadInsights = useCallback(async () => {
    const [insightData, streak, snap] = await Promise.all([
      generateInsights(),
      getBudgetStreak(),
      FinancialIntelligenceEngine.getCurrentSnapshot(),
    ]);
    // The hero ring already states safe-to-spend-today, budget left, and the
    // no-income case. Rendering the engine's versions too put the exact same ₹
    // figures on screen twice and undercut the hero's authority.
    setInsights(
      insightData.filter(i => i.id !== 'safe-spending' && i.id !== 'no-income'),
    );
    setStreakDays(streak);
    setSnapshot({
      safeToSpend: snap.safeToSpend,
      safeToSpendToday: snap.safeToSpendToday,
      monthlyRemaining: snap.monthlyRemaining,
      income: snap.income,
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshToken(t => t + 1);
    try {
      await Promise.all([refreshTransactions(), loadInsights()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshTransactions, loadInsights]);

  React.useEffect(() => {
    loadInsights();
    const unsubscribe = financialEventBus.subscribe(() => {
      loadInsights();
    });
    return unsubscribe;
  }, [loadInsights]);

  const navigateToReports = useCallback(() => {
    navigation.navigate('Reports');
  }, [navigation]);

  const st = useMemo(
    () => makeStyles(colors, cardRadius, cardShadow, chipRadius, iconShadow),
    [colors, cardRadius, cardShadow, chipRadius, iconShadow],
  );

  // Feeds the shared scroll offset the tab bar reads to auto-hide.
  const { scrollY } = useTabBarScroll();
  const listRef = useAnimatedRef<Animated.ScrollView>();
  const [barOn, setBarOn] = useState(false);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // The hero number collapses into a slim bar once it has scrolled away, so
  // the answer stays on screen; tapping the bar returns to the top.
  const BAR_AT = 230;
  useAnimatedReaction(
    () => scrollY.value > BAR_AT,
    (on, prev) => {
      if (on !== prev) runOnJS(setBarOn)(on);
    },
  );
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [BAR_AT - 40, BAR_AT + 20], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [BAR_AT - 40, BAR_AT + 20], [-16, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  // No hero parallax. It shipped briefly as `translateY: scrollY * 0.5` and
  // broke the screen: a transform does not affect layout, so sliding the hero
  // down pushed it *over* the cards below it, and the panel's `cardShadow`
  // elevation made it paint on top — the insight pills and the "Add a
  // category" button rendered underneath the panel.
  //
  // Parallax on a vertical list only works when the moving layer is behind
  // everything (a background image) or is given real layout room to move
  // through. Here the hero is a card in the flow, so the effect costs a
  // genuine layout bug and buys a drift nobody asked twice about.

  const monthPlan = snapshot
    ? {
        safeToSpend: snapshot.safeToSpend,
        monthlyRemaining: snapshot.monthlyRemaining,
        safeToSpendToday: snapshot.safeToSpendToday,
      }
    : null;

  const hasIncome = (snapshot?.income ?? 0) > 0;
  const goals = rankedGoals.map(({ goal }) => ({
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
  }));

  const planPaise = snapshot?.safeToSpend ?? 0;

  const status = useMemo(
    () =>
      buildStatus({
        spendPaise: ledger.spendPaise,
        planPaise,
        safeTodayPaise: snapshot?.safeToSpendToday ?? 0,
        todaySpendPaise: ledger.todaySpendPaise,
        bills,
      }),
    [ledger.spendPaise, ledger.todaySpendPaise, planPaise, snapshot, bills],
  );

  const pills = useMemo(
    () =>
      buildInsightPills({
        weekByCategory: ledger.weekByCategory,
        bills,
        spendPaise: ledger.spendPaise,
        priorSpendSameSpanPaise: ledger.priorSpendSameSpanPaise,
      }),
    [ledger, bills],
  );

  // The celebration check keys off these three numbers, not off the goal
  // objects — a new array identity on an unrelated render must not re-run it.
  const goalSavedPaise = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const bestGoalProgress = goals.reduce(
    (best, g) =>
      g.targetAmount > 0 ? Math.max(best, g.currentAmount / g.targetAmount) : best,
    0,
  );

  const badgeContext = useMemo(
    () => ({ streakDays, goalSavedPaise, bestGoalProgress }),
    [streakDays, goalSavedPaise, bestGoalProgress],
  );

  const shelf = useMemo(() => {
    const got = new Set(earnedBadges(badgeContext).map(b => b.id));
    return {
      badges: BADGE_LADDER.map(badge => ({ badge, earned: got.has(badge.id) })),
      next: nextBadgeProgress(badgeContext),
      count: got.size,
    };
  }, [badgeContext]);

  // Fires once per badge, ever — takeUncelebrated marks what it hands back.
  useEffect(() => {
    let cancelled = false;
    takeUncelebrated(badgeContext).then(fresh => {
      if (!cancelled && fresh.length > 0) setCelebrating(fresh[0]);
    });
    return () => {
      cancelled = true;
    };
  }, [badgeContext]);

  const fundingGoal = rankedGoals.find(r => r.goal.id === fundingGoalId);


  const handleAddFunds = async (amountStr: string) => {
    if (!fundingGoalId) return;
    const paise = Money.toPaise(amountStr);
    if (paise <= 0) {
      Alert.alert('Enter an amount', 'Add an amount greater than zero.');
      return;
    }
    try {
      await updateGoalProgress(fundingGoalId, paise);
      setFundingGoalId(null);
    } catch (e) {
      console.error('[handleAddFunds]', e);
      Alert.alert(
        'Could not add money',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  };

  // Home is a tab screen, so 'Transactions' resolves as a sibling tab and the
  // root-stack routes bubble up from here.
  const PILL_ROUTES: Record<PillTarget, string> = {
    bills: 'Bills',
    reports: 'Reports',
    transactions: 'Transactions',
  };
  // Bills already have their own section right above, so that pill is dropped.
  const extraPills = pills.filter(p => p.target !== 'bills');
  const billAlert = useMemo(() => {
    const now = new Date();
    const open = bills.filter(b => billStatus(b, now) !== 'paid');
    const overdue = open.filter(b => billStatus(b, now) === 'overdue').length;
    const today = upcomingBills(open.filter(b => billStatus(b, now) !== 'overdue'), now, 0).filter(
      b => b.daysAway === 0,
    ).length;
    return { overdue, today };
  }, [bills]);
  const openPillTarget = (target: PillTarget) =>
    navigation.navigate(PILL_ROUTES[target]);

  return (
    <View style={st.root}>
      {/* The hero band is black, so the status bar reads light while Home is
          showing, over a solid black strip that content scrolls beneath. */}
      {focused && <StatusBar barStyle="light-content" />}
      <View
        pointerEvents="none"
        style={[st.statusStrip, { height: insets.top }]}
      />
      <Animated.View
        pointerEvents={barOn ? 'auto' : 'none'}
        style={[st.pulseBar, { top: insets.top }, barStyle]}
      >
        <PressableScale
          onPress={() => listRef.current?.scrollTo({ y: 0, animated: true })}
          accessibilityRole="button"
          accessibilityLabel={`Safe to spend today ${Money.format(monthPlan?.safeToSpendToday ?? 0, { zeroDecimals: true })}. Scroll to top`}
          style={st.pulseInner}
        >
          <Text style={st.pulseNumber}>
            {Money.format(monthPlan?.safeToSpendToday ?? 0, { zeroDecimals: true })}
          </Text>
          <Text style={st.pulseLabel}>safe to spend today</Text>
          <ChevronUp size={18} color="rgba(255,255,255,0.7)" strokeWidth={1.75} />
        </PressableScale>
      </Animated.View>
      <Animated.ScrollView
        ref={listRef}
        style={st.scroll}
        contentContainerStyle={[
          st.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 },
        ]}
        refreshControl={
          <BlueRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={[st.stage, { marginTop: -(insets.top + 16), paddingTop: insets.top + 16 }]}>
          <HeroTexture />
        <Animated.View entering={FadeInDown.springify()} style={st.topRow}>
          <Text style={st.greeting}>{greeting()}</Text>
          <View style={st.actions}>
            <PressableScale
              onPress={() => navigation.navigate('AskAi')}
              style={st.askPill}
              accessibilityRole="button"
              accessibilityLabel="Ask AI about your money"
            >
              <Sparkles size={18} color="#FFFFFF" strokeWidth={1.75} />
              <Text style={st.askText}>Ask AI</Text>
            </PressableScale>
          </View>
        </Animated.View>

          <HeroPace
            ledger={ledger}
            safeTodayPaise={monthPlan?.safeToSpendToday ?? 0}
            planPaise={planPaise}
            monthlyRemainingPaise={monthPlan?.monthlyRemaining ?? 0}
            unpaidBillsPaise={unpaidBillsPaise}
            streakDays={streakDays}
            nextGoal={shelf.next ? { label: shelf.next.label, hint: shelf.next.hint } : null}
            status={status}
            alert={billAlert}
            onAlertPress={() => navigation.navigate('Bills')}
            needsIncome={snapshot !== null && !hasIncome}
            onAddIncome={() => setIncomeFlowVisible(true)}
            replayToken={refreshToken}
          />
        </View>

        <View style={st.stack}>
          <OnEnter index={1}>
            <HomeSection title="Upcoming" onPress={() => navigation.navigate('Bills')}>
              <UpcomingList bills={bills} onPress={() => navigation.navigate('Bills')} />
            </HomeSection>
          </OnEnter>
          <OnEnter index={2}>
            <HomeSection title="Goals" onPress={() => navigation.navigate('Goals')}>
              <GoalRings
                goals={goals}
                onAddMoney={setFundingGoalId}
                onNewGoal={() => navigation.navigate('Goals')}
              />
            </HomeSection>
          </OnEnter>
          <OnEnter index={2}>
            <HomeSection title={`Rewards · ${shelf.count} of ${shelf.badges.length} badges`}>
              <View style={st.rewards}>
                <StreakStrip
                  streakDays={streakDays}
                  days={weekDots(streakDays)}
                  next={shelf.next ? { label: shelf.next.label, hint: shelf.next.hint } : null}
                />
                <BadgeShelf badges={shelf.badges} next={shelf.next} />
              </View>
            </HomeSection>
          </OnEnter>

          <OnEnter index={0}>
            <HomeSection title="This month" onPress={navigateToReports}>
              <View style={st.inOut}>
                <View style={st.inOutCol}>
                  <Text style={st.inOutLabel}>Money in</Text>
                  <View style={st.inOutValue}>
                    <ArrowUpRight size={18} color={colors.mintDeep} strokeWidth={1.75} />
                    <Text style={st.inOutText}>
                      {Money.format(snapshot?.income ?? 0, { zeroDecimals: true })}
                    </Text>
                  </View>
                </View>
                <View style={st.inOutCol}>
                  <Text style={st.inOutLabel}>Money spent</Text>
                  <View style={st.inOutValue}>
                    <ArrowDownRight size={18} color={colors.peachDeep} strokeWidth={1.75} />
                    <Text style={st.inOutText}>
                      {Money.format(ledger.spendPaise, { zeroDecimals: true })}
                    </Text>
                  </View>
                </View>
              </View>
            </HomeSection>
          </OnEnter>
          {(extraPills.length > 0 || insights.length > 0) && (
            <OnEnter index={4}>
              <HomeSection title="Insights">
                <View style={st.insightStack}>
                  {extraPills.length > 0 && <InsightPillRail pills={extraPills} onPress={openPillTarget} />}
                  <WeeklyStoryCard story={weeklyStory} onOpenReports={navigateToReports} />
                  {insights.map((insight, index) => (
                    <SmartInsightCard key={insight.id} insight={insight} delay={index * 20} />
                  ))}
                </View>
              </HomeSection>
            </OnEnter>
          )}

          <OnEnter index={3}>
            <HomeSection title="Income steadiness" onPress={() => navigation.navigate('IncomeDetail')}>
              <IncomeSummaryRow
                hasIncome={hasIncome}
                onOpenDetail={() => navigation.navigate('IncomeDetail')}
                onAddIncome={() => setIncomeFlowVisible(true)}
              />
            </HomeSection>
          </OnEnter>
          <OnEnter index={5}>
            <HomeSection title="Where it went" onPress={navigateToReports}>
              {ledger.byCategory.length === 0 ? (
                <Text style={st.emptyLine}>
                  Nothing spent this month yet. Your spending map appears as you add expenses.
                </Text>
              ) : (
                <MoneyMap
                  mapOnly
                  ledger={ledger}
                  incomePaise={snapshot?.income ?? 0}
                  monthPlan={monthPlan}
                  onOpenReports={navigateToReports}
                  onAddCategory={() => navigation.navigate('Categories')}
                  streakDays={streakDays}
                  badge={null}
                  ageOfMoney={null}
                  status={status}
                  replayToken={refreshToken}
                  unpaidBillsPaise={unpaidBillsPaise}
                />
              )}
            </HomeSection>
          </OnEnter>

          {DashboardChitsSection ? (
            <DashboardChitsSection
              navigation={navigation}
              refreshToken={refreshToken}
            />
          ) : null}
        </View>
      </Animated.ScrollView>

      <IncomeTransactionFlow
        visible={isIncomeFlowVisible}
        onClose={() => setIncomeFlowVisible(false)}
        onSubmit={handleIncomeSubmit}
      />

      {/* Adding to a goal from home opens the same sheet the Goals screen
          uses, rather than a second, simpler one that would drift from it. */}
      <AddFundsSheet
        visible={fundingGoalId !== null}
        goalName={fundingGoal?.goal.name}
        goal={fundingGoal?.goal}
        health={fundingGoal?.health}
        savingsBudgetRemainingPaise={savingsBudgetRemainingPaise}
        onClose={() => setFundingGoalId(null)}
        onSubmit={handleAddFunds}
      />

      <BadgeCelebration
        badge={celebrating}
        onDismiss={() => setCelebrating(null)}
      />
    </View>
  );
};

const makeStyles = (
  colors: any,
  cardRadius: number,
  cardShadow: any,
  chipRadius: number,
  iconShadow: any,
) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 24 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    greeting: {
      fontSize: 28,
      lineHeight: 36,
      fontFamily: 'Satoshi-Black',
      color: '#FFFFFF',
      letterSpacing: -0.4,
    },
    actions: { flexDirection: 'row', gap: 8 },
    askPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    askText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold', color: '#FFFFFF' },
    iconBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inOut: { flexDirection: 'row', gap: 24, paddingBottom: 8 },
    inOutCol: { flex: 1 },
    inOutLabel: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },
    inOutValue: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    inOutText: {
      fontSize: 20,
      lineHeight: 28,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
    },
    emptyLine: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
      paddingBottom: 8,
    },
    rewards: { gap: 16, paddingBottom: 8 },
    insightStack: { gap: 16, paddingBottom: 8 },
    // The black top band runs edge to edge under the status bar: it holds only
    // the greeting and the answer, then the light page takes over.
    statusStrip: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: brand.ink,
    },
    pulseBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 9,
      height: 56,
      backgroundColor: brand.ink,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    pulseInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
    },
    pulseNumber: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Black', color: brand.signal },
    pulseLabel: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Satoshi-Medium',
      color: 'rgba(255,255,255,0.72)',
    },
    stage: {
      backgroundColor: brand.ink,
      marginHorizontal: -24,
      paddingHorizontal: 24,
      paddingBottom: 24,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      marginBottom: 24,
      overflow: 'hidden',
    },
    stack: { gap: 24, paddingBottom: 24 },
    sheetStack: { gap: 16, paddingBottom: 8 },

    empty: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 24,
      alignItems: 'center',
      ...cardShadow,
    },
    emptyIcon: {
      width: 44,
      height: 44,
      borderRadius: 24,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: 14,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    emptyCta: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: chipRadius,
      backgroundColor: colors.primaryAccent,
    },
    emptyCtaText: {
      fontSize: 14,
      fontFamily: 'Satoshi-Bold',
      color: colors.onAccent,
    },
  });

export default UserDashboardScreen;
