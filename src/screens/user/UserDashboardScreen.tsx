/**
 * UserDashboardScreen — Spending Home
 * SpecTheme-driven rewrite: header + spending chart card + chits section
 * Floating capsule tab bar — extra bottom padding
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { SkiaSpendingChart } from '../../components/insights/SkiaSpendingChart';
import { ChevronRight } from 'lucide-react-native';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';
import { useSecureScreen } from '../../hooks/useSecureScreen';
import { useSpecTheme } from '../../theme/specTheme';
import type { Transaction } from '../../types/transaction';
import { PressableScale, CountUp, BlueRefreshControl } from '../../components/anim';
import { ChartIllustration } from '../../components/illustrations';
import { PastelCard } from '../../components/premium';
import { generateInsights, getBudgetStreak, getPrimaryGoal, type Insight, type Goal } from '../../services/insightsEngine';
import { SmartInsightCard } from '../../components/insights/SmartInsightCard';
import { StreakBanner } from '../../components/insights/StreakBanner';
import { GoalTrackerCard } from '../../components/insights/GoalTrackerCard';
import { NextSalaryWidget } from '../../components/income/NextSalaryWidget';
import { IncomeHealthWidget } from '../../components/income/IncomeHealthWidget';
import { IncomeInsightsWidget } from '../../components/income/IncomeInsightsWidget';
import { IncomeTransactionFlow } from '../../components/modals/IncomeTransactionFlow';
import { getDb } from '../../store/database';
import { TransactionDraft } from '../../types/transactionDraft';
import { IncomeDistribution } from '../../services/income/IncomeRoutingEngine';
import { IncomeEngine } from '../../services/income/IncomeEngine';
import { financialEventBus } from '../../services/EventBus';

const SCREEN_W = Dimensions.get('window').width;

// Guarded require, not a static import: CHITFUND_ENABLED is inlined as a
// literal at build time, so Metro drops this branch — and the whole
// src/modules/chitfund tree — from the lite bundle.
const DashboardChitsSection = process.env.CK_CHITFUND === '1'
  ? require('../../modules/chitfund/components/DashboardChitsSection').default
  : null;

/** Build weekly expense totals for the current month */
const buildWeeklyExpenses = (txs: Transaction[]) => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const weeks = [0, 0, 0, 0, 0];
  let hasData = false;

  txs.forEach((t) => {
    if (t.type !== 'expense') return;
    const d = new Date(t.date);
    if (d.getMonth() !== m || d.getFullYear() !== y) return;
    const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 4);
    weeks[weekIdx] += t.amountPaise;
    hasData = true;
  });

  return {
    hasData,
    labels: weeks.map((_, i) => `W${i + 1}`),
    values: weeks,
    monthTotal: weeks.reduce((sum, v) => sum + v, 0),
  };
};

export const UserDashboardScreen: React.FC<any> = ({ navigation }) => {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const { transactions, refreshTransactions } = useTransactions();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isIncomeFlowVisible, setIncomeFlowVisible] = useState(false);

  const handleIncomeSubmit = async (draft: TransactionDraft, distribution: IncomeDistribution[]) => {
    try {
      await IncomeEngine.processConfirmedIncome(draft);
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
    const [insightData, streak, primaryGoal] = await Promise.all([
      generateInsights(),
      getBudgetStreak(),
      getPrimaryGoal(),
    ]);
    setInsights(insightData);
    setStreakDays(streak);
    setGoal(primaryGoal);
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

  const weekly = useMemo(() => buildWeeklyExpenses(transactions), [transactions]);

  // chartConfig no longer needed with Skia

  const navigateToAdd = useCallback(() => {
    navigation.navigate('Add');
  }, [navigation]);

  const navigateToReports = useCallback(() => {
    navigation.navigate('Reports');
  }, [navigation]);

  const st = useMemo(() => makeStyles(colors, cardRadius, cardShadow), [colors, cardRadius, cardShadow]);

  // Feeds the shared scroll offset the tab bar reads to auto-hide.
  const { scrollY } = useTabBarScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View style={st.root}>
      <Animated.ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 }]}
        refreshControl={<BlueRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* ═══════════════════ HEADER ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={[st.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={st.title}>Overview</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PressableScale onPress={() => setIncomeFlowVisible(true)} style={{ backgroundColor: colors.success + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Bold', color: colors.success }}>+ Income</Text>
            </PressableScale>
            <PressableScale onPress={() => navigation.navigate('AskAi')} style={{ backgroundColor: colors.chipBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Bold', color: colors.textPrimary }}>Ask AI</Text>
            </PressableScale>
          </View>
        </Animated.View>

        {/* ═══════════════════ GAMIFICATION & INSIGHTS ═══════════════════ */}
        {streakDays > 0 && (
          <View style={{ marginBottom: 16 }}>
            <StreakBanner days={streakDays} message="Stayed under budget." />
          </View>
        )}

        {insights.map((insight, index) => (
          <SmartInsightCard key={insight.id} insight={insight} delay={20 + index * 20} />
        ))}

        {/* ═══════════════════ INCOME INTELLIGENCE ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <NextSalaryWidget />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}><IncomeHealthWidget /></View>
            <View style={{ flex: 1 }}><IncomeInsightsWidget /></View>
          </View>
        </Animated.View>
        
        {/* ═══════════════════ SPENDING CHART CARD ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={st.chartCard}>
          {weekly.hasData ? (
            <PressableScale onPress={navigateToReports} style={st.chartCardTouchable}>
              <View style={st.chartCardTopRow}>
                <Text style={st.viewReportLink}>View report</Text>
                <ChevronRight size={14} color={colors.lavenderDeep} strokeWidth={2.4} />
              </View>
              <View style={st.heroBlock}>
                <Text style={st.heroLabel}>Spent this month</Text>
                <CountUp value={weekly.monthTotal} prefix="₹" isPaise style={st.heroValue} />
              </View>
              <SkiaSpendingChart
                data={weekly.values}
                labels={weekly.labels}
                width={Math.max(SCREEN_W - 112, 260)}
                height={180}
                color={colors.lavenderDeep}
                textColor={colors.textSecondary}
                gridColor={colors.chipBg}
              />
            </PressableScale>
          ) : (
            <View style={st.emptyState}>
              <ChartIllustration size={120} />
              <Text style={st.emptyTitle}>No spending data</Text>
              <Text style={st.emptySubtitle}>Add your first expense to get started</Text>
              <PressableScale onPress={navigateToAdd} style={st.emptyCta}>
                <Text style={st.emptyCtaText}>Add Expense</Text>
              </PressableScale>
            </View>
          )}
        </Animated.View>

        {/* ═══════════════════ GOALS ═══════════════════ */}
        {goal && (
          <View style={{ marginBottom: 32 }}>
            <GoalTrackerCard name={goal.name} targetAmount={goal.targetAmount} currentAmount={goal.currentAmount} />
          </View>
        )}

        {/* ═══════════════════ CHITS (pro flavor only) ═══════════════════ */}
        {DashboardChitsSection ? (
          <DashboardChitsSection navigation={navigation} refreshToken={refreshToken} />
        ) : null}
      </Animated.ScrollView>

      <IncomeTransactionFlow
        visible={isIncomeFlowVisible}
        onClose={() => setIncomeFlowVisible(false)}
        onSubmit={handleIncomeSubmit}
      />
    </View>
  );
};


const makeStyles = (colors: any, cardRadius: number, cardShadow: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 24 },
    header: { marginBottom: 16 },
    title: { fontSize: 28, fontFamily: 'Satoshi-Black', color: colors.textPrimary },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 20,
      marginBottom: 32,
      ...cardShadow,
    },
    chart: { borderRadius: cardRadius, marginLeft: -12 },
    chartCardTouchable: { width: '100%' },
    chartCardTopRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 2,
      marginBottom: 4,
    },
    viewReportLink: { fontSize: 13, fontFamily: 'Satoshi-Bold', color: colors.lavenderDeep },
    heroBlock: { marginBottom: 8 },
    heroLabel: { fontSize: 13, fontFamily: 'Satoshi-Medium', color: colors.textSecondary },
    heroValue: { fontSize: 32, fontFamily: 'Satoshi-Black', color: colors.textPrimary, marginTop: 2 },
    emptyState: { alignItems: 'center', paddingVertical: 32 },
    emptyTitle: { fontSize: 15, fontFamily: 'Satoshi-Bold', color: colors.textPrimary, marginTop: 12 },
    emptySubtitle: { fontSize: 13, fontFamily: 'Satoshi-Regular', color: colors.textSecondary, marginTop: 4 },
    emptyCta: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: colors.primaryAccent,
    },
    emptyCtaText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.background },
    section: { marginBottom: 32 },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 17, fontFamily: 'Satoshi-Bold', color: colors.textPrimary },
    linkText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.lavenderDeep },
    moreLink: { alignItems: 'center', paddingVertical: 12 },
    moreLinkText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.lavenderDeep },
  });

export default UserDashboardScreen;
