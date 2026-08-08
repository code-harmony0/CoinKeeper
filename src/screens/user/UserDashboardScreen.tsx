/**
 * UserDashboardScreen — Home
 *
 * Structure: a persistent pulse header (the one number that answers "can I
 * spend today?") over three swipeable rooms — Spending, Goals, Income. The
 * rooms exist so each surface gets a full viewport instead of five cards
 * competing for attention in one undifferentiated scroll.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Plus, Target, Wallet } from 'lucide-react-native';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { MoneyMap } from '../../components/insights/MoneyMap';
import { PulseHeader } from '../../components/insights/PulseHeader';
import { RoomSwitcher } from '../../components/insights/RoomSwitcher';
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
import { GoalTrackerCard } from '../../components/insights/GoalTrackerCard';
import { NextSalaryWidget } from '../../components/income/NextSalaryWidget';
import { IncomeHealthWidget } from '../../components/income/IncomeHealthWidget';
import { IncomeInsightsWidget } from '../../components/income/IncomeInsightsWidget';
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

const ROOMS = ['Spending', 'Goals', 'Income'];

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

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
  const [room, setRoom] = useState(0);
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
    // The pulse header already states safe-to-spend-today, budget left, and
    // the no-income case. Rendering the engine's versions too put the exact
    // same ₹ figures on screen twice and undercut the header's authority.
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

  const goToRoom = useCallback((next: number) => {
    setRoom(Math.min(ROOMS.length - 1, Math.max(0, next)));
  }, []);

  // Horizontal-only pan so the vertical ScrollView keeps its gesture.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-12, 12])
        .onEnd(e => {
          if (e.translationX < -48) runOnJS(goToRoom)(room + 1);
          else if (e.translationX > 48) runOnJS(goToRoom)(room - 1);
        }),
    [room, goToRoom],
  );

  const monthPlan = snapshot
    ? {
        safeToSpend: snapshot.safeToSpend,
        monthlyRemaining: snapshot.monthlyRemaining,
        safeToSpendToday: snapshot.safeToSpendToday,
      }
    : null;

  const hasIncome = (snapshot?.income ?? 0) > 0;
  const hasGoalsRoomContent = rankedGoals.length > 0 || insights.length > 0;

  const renderRoom = () => {
    switch (room) {
      case 0:
        return (
          <Animated.View key="spending" entering={FadeIn.duration(180)} style={st.room}>
            <MoneyMap
              transactions={transactions}
              monthPlan={monthPlan}
              onOpenReports={navigateToReports}
            />
            {DashboardChitsSection ? (
              <DashboardChitsSection
                navigation={navigation}
                refreshToken={refreshToken}
              />
            ) : null}
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View key="goals" entering={FadeIn.duration(180)} style={st.room}>
            {hasGoalsRoomContent ? (
              <>
                {/* All ranked goals, not just #1 — showing one and leaving the
                    rest of the room empty hid work the user had already done. */}
                {rankedGoals.map(({ goal: g }) => (
                  <GoalTrackerCard
                    key={g.id}
                    name={g.name}
                    targetAmount={g.targetAmount}
                    currentAmount={g.currentAmount}
                  />
                ))}
                {insights.map((insight, index) => (
                  <SmartInsightCard
                    key={insight.id}
                    insight={insight}
                    delay={index * 20}
                  />
                ))}
              </>
            ) : (
              <EmptyRoom
                st={st}
                icon={<Target size={22} color={colors.textSecondary} strokeWidth={2} />}
                title="No goals yet"
                body="Set a savings goal and CoinKeeper will track your progress and flag what's drifting."
                ctaLabel="Set a goal"
                onPress={() => navigation.navigate('Goals')}
              />
            )}
          </Animated.View>
        );

      default:
        return (
          <Animated.View key="income" entering={FadeIn.duration(180)} style={st.room}>
            {hasIncome ? (
              <>
                <NextSalaryWidget />
                <IncomeHealthWidget />
                <IncomeInsightsWidget />
              </>
            ) : (
              <EmptyRoom
                st={st}
                icon={<Wallet size={22} color={colors.textSecondary} strokeWidth={2} />}
                title="No income recorded"
                body="Add your income and CoinKeeper works out your monthly plan, predicts your next payday, and scores how steady your earnings are."
                ctaLabel="Add income"
                onPress={() => setIncomeFlowVisible(true)}
              />
            )}
          </Animated.View>
        );
    }
  };

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
        {/* Greeting + quick actions */}
        <Animated.View entering={FadeInDown.springify()} style={st.topRow}>
          <Text style={st.greeting}>{greeting()}</Text>
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

        <PulseHeader
          safeToSpendToday={snapshot?.safeToSpendToday ?? 0}
          monthlyRemaining={snapshot?.monthlyRemaining ?? 0}
          safeToSpend={snapshot?.safeToSpend ?? 0}
          streakDays={streakDays}
        />

        <View style={st.switcher}>
          <RoomSwitcher rooms={ROOMS} activeIndex={room} onChange={goToRoom} />
        </View>

        <GestureDetector gesture={swipe}>
          <View>{renderRoom()}</View>
        </GestureDetector>
      </Animated.ScrollView>

      <IncomeTransactionFlow
        visible={isIncomeFlowVisible}
        onClose={() => setIncomeFlowVisible(false)}
        onSubmit={handleIncomeSubmit}
      />
    </View>
  );
};

const EmptyRoom: React.FC<{
  st: any;
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  onPress: () => void;
}> = ({ st, icon, title, body, ctaLabel, onPress }) => (
  <View style={st.empty}>
    <View style={st.emptyIcon}>{icon}</View>
    <Text style={st.emptyTitle}>{title}</Text>
    <Text style={st.emptyBody}>{body}</Text>
    <PressableScale
      onPress={onPress}
      style={st.emptyCta}
      accessibilityRole="button"
      accessibilityLabel={ctaLabel}
    >
      <Text style={st.emptyCtaText}>{ctaLabel}</Text>
    </PressableScale>
  </View>
);

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
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    greeting: {
      fontSize: 15,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
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
    switcher: { marginBottom: 24 },
    room: { gap: 16 },

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
