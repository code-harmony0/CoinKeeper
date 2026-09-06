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
import { View, StyleSheet, Text, Alert, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Plus, Target } from 'lucide-react-native';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { MoneyMap } from '../../components/insights/MoneyMap';
import { GoalsStrip } from '../../components/insights/GoalsStrip';
import { InsightPillRail } from '../../components/insights/InsightPillRail';
import { IncomeHealthCard } from '../../components/income/IncomeHealthCard';
import { AddFundsSheet } from '../../components/modals/AddFundsSheet';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';
import { useSecureScreen } from '../../hooks/useSecureScreen';
import { useMonthLedger } from '../../hooks/useMonthLedger';
import { useIncomeHealth } from '../../hooks/useIncomeHealth';
import { useSpecTheme } from '../../theme/specTheme';
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
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

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
  const openPillTarget = (target: PillTarget) =>
    navigation.navigate(PILL_ROUTES[target]);

  return (
    <View style={st.root}>
      <Animated.ScrollView
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
        {/* Greeting + streak + quick actions */}
        <Animated.View entering={FadeInDown.springify()} style={st.topRow}>
          <View style={st.greetCol}>
            <Text style={st.greeting}>{greeting()}</Text>
            <Text style={st.subGreeting}>Here’s where the month stands</Text>
          </View>
          <View style={st.actions}>
            <PressableScale
              onPress={() => setIncomeFlowVisible(true)}
              style={st.actionPill}
              accessibilityRole="button"
              accessibilityLabel="Add income"
            >
              <Plus size={14} color={colors.textPrimary} strokeWidth={2.5} />
              <Text style={st.actionText}>Income</Text>
            </PressableScale>
            <PressableScale
              onPress={() => navigation.navigate('AskAi')}
              style={st.actionPill}
              accessibilityRole="button"
              accessibilityLabel="Ask AI about your money"
            >
              <Sparkles size={14} color={colors.textPrimary} strokeWidth={2.5} />
              <Text style={st.actionText}>Ask AI</Text>
            </PressableScale>
          </View>
        </Animated.View>

        <View style={st.stack}>
          {/* Hero — the gauge, the story, and the month's spending map */}
          <MoneyMap
            ledger={ledger}
            incomePaise={snapshot?.income ?? 0}
            monthPlan={monthPlan}
            onOpenReports={navigateToReports}
            onAddCategory={() => navigation.navigate('Categories')}
            streakDays={streakDays}
            badge={headlineBadge(badgeContext)}
            ageOfMoney={ageOfMoney}
            status={status}
            replayToken={refreshToken}
          />

          <OnEnter index={0}>
            <InsightPillRail pills={pills} onPress={openPillTarget} />
          </OnEnter>

          {goals.length > 0 ? (
            <OnEnter index={1}>
              <GoalsStrip
                goals={goals}
                onPress={() => navigation.navigate('Goals')}
                onAddMoney={setFundingGoalId}
              />
            </OnEnter>
          ) : (
            <View style={st.empty}>
              <View style={st.emptyIcon}>
                <Target
                  size={22}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
              </View>
              <Text style={st.emptyTitle}>No goals yet</Text>
              <Text style={st.emptyBody}>
                Set a savings goal and CoinKeeper will track your progress and
                flag what's drifting.
              </Text>
              <PressableScale
                onPress={() => navigation.navigate('Goals')}
                style={st.emptyCta}
                accessibilityRole="button"
                accessibilityLabel="Set a goal"
              >
                <Text style={st.emptyCtaText}>Set a goal</Text>
              </PressableScale>
            </View>
          )}

          <OnEnter index={2}>
            <WeeklyStoryCard
              story={weeklyStory}
              onOpenReports={navigateToReports}
            />
          </OnEnter>

          {insights.map((insight, index) => (
            <SmartInsightCard
              key={insight.id}
              insight={insight}
              delay={index * 20}
            />
          ))}

          {/* The Income Health card owns income on this screen. An
              `IncomeSummaryRow` used to sit directly beneath it restating the
              same score with the same chevron to the same destination — one
              fact, two cards, so the second was deleted. Its only unique job,
              prompting for a first income, is covered below. */}
          <OnEnter index={3}>
            <IncomeHealthCard
              health={incomeHealth}
              contentWidth={CONTENT_W}
              onOpenDetail={() => navigation.navigate('IncomeDetail')}
            />
          </OnEnter>

          {!hasIncome && (
            <IncomeSummaryRow
              hasIncome={false}
              onOpenDetail={() => navigation.navigate('IncomeDetail')}
              onAddIncome={() => setIncomeFlowVisible(true)}
            />
          )}

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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    greetCol: { flex: 1, gap: 6 },
    greeting: {
      fontSize: 20,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    subGreeting: {
      fontSize: 13,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
    },
    actions: { flexDirection: 'row', gap: 8 },
    // Raised pills, not flat chips: these are the only two actions in the
    // header and they were previously indistinguishable from the canvas.
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: chipRadius,
      ...iconShadow,
    },
    actionText: {
      fontSize: 13,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    stack: { gap: 16, paddingBottom: 24 },

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
      borderRadius: 22,
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
      color: '#FFFFFF',
    },
  });

export default UserDashboardScreen;
