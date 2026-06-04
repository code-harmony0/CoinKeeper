/**
 * UserDashboardScreen — Premium Fintech Home
 * 390pt base · 8pt grid · Max 3 elevated surfaces
 * Floating capsule tab bar — extra bottom padding
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Briefcase,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  Film,
  Flame,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  TrendingUp,
  User,
  Users,
  UtensilsCrossed,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTransactions } from '../../hooks/useTransactions';
import { useChitFunds } from '../../hooks/useChitFunds';
import USER_FINTECH_THEME from '../../theme/userFintechTheme';
import type { ChitGroup } from '../../types/chitFund';
import type { Transaction } from '../../types/transaction';

/* ── Theme aliases ── */
const T = USER_FINTECH_THEME;
const C = T.colors;
const SCREEN_W = Dimensions.get('window').width;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BREAKDOWN_COLORS = [C.chartBlue, C.chartGreen, C.chartAmber, C.chartPurple];

type IconComp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const CATEGORY_ICONS: Record<string, { icon: IconComp; tint: string }> = {
  Food: { icon: UtensilsCrossed, tint: '#FEF3C7' },
  Transport: { icon: Car, tint: '#DBEAFE' },
  Shopping: { icon: ShoppingBag, tint: '#EDE9FE' },
  Entertainment: { icon: Film, tint: '#FFE4E6' },
  Bills: { icon: FileText, tint: '#FFE4E6' },
  Health: { icon: HeartPulse, tint: '#DCFCE7' },
  Education: { icon: GraduationCap, tint: '#E0F2FE' },
  Salary: { icon: BadgeDollarSign, tint: C.positiveSoft },
  Freelance: { icon: Briefcase, tint: '#DBEAFE' },
  Investment: { icon: TrendingUp, tint: '#EDE9FE' },
};

const getCatIcon = (cat: string) =>
  CATEGORY_ICONS[cat] || { icon: CircleHelp, tint: C.surfaceSubtle };

/* ── Helpers ── */
const getMonthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const getMonthShort = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short' });
const fmt = (v: number) => `\u20B9${Math.abs(v).toLocaleString('en-IN')}`;

const getDaysDiff = (due?: string): number | null => {
  if (!due) return null;
  const d = new Date(due);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

const buildMonthlyTrend = (txs: Transaction[], sel: Date) => {
  const pts: { x: string; y: number }[] = [];
  for (let off = 5; off >= 0; off--) {
    const d = new Date(sel.getFullYear(), sel.getMonth() - off, 1);
    const total = txs
      .filter((t) => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() && t.type === 'expense';
      })
      .reduce((s, t) => s + t.amount, 0);
    pts.push({ x: getMonthShort(d), y: total });
  }
  return pts;
};

/* ── Component ── */
export const UserDashboardScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions, refreshTransactions } = useTransactions();
  const { groups, refreshGroups } = useChitFunds();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthNav, setShowMonthNav] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chartTooltip, setChartTooltip] = useState<{ x: number; y: number; value: number } | null>(null);

  /* Monthly calculations */
  const monthly = useMemo(() => {
    const m = selectedDate.getMonth();
    const y = selectedDate.getFullYear();
    const cur = transactions.filter((t) => {
      const td = new Date(t.date);
      return td.getMonth() === m && td.getFullYear() === y;
    });
    const income = cur.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = cur.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const remaining = income - expenses;
    const budgetPct = income > 0 ? Math.min(Math.round((expenses / income) * 100), 100) : 0;

    const catMap: Record<string, number> = {};
    cur.filter((t) => t.type === 'expense').forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const topCats = Object.entries(catMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
      }));

    return { income, expenses, remaining, budgetPct, topCats, txCount: cur.length };
  }, [transactions, selectedDate]);

  /* Insights — two-line format with navigation routes */
  const insights = useMemo(() => {
    const items: { key: string; icon: IconComp; title: string; detail: string; tint: string; route: string }[] = [];

    const urgent = groups
      .map((g) => ({ g, d: getDaysDiff(g.nextDrawDate) }))
      .filter((x) => x.d !== null && x.d <= 3)
      .sort((a, b) => (a.d as number) - (b.d as number))[0];

    if (urgent && urgent.d !== null) {
      items.push({
        key: 'chit',
        icon: AlertTriangle,
        title: urgent.g.name,
        detail: urgent.d < 0 ? 'Payment overdue' : 'Due soon',
        tint: C.warningSoft,
        route: 'Groups',
      });
    }

    const top = monthly.topCats[0];
    if (top) {
      items.push({
        key: 'spend',
        icon: Flame,
        title: 'Top spending',
        detail: `${top.name} \u00B7 ${top.pct}% of total`,
        tint: C.negativeSoft,
        route: 'Reports',
      });
    }

    if (items.length < 2) {
      items.push({
        key: 'pace',
        icon: TrendingUp,
        title: monthly.budgetPct > 80 ? 'Spending high' : 'On track',
        detail: monthly.budgetPct > 80
          ? `${monthly.budgetPct}% of income spent`
          : `${monthly.txCount} transactions this month`,
        tint: monthly.budgetPct > 80 ? C.warningSoft : C.positiveSoft,
        route: 'Transactions',
      });
    }
    return items.slice(0, 2);
  }, [groups, monthly]);

  /* Chart data */
  const trendPts = useMemo(() => buildMonthlyTrend(transactions, selectedDate), [transactions, selectedDate]);
  const trendLabels = useMemo(() => trendPts.map((p) => p.x), [trendPts]);
  const hasTrend = trendPts.some((p) => p.y > 0);

  const chartCfg = useMemo(
    () => ({
      backgroundColor: C.surface,
      backgroundGradientFrom: C.surface,
      backgroundGradientTo: C.surface,
      decimalPlaces: 0,
      color: (op = 1) => `rgba(59, 130, 246, ${op})`,
      labelColor: (op = 1) => `rgba(107, 114, 128, ${op})`,
      strokeWidth: 3,
      fillShadowGradientFrom: C.brandBlue,
      fillShadowGradientFromOpacity: 0.12,
      fillShadowGradientTo: C.brandBlue,
      fillShadowGradientToOpacity: 0.01,
      propsForBackgroundLines: { stroke: C.divider, strokeWidth: 0.5 },
      propsForDots: { r: '3', strokeWidth: '2', stroke: C.brandBlue, fill: C.surface },
      propsForLabels: { fontSize: 11 },
    }),
    [],
  );

  /* Callbacks */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshTransactions(), refreshGroups()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshGroups, refreshTransactions]);

  const shiftMonth = useCallback((dir: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  }, []);

  const activeChitCount = useMemo(
    () => groups.filter((g) => { const dd = getDaysDiff(g.nextDrawDate); return dd === null || dd >= 0; }).length,
    [groups],
  );

  /* ── Render ── */
  return (
    <View style={st.root}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.brandBlue]} tintColor={C.brandBlue} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════ HEADER ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(20).springify()} style={st.header}>
          <View style={st.avatar}>
            <User size={18} color={C.textOnAccent} strokeWidth={2.2} />
          </View>
          <Pressable
            style={st.monthPill}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              setShowMonthNav((v) => !v);
            }}
          >
            <Text style={st.monthText}>{getMonthLabel(selectedDate)}</Text>
            <ChevronDown size={14} color={C.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={st.bellBtn}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              navigation.navigate('Notifications');
            }}
          >
            <Bell size={20} color={C.textPrimary} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {showMonthNav && (
          <Animated.View entering={FadeInUp.duration(200)} style={st.monthNav}>
            <Pressable style={st.monthNavBtn} onPress={() => shiftMonth(-1)}>
              <ChevronLeft size={16} color={C.textPrimary} strokeWidth={2.2} />
              <Text style={st.monthNavLabel}>Previous</Text>
            </Pressable>
            <Pressable style={st.monthNavBtn} onPress={() => shiftMonth(1)}>
              <Text style={st.monthNavLabel}>Next</Text>
              <ChevronRight size={16} color={C.textPrimary} strokeWidth={2.2} />
            </Pressable>
          </Animated.View>
        )}

        {/* ═══════════════════ HERO BALANCE ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={st.heroCard}>
          <View style={st.heroLabelRow}>
            <Text style={st.heroLabel}>Remaining This Month</Text>
            {monthly.income > 0 && (
              <View style={[st.savingsBadge, monthly.budgetPct > 80 ? st.savingsBadgeWarn : st.savingsBadgeGood]}>
                <Text style={[st.savingsBadgeText, { color: monthly.budgetPct > 80 ? C.warning : C.positive }]}>
                  {100 - monthly.budgetPct}% saved
                </Text>
              </View>
            )}
          </View>
          <Text style={[st.heroAmount, monthly.remaining < 0 && { color: C.negative }]}>
            {monthly.remaining < 0 ? '-' : ''}
            {fmt(monthly.remaining)}
          </Text>

          {/* Budget utilization bar */}
          {monthly.income > 0 && (
            <View style={st.budgetBarWrap}>
              <View style={st.budgetBar}>
                <View
                  style={[
                    st.budgetBarFill,
                    {
                      width: `${monthly.budgetPct}%`,
                      backgroundColor: monthly.budgetPct > 80 ? C.negative : monthly.budgetPct > 60 ? C.warning : C.positive,
                    },
                  ]}
                />
              </View>
              <Text style={st.budgetBarLabel}>{monthly.budgetPct}% spent</Text>
            </View>
          )}

          {/* Structured stat blocks: label above value, divider */}
          <View style={st.heroStats}>
            <Pressable
              style={({ pressed }) => [st.heroStatBlock, pressed && { opacity: 0.7 }]}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                navigation.navigate('Transactions');
              }}
            >
              <Text style={st.heroStatLabel}>Income</Text>
              <Text style={st.heroStatGreen}>{fmt(monthly.income)}</Text>
            </Pressable>
            <View style={st.heroDivider} />
            <Pressable
              style={({ pressed }) => [st.heroStatBlock, pressed && { opacity: 0.7 }]}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                navigation.navigate('Transactions');
              }}
            >
              <Text style={st.heroStatLabel}>Expenses</Text>
              <Text style={st.heroStatRed}>{fmt(monthly.expenses)}</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ═══════════════════ INSIGHTS ═══════════════════ */}
        {insights.length > 0 && (
          <View style={st.section}>
            <Text style={[st.sectionTitle, { marginBottom: 16 }]}>This Month</Text>
            {insights.map((item, i) => {
              const Icon = item.icon;
              return (
                <Animated.View
                  key={item.key}
                  entering={FadeInDown.delay(100 + i * 40).springify()}
                  style={st.insightCard}
                >
                  <Pressable
                    style={st.insightRow}
                    android_ripple={{ color: C.surfaceSubtle }}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger('impactLight');
                      navigation.navigate(item.route);
                    }}
                  >
                    <View style={[st.insightIcon, { backgroundColor: item.tint }]}>
                      <Icon size={18} color={C.textPrimary} strokeWidth={2} />
                    </View>
                    <View style={st.insightTextCol}>
                      <Text style={st.insightTitle}>{item.title}</Text>
                      <Text style={st.insightDetail}>{item.detail}</Text>
                    </View>
                    <ChevronRight size={16} color={C.textMuted} strokeWidth={2} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* ═══════════════════ SPENDING ═══════════════════ */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>Spending</Text>
            {monthly.topCats.length > 0 && (
              <Pressable onPress={() => { ReactNativeHapticFeedback.trigger('impactLight'); navigation.navigate('Reports'); }}>
                <Text style={st.linkText}>See Reports</Text>
              </Pressable>
            )}
          </View>

          <Animated.View entering={FadeInDown.delay(160).springify()}>
            {hasTrend ? (
              <Pressable
                style={st.chartCard}
                onPress={() => setChartTooltip(null)}
              >
                {chartTooltip && (
                  <View style={[st.tooltip, { left: Math.min(chartTooltip.x - 30, SCREEN_W - 140), top: chartTooltip.y - 40 }]}>
                    <Text style={st.tooltipText}>{fmt(chartTooltip.value)}</Text>
                  </View>
                )}
                <LineChart
                  data={{ labels: trendLabels, datasets: [{ data: trendPts.map((p) => p.y), strokeWidth: 3 }] }}
                  width={SCREEN_W - 80}
                  height={176}
                  chartConfig={chartCfg}
                  withVerticalLines={false}
                  withHorizontalLines
                  withInnerLines={false}
                  withOuterLines={false}
                  withShadow
                  withDots
                  fromZero
                  segments={3}
                  bezier
                  style={st.chart}
                  onDataPointClick={({ value, x, y }: { value: number; x: number; y: number }) => {
                    ReactNativeHapticFeedback.trigger('impactLight');
                    setChartTooltip({ x, y, value });
                  }}
                />
              </Pressable>
            ) : (
              <View style={st.emptyBlock}>
                <BarChart3 size={24} color={C.textMuted} strokeWidth={1.6} />
                <Text style={st.emptyTitle}>No spending data</Text>
                <Text style={st.emptyHint}>Add expenses to see trends</Text>
              </View>
            )}
          </Animated.View>

          {/* Category breakdown — individual rows with stagger */}
          {monthly.topCats.length > 0 && (
            <View style={st.breakdownBlock}>
              {monthly.topCats.slice(0, 4).map((cat, i) => {
                const info = getCatIcon(cat.name);
                const CatIcon = info.icon;
                return (
                  <Animated.View key={cat.name} entering={FadeInDown.delay(200 + i * 32).springify()}>
                    <View style={st.breakRow}>
                      <View style={[st.breakIcon, { backgroundColor: info.tint }]}>
                        <CatIcon size={16} color={C.textPrimary} strokeWidth={1.8} />
                      </View>
                      <View style={st.breakMain}>
                        <View style={st.breakTopRow}>
                          <Text style={st.breakName}>{cat.name}</Text>
                          <Text style={st.breakAmount}>{fmt(cat.amount)}</Text>
                        </View>
                        <View style={st.breakTrack}>
                          <View style={[st.breakFill, { width: `${cat.pct}%`, backgroundColor: BREAKDOWN_COLORS[i % 4] }]} />
                        </View>
                      </View>
                      <Text style={st.breakPct}>{cat.pct}%</Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>

        {/* ═══════════════════ CHITS SUMMARY ═══════════════════ */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>
              {groups.length > 0 ? `Chits (${activeChitCount} active)` : 'Chits'}
            </Text>
            {groups.length > 0 && (
              <Pressable onPress={() => { ReactNativeHapticFeedback.trigger('impactLight'); navigation.navigate('Groups'); }}>
                <Text style={st.linkText}>View All</Text>
              </Pressable>
            )}
          </View>

          {groups.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={st.emptyBlock}>
              <Users size={24} color={C.textMuted} strokeWidth={1.6} />
              <Text style={st.emptyTitle}>No active chits</Text>
              <Text style={st.emptyHint}>Join a chit group to get started</Text>
            </Animated.View>
          ) : (
            <View style={st.chitList}>
              {groups.slice(0, 2).map((g: ChitGroup, i: number) => {
                const pct = g.totalCycles > 0 ? Math.round((g.currentCycle / g.totalCycles) * 100) : 0;
                const dd = getDaysDiff(g.nextDrawDate);
                const overdue = dd !== null && dd < 0;
                return (
                  <Animated.View key={g.id} entering={FadeInDown.delay(200 + i * 48).springify()}>
                    <Pressable
                      style={st.chitCard}
                      onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactLight');
                        navigation.navigate('Groups');
                      }}
                      android_ripple={{ color: C.surfaceSubtle }}
                    >
                      {/* Zone 1: Name + Status */}
                      <View style={st.chitZoneTop}>
                        <Text style={st.chitName} numberOfLines={1}>{g.name}</Text>
                        <View style={[st.badge, overdue ? st.badgeRed : st.badgeGreen]}>
                          <Text style={[st.badgeText, { color: overdue ? C.negative : C.positive }]}>
                            {overdue ? 'Overdue' : 'On track'}
                          </Text>
                        </View>
                      </View>
                      {/* Zone 2: Prominent Amount */}
                      <Text style={st.chitAmount}>
                        {fmt(g.amount)}
                        <Text style={st.chitAmountUnit}>/mo</Text>
                      </Text>
                      <Text style={st.chitMeta}>
                        {g.currentCycle}/{g.totalCycles} cycles
                        {g.nextDrawDate
                          ? ` \u00B7 Due ${new Date(g.nextDrawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                          : ''}
                      </Text>
                      {/* Zone 3: Progress */}
                      <View style={st.chitBarRow}>
                        <View style={st.chitBar}>
                          <View style={[st.chitBarFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={st.chitPct}>{pct}%</Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
              {groups.length > 2 && (
                <Pressable
                  style={st.moreRow}
                  onPress={() => { ReactNativeHapticFeedback.trigger('impactLight'); navigation.navigate('Groups'); }}
                >
                  <Text style={st.moreText}>+{groups.length - 2} more groups</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

/* ══════════════════════════════════════════════════
   STYLES — 8pt grid, max 3 elevated surfaces
   Elevated: heroCard, chartCard, chitCard
   ══════════════════════════════════════════════════ */
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24 },

  /* ── Header (56pt) ── */
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: C.surface,
  },
  monthText: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
  },
  monthNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  monthNavLabel: { fontSize: 13, fontWeight: '500', color: C.textPrimary },

  /* ── Hero Balance Card (elevated #1) ── */
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    ...T.shadows.card,
  },
  heroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: C.textMuted,
  },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsBadgeGood: { backgroundColor: C.positiveSoft },
  savingsBadgeWarn: { backgroundColor: C.warningSoft },
  savingsBadgeText: { fontSize: 11, fontWeight: '600' },
  budgetBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  budgetBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.divider,
    overflow: 'hidden',
  },
  budgetBarFill: { height: 4, borderRadius: 2 },
  budgetBarLabel: { fontSize: 11, fontWeight: '500', color: C.textMuted },
  heroAmount: {
    fontSize: 44,
    fontWeight: '600',
    color: C.textPrimary,
    letterSpacing: -1,
    lineHeight: 52,
    marginTop: 8,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  heroStatBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  heroStatLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: C.textMuted,
    marginBottom: 4,
  },
  heroStatGreen: {
    fontSize: 18,
    fontWeight: '600',
    color: C.positive,
  },
  heroStatRed: {
    fontSize: 18,
    fontWeight: '600',
    color: C.negative,
  },
  heroDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.divider,
  },

  /* ── Sections ── */
  section: { marginBottom: 32 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: C.textPrimary, letterSpacing: -0.3 },
  linkText: { fontSize: 14, fontWeight: '500', color: C.brandBlue },

  /* ── Insights (individual cards, staggered) ── */
  insightCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  insightRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  insightTextCol: { flex: 1 },
  insightTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  insightDetail: { fontSize: 13, fontWeight: '400', color: C.textSecondary, marginTop: 0 },

  /* ── Chart (elevated #2) ── */
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingVertical: 20,
    paddingLeft: 8,
    paddingRight: 16,
    ...T.shadows.subtle,
  },
  chart: { borderRadius: 16, marginLeft: -8 },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: C.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tooltipText: { fontSize: 12, fontWeight: '600', color: C.textOnAccent },

  /* ── Breakdown (contained surface) ── */
  breakdownBlock: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    gap: 16,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  breakIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakMain: { flex: 1, gap: 8 },
  breakTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakName: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  breakAmount: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  breakTrack: { height: 4, borderRadius: 2, backgroundColor: C.divider, overflow: 'hidden' },
  breakFill: { height: 4, borderRadius: 2 },
  breakPct: { fontSize: 12, fontWeight: '500', color: C.textMuted, width: 32, textAlign: 'right' },

  /* ── Empty state ── */
  emptyBlock: {
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
  emptyHint: { fontSize: 13, fontWeight: '400', color: C.textMuted },

  /* ── Chit cards (elevated #3) — 3-zone layout ── */
  chitList: { gap: 16 },
  chitCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    ...T.shadows.subtle,
  },
  chitZoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chitName: { fontSize: 15, fontWeight: '600', color: C.textPrimary, flex: 1, marginRight: 8 },
  badge: { height: 24, borderRadius: 12, paddingHorizontal: 8, justifyContent: 'center' },
  badgeGreen: { backgroundColor: C.positiveSoft },
  badgeRed: { backgroundColor: C.negativeSoft },
  badgeText: { fontSize: 12, fontWeight: '600' },
  chitAmount: { fontSize: 22, fontWeight: '600', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  chitAmountUnit: { fontSize: 14, fontWeight: '400', color: C.textMuted },
  chitMeta: { fontSize: 13, fontWeight: '400', color: C.textSecondary, marginBottom: 12 },
  chitBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chitBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.divider,
    overflow: 'hidden',
  },
  chitBarFill: { height: 6, borderRadius: 3, backgroundColor: C.brandBlue },
  chitPct: { fontSize: 12, fontWeight: '500', color: C.textMuted, width: 32, textAlign: 'right' },

  /* ── More link ── */
  moreRow: { alignItems: 'center', paddingVertical: 16 },
  moreText: { fontSize: 14, fontWeight: '600', color: C.brandBlue },
});

export default UserDashboardScreen;
