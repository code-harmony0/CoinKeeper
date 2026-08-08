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
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Plus, Target, Flame } from 'lucide-react-native';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { MoneyMap } from '../../components/insights/MoneyMap';
import { GoalsStrip } from '../../components/insights/GoalsStrip';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';
import { useSecureScreen } from '../../hooks/useSecureScreen';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale, BlueRefreshControl } from '../../components/anim';
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

/**
 * Past a month, an escalating daily counter stops reading as an achievement
 * and starts reading as something fragile the user can destroy. Switching to
 * months slows the tick and reframes it as a durable record.
 */
const streakLabel = (days: number): string =>
  days >= 30
    ? `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} under budget`
    : `${days}d under budget`;

type MonthSnapshot = {
  safeToSpend: number;
  safeToSpendToday: number;
  monthlyRemaining: number;
  income: number;
};

export const UserDashboardScreen: React.FC<any> = ({ navigation }) => {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow, chipRadius } = useSpecTheme();
  const { transactions, refreshTransactions } = useTransactions();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [isIncomeFlowVisible, setIncomeFlowVisible] = useState(false);
  const [snapshot, setSnapshot] = useState<MonthSnapshot | null>(null);

  // Same ranking (rankGoalPriority) and the same goalStore-backed goal list
  // that GoalsScreen's Focus card uses — one source of truth for "which goal
  // is #1", so Dashboard and Goals can never disagree about it.
  const { rankedGoals } = useGoalIntelligence();

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
    () => makeStyles(colors, cardRadius, cardShadow, chipRadius),
    [colors, cardRadius, cardShadow, chipRadius],
  );

  // Feeds the shared scroll offset the tab bar reads to auto-hide.
  const { scrollY } = useTabBarScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

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
            {streakDays > 0 && (
              <View style={st.streak}>
                <Flame size={13} color={colors.peachDeep} strokeWidth={2.5} />
                <Text style={st.streakText}>{streakLabel(streakDays)}</Text>
              </View>
            )}
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
          {/* Hero — carries the PaceRing and the month's spending story */}
          <MoneyMap
            transactions={transactions}
            monthPlan={monthPlan}
            onOpenReports={navigateToReports}
          />

          {goals.length > 0 ? (
            <GoalsStrip
              goals={goals}
              onPress={() => navigation.navigate('Goals')}
            />
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

          {insights.map((insight, index) => (
            <SmartInsightCard
              key={insight.id}
              insight={insight}
              delay={index * 20}
            />
          ))}

          <IncomeSummaryRow
            hasIncome={hasIncome}
            onOpenDetail={() => navigation.navigate('IncomeDetail')}
            onAddIncome={() => setIncomeFlowVisible(true)}
          />

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
    </View>
  );
};

const makeStyles = (
  colors: any,
  cardRadius: number,
  cardShadow: any,
  chipRadius: number,
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
      fontSize: 15,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    streak: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: colors.peach,
      borderRadius: chipRadius,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    streakText: {
      fontSize: 12,
      fontFamily: 'Satoshi-Bold',
      color: colors.peachDeep,
    },
    actions: { flexDirection: 'row', gap: 8 },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.chipBg,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: chipRadius,
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
