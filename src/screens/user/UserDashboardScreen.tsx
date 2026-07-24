/**
 * UserDashboardScreen — Spending Home
 * SpecTheme-driven rewrite: header + spending chart card + chits section
 * Floating capsule tab bar — extra bottom padding
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { ChevronRight } from 'lucide-react-native';
import { useTransactions } from '../../hooks/useTransactions';
import { useChitFunds } from '../../hooks/useChitFunds';
import { useSpecTheme } from '../../theme/specTheme';
import type { ChitGroup } from '../../types/chitFund';
import type { Transaction } from '../../types/transaction';
import { PressableScale, CountUp, BlueRefreshControl } from '../../components/anim';
import { ChartIllustration } from '../../components/illustrations';
import { PastelCard } from '../../components/premium';
import { generateInsights, getBudgetStreak, getPrimaryGoal, type Insight, type Goal } from '../../services/insightsEngine';
import { SmartInsightCard } from '../../components/insights/SmartInsightCard';
import { StreakBanner } from '../../components/insights/StreakBanner';
import { GoalTrackerCard } from '../../components/insights/GoalTrackerCard';

const SCREEN_W = Dimensions.get('window').width;
const CHIT_TINTS = ['lavender', 'mint', 'peach'] as const;

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
    weeks[weekIdx] += t.amount;
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
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const { transactions, refreshTransactions } = useTransactions();
  const { groups, refreshGroups } = useChitFunds();

  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);

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
    try {
      await Promise.all([refreshTransactions(), refreshGroups(), loadInsights()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshGroups, refreshTransactions, loadInsights]);

  React.useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const weekly = useMemo(() => buildWeeklyExpenses(transactions), [transactions]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.card,
      backgroundGradientFrom: colors.card,
      backgroundGradientTo: colors.card,
      decimalPlaces: 0,
      color: () => colors.lavenderDeep,
      labelColor: () => colors.textSecondary,
      strokeWidth: 3,
      fillShadowGradientFrom: colors.lavenderDeep,
      fillShadowGradientFromOpacity: 0.12,
      fillShadowGradientTo: colors.lavenderDeep,
      fillShadowGradientToOpacity: 0.01,
      propsForBackgroundLines: { stroke: colors.chipBg, strokeWidth: 0.5 },
      propsForDots: { r: '3', strokeWidth: '2', stroke: colors.lavenderDeep, fill: colors.card },
      propsForLabels: { fontSize: 11 },
    }),
    [colors],
  );

  const activeChitCount = groups.length;
  const visibleGroups = groups.slice(0, 2);
  const extraGroupCount = Math.max(groups.length - 2, 0);

  const navigateToGroups = useCallback(() => {
    navigation.navigate('Groups');
  }, [navigation]);

  const navigateToAdd = useCallback(() => {
    navigation.navigate('Add');
  }, [navigation]);

  const navigateToReports = useCallback(() => {
    navigation.navigate('Reports');
  }, [navigation]);

  const st = useMemo(() => makeStyles(colors, cardRadius, cardShadow), [colors, cardRadius, cardShadow]);

  return (
    <View style={st.root}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 }]}
        refreshControl={<BlueRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════ HEADER ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={[st.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={st.title}>Overview</Text>
          <PressableScale onPress={() => navigation.navigate('AskAi')} style={{ backgroundColor: colors.lavender, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Bold', color: colors.lavenderDeep }}>Ask AI</Text>
          </PressableScale>
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
                <CountUp value={weekly.monthTotal} prefix="₹" style={st.heroValue} />
              </View>
              <LineChart
                data={{
                  labels: weekly.labels,
                  datasets: [{ data: weekly.values }],
                }}
                width={Math.max(SCREEN_W - 112, 260)}
                height={180}
                chartConfig={chartConfig}
                bezier
                withInnerLines={false}
                withOuterLines={false}
                style={st.chart}
                formatYLabel={(v) => `${Math.round(Number(v) / 1000)}k`}
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
          <View style={{ marginBottom: 24 }}>
            <GoalTrackerCard name={goal.name} targetAmount={goal.targetAmount} currentAmount={goal.currentAmount} />
          </View>
        )}

        {/* ═══════════════════ CHITS ═══════════════════ */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>Chits ({activeChitCount} active)</Text>
            <PressableScale onPress={navigateToGroups}>
              <Text style={st.linkText}>View All</Text>
            </PressableScale>
          </View>

          {visibleGroups.map((group, i) => (
            <ChitCard
              key={group.id}
              group={group}
              delay={80 + i * 40}
              tint={CHIT_TINTS[i % 3]}
              colors={colors}
              onPress={() => navigation.navigate('ChitDetail', { groupId: group.id })}
            />
          ))}

          {extraGroupCount > 0 && (
            <PressableScale onPress={navigateToGroups} style={st.moreLink}>
              <Text style={st.moreLinkText}>+{extraGroupCount} more groups</Text>
            </PressableScale>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

/* ── Chit Card ── */
const ChitCard: React.FC<{
  group: ChitGroup;
  delay: number;
  tint: (typeof CHIT_TINTS)[number];
  colors: any;
  onPress: () => void;
}> = ({ group, delay, tint, colors, onPress }) => {
  const progress = group.totalCycles > 0 ? Math.min(group.currentCycle / group.totalCycles, 1) : 0;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.chitCardWrap}>
      {/* Plain View boundary so PressableScale's internal transform-animated
          node is not the direct child of this entering-animated wrapper —
          avoids the "transform may be overwritten by a layout animation" warning. */}
      <View>
        <PastelCard
          tint={tint}
          eyebrow={group.name}
          value={`₹${group.amount.toLocaleString('en-IN')}/mo`}
          caption={`${group.currentCycle}/${group.totalCycles} cycles`}
          progress={progress}
          onPress={onPress}
        >
          <View style={styles.chitStatusRow}>
            <View style={[styles.chitBadge, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
              <Text style={[styles.chitBadgeText, { color: colors[`${tint}Deep`] }]}>On track</Text>
            </View>
          </View>
        </PastelCard>
      </View>
    </Animated.View>
  );
};

/* ── Styles ── */
const styles = {
  chitCardWrap: { marginBottom: 24, marginTop: 8 },
  chitStatusRow: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const },
  chitBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chitBadgeText: { fontSize: 11, fontFamily: 'Satoshi-Bold' },
};

const makeStyles = (colors: any, cardRadius: number, cardShadow: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20 },
    header: { marginBottom: 16 },
    title: { fontSize: 26, fontFamily: 'Satoshi-Black', color: colors.textPrimary },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 20,
      marginBottom: 24,
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
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.primaryAccent,
    },
    emptyCtaText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.background },
    section: { marginBottom: 24 },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 17, fontFamily: 'Satoshi-Bold', color: colors.textPrimary },
    linkText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.lavenderDeep },
    moreLink: { alignItems: 'center', paddingVertical: 10 },
    moreLinkText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.lavenderDeep },
  });

export default UserDashboardScreen;
