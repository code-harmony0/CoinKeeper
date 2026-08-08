/**
 * MONEY MAP — home screen world (direction: money-transit; seed key 6e483ad1).
 *
 * THESIS: The home is a transit diagram of the month's money — income is the
 * central interchange, categories are stations, the top line burns brightest,
 * the budget is a fare boundary. It refuses the category default: a row of
 * stat cards above a bar chart.
 * OWN-WORLD: a midnight enamel panel (dark tokens) on the light canvas;
 * porcelain hub and station ticks; five pastel line inks (lavender, pink,
 * mint, peach, sky); routes bend only at 45/90; one line burns.
 * STORY: the visitor traces "where did this month's money go" in one glance,
 * taps a station, sees that line's spend and its recent transactions.
 * FIRST VIEWPORT: header pills, then the map panel: hub (income) at center,
 * five category stations on disciplined spokes, a fare-boundary ring, and a
 * spent-vs-plan fare strip at the panel foot. Primary action: tap a station;
 * "Add" lives in the tab bar FAB.
 * FORM: money-transit structure, candidate 4 of the grounded list (assigned
 * by concept-seed 6e483ad1).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, and DESIGN.md.
 */

import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useSpecTheme, specDark, specLight } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import { PaceRing } from './PaceRing';
import type { Transaction } from '../../types/transaction';

const SCREEN_W = Dimensions.get('window').width;

// Line inks are the light pastel accents (lavender → pink → mint → peach →
// sky, rotation order is load-bearing) glowing on the dark enamel ground.
const LINE_COLORS = [
  specLight.lavender,
  specLight.pink,
  specLight.mint,
  specLight.peach,
  specLight.sky,
];

const EN = { ...specDark, background: '#121723' }; // midnight enamel panel tokens

const VW = 340;
const VH = 306;
const CX = 170; // hub center
const CY = 150;
const HUB_R = 32;
const BOUNDARY_R = 100;

// Station geometry — routes leave the hub on 45°/90° spokes only.
// `labelDy` places the label block on the far side of the station from the
// hub, so a route never runs underneath its own label text.
const STATIONS = [
  { x: 170, y: 50, path: 'M170,150 L170,50', labelDy: -34, dx: 0 }, // N  (vertical, labels above)
  { x: 238, y: 82, path: 'M170,150 L238,82', labelDy: -34, dx: 0 }, // NE (45°, labels above)
  { x: 262, y: 150, path: 'M202,150 L262,150', labelDy: 30, dx: -36 }, // E (horizontal, labels below)
  { x: 238, y: 218, path: 'M170,150 L238,218', labelDy: 30, dx: 0 }, // SE (45°, labels below)
  { x: 170, y: 240, path: 'M170,150 L170,240', labelDy: 30, dx: 0 }, // S  (vertical, labels below)
];

/** "unknown" / "food" arrive lowercase from the ledger; screens show them titled. */
const titleCase = (s: string): string =>
  s === 'unknown'
    ? 'Uncategorized'
    : s.charAt(0).toUpperCase() + s.slice(1);

type MonthPlan = {
  safeToSpend: number; // paise
  monthlyRemaining: number; // paise
  safeToSpendToday: number; // paise
};

interface MoneyMapProps {
  transactions: Transaction[];
  monthPlan: MonthPlan | null;
  onOpenReports: () => void;
}

const compactINR = (paise: number): string => {
  const r = paise / 100;
  if (r >= 10000000) return `₹${(r / 10000000).toFixed(1)}Cr`;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A single route: opacity animates to 1 when it is the burning line. */
const RouteLine = memo(
  ({
    index,
    active,
    path,
    color,
  }: {
    index: number;
    active: ReturnType<typeof useSharedValue<number>>;
    path: string;
    color: string;
  }) => {
    const animatedProps = useAnimatedProps(() => ({
      opacity: withTiming(active.value === index ? 1 : 0.28, { duration: 220 }),
    }));
    return (
      <AnimatedPath
        d={path}
        stroke={color}
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
        animatedProps={animatedProps}
      />
    );
  },
);

export const MoneyMap: React.FC<MoneyMapProps> = ({
  transactions,
  monthPlan,
  onOpenReports,
}) => {
  const { cardRadius, cardShadow } = useSpecTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = useSharedValue(0);

  const map = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthTxs = transactions.filter(
      t => new Date(t.date).getTime() >= monthStart,
    );

    let income = 0;
    let spend = 0;
    const byCategory = new Map<string, number>();
    const expenses: Transaction[] = [];

    for (const t of monthTxs) {
      if (t.type === 'income') income += t.amountPaise;
      else if (t.type === 'expense') {
        spend += t.amountPaise;
        expenses.push(t);
        byCategory.set(
          t.category,
          (byCategory.get(t.category) ?? 0) + t.amountPaise,
        );
      }
    }

    const stations = [...byCategory.entries()]
      .map(([name, amountPaise]) => ({ name, amountPaise }))
      .sort((a, b) => b.amountPaise - a.amountPaise)
      .slice(0, 5);

    return { income, spend, stations, expenses };
  }, [transactions]);

  const { income, spend, stations, expenses } = map;

  const selectStation = (i: number) => {
    setActiveIndex(i);
    active.value = i;
  };

  const activeStation = stations[activeIndex] ?? stations[0];
  const activeTxs = useMemo(() => {
    if (!activeStation) return [];
    return expenses
      .filter(t => t.category === activeStation.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [activeStation, expenses]);

  const safeToSpend = monthPlan?.safeToSpend ?? 0;
  const pct = safeToSpend > 0 ? Math.min(1, spend / safeToSpend) : 0;
  const remaining = safeToSpend > 0 ? safeToSpend - spend : 0;
  const over = remaining < 0;
  const mapW = Math.min(SCREEN_W - 80, 340);
  const mapH = mapW * (VH / VW);
  // The transit diagram needs at least three spokes to read as a map.
  const sparse = stations.length > 0 && stations.length < 3;


  const renderStation = (
    station: { name: string; amountPaise: number },
    i: number,
  ) => {
    const color = LINE_COLORS[i % LINE_COLORS.length];
    const isBurning = stations[activeIndex]?.name === station.name;
    const { labelDy, dx: labelDx } = STATIONS[i];
    return (
      <G key={station.name} onPress={() => selectStation(i)}>
        {/* generous invisible tap target */}
        <Circle
          cx={STATIONS[i].x}
          cy={STATIONS[i].y}
          r={30}
          fill="transparent"
        />
        <Circle
          cx={STATIONS[i].x}
          cy={STATIONS[i].y}
          r={15}
          stroke={color}
          strokeWidth={isBurning ? 2.5 : 1.5}
          fill={isBurning ? color : 'rgba(255,255,255,0.06)'}
          fillOpacity={isBurning ? 0.22 : 1}
        />
        <SvgText
          x={STATIONS[i].x + labelDx}
          y={STATIONS[i].y + labelDy}
          fontSize={11}
          fontFamily="Satoshi-Medium"
          fill={EN.textPrimary}
          textAnchor="middle"
          opacity={isBurning ? 1 : 0.55}
        >
          {titleCase(station.name)}
        </SvgText>
        <SvgText
          x={STATIONS[i].x + labelDx}
          y={STATIONS[i].y + labelDy + 15}
          fontSize={12}
          fontFamily="Satoshi-Bold"
          fill={color}
          textAnchor="middle"
          opacity={isBurning ? 1 : 0.55}
        >
          {Money.format(station.amountPaise, { zeroDecimals: true })}
        </SvgText>
      </G>
    );
  };

  return (
    <View style={[styles.panel, { borderRadius: cardRadius, ...cardShadow }]}>
      {/* Panel header */}
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>This month</Text>
        <Pressable
          onPress={onOpenReports}
          accessibilityRole="button"
          accessibilityLabel="View report"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.reportLink}
        >
          <Text style={styles.reportLinkText}>View report</Text>
          <ChevronRight size={14} color={EN.textSecondary} strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Hero: the one number, the pacing ring, the verdict. */}
      <View style={styles.heroRing}>
        <PaceRing
          safeTodayPaise={monthPlan?.safeToSpendToday ?? 0}
          spendPaise={spend}
          planPaise={safeToSpend}
        />
      </View>

      {stations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No spending yet this month</Text>
          <Text style={styles.emptySubtitle}>
            Your money map fills in as you add expenses
          </Text>
        </View>
      ) : sparse ? (
        /* One or two categories can't make a map — a single spoke reads as a
           lollipop with a screen of dead panel under it. Below three stations
           the same data pays its way as a ranked bar list. */
        <View style={styles.sparseList}>
          <View style={styles.sparseIncomeRow}>
            <Text style={styles.sparseIncomeLabel}>Income</Text>
            <Text style={styles.sparseIncomeValue}>
              {Money.format(income, { zeroDecimals: true })}
            </Text>
          </View>
          {stations.map((s, i) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const share = spend > 0 ? s.amountPaise / spend : 0;
            return (
              <View key={s.name} style={styles.sparseRow}>
                <View style={styles.sparseRowHead}>
                  <Text style={styles.sparseName}>{titleCase(s.name)}</Text>
                  <Text style={[styles.sparseAmount, { color }]}>
                    {Money.format(s.amountPaise, { zeroDecimals: true })}
                  </Text>
                </View>
                <View style={styles.sparseTrack}>
                  <View
                    style={[
                      styles.sparseFill,
                      {
                        width: `${Math.max(4, share * 100)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
          <Text style={styles.sparseHint}>
            Track a third category and this becomes your money map
          </Text>
        </View>
      ) : (
        <>
          {/* The transit diagram */}
          <Svg width={mapW} height={mapH} viewBox={`0 0 ${VW} ${VH}`}>
            {/* fare boundary ring — the month's plan, drawn as a dashed track */}
            <Circle
              cx={CX}
              cy={CY}
              r={BOUNDARY_R}
              stroke={EN.border}
              strokeWidth={1.5}
              strokeDasharray="4 6"
              fill="none"
            />
            {/* routes */}
            {stations.map((s, i) => (
              <RouteLine
                key={s.name}
                index={i}
                active={active}
                path={STATIONS[i].path}
                color={LINE_COLORS[i % LINE_COLORS.length]}
              />
            ))}
            {/* stations */}
            {stations.map(renderStation)}
            {/* hub — income interchange */}
            <Circle cx={CX} cy={CY} r={HUB_R} fill={EN.textPrimary} />
            <SvgText
              x={CX}
              y={CY - 8}
              fontSize={9}
              fontFamily="Satoshi-Bold"
              letterSpacing={1.2}
              fill={EN.background}
              textAnchor="middle"
              opacity={0.6}
            >
              INCOME
            </SvgText>
            <SvgText
              x={CX}
              y={CY + 12}
              fontSize={14}
              fontFamily="Satoshi-Black"
              fill={EN.background}
              textAnchor="middle"
            >
              {compactINR(income)}
            </SvgText>
          </Svg>

          {/* Active station detail */}
          {activeStation && activeTxs.length > 0 && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={styles.detail}
            >
              <View style={styles.detailHead}>
                <View
                  style={[
                    styles.detailDot,
                    {
                      backgroundColor:
                        LINE_COLORS[activeIndex % LINE_COLORS.length],
                    },
                  ]}
                />
                <Text style={styles.detailName}>
                  {titleCase(activeStation.name)}
                </Text>
                <Text
                  style={[
                    styles.detailAmount,
                    {
                      color: LINE_COLORS[activeIndex % LINE_COLORS.length],
                    },
                  ]}
                >
                  {Money.format(activeStation.amountPaise, {
                    zeroDecimals: true,
                  })}
                </Text>
              </View>
              <View style={styles.detailList}>
                {activeTxs.map(tx => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={styles.txLeft}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {titleCase(tx.description || tx.category)}
                      </Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.txAmount}>
                      −{Money.format(tx.amountPaise, { zeroDecimals: true })}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

        </>
      )}

      {/* Fare strip — spent vs plan. Belongs to every non-empty state, map or
          list; it is the panel's bottom line either way. */}
      {stations.length > 0 &&
        (safeToSpend > 0 ? (
          <View style={styles.fareStrip}>
            <View style={styles.fareRow}>
              <Text style={styles.fareSpent}>
                Spent{' '}
                <Text style={styles.fareSpentValue}>
                  {Money.format(spend, { zeroDecimals: true })}
                </Text>{' '}
                of {Money.format(safeToSpend, { zeroDecimals: true })} plan
              </Text>
              <Text style={[styles.fareLeft, over && styles.fareOver]}>
                {over
                  ? `${Money.format(-remaining, { zeroDecimals: true })} over`
                  : `${Money.format(remaining, { zeroDecimals: true })} left`}
              </Text>
            </View>
            <View style={styles.fareTrack}>
              <View
                style={[
                  styles.fareFill,
                  {
                    // A 2%-of-plan spend rendered as a 2%-wide sliver read as a
                    // rendering fault; floor it so the fill is always a bar.
                    width: `${Math.max(pct * 100, 2)}%`,
                    backgroundColor: over ? EN.danger : EN.success,
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <Text style={styles.fareHint}>
            Add income to set this month's spending plan
          </Text>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: EN.background,
    padding: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
  },
  heroRing: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reportLinkText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    color: EN.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    color: EN.textSecondary,
    marginTop: 4,
  },
  sparseList: {
    paddingTop: 4,
    paddingBottom: 16,
    gap: 16,
  },
  sparseIncomeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sparseIncomeLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: EN.textSecondary,
  },
  sparseIncomeValue: {
    fontSize: 24,
    fontFamily: 'Satoshi-Black',
    color: EN.textPrimary,
  },
  sparseRow: {
    gap: 8,
  },
  sparseRowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sparseName: {
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    color: EN.textPrimary,
  },
  sparseAmount: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
  },
  sparseTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: EN.surfaceSunken,
    overflow: 'hidden',
  },
  sparseFill: {
    height: '100%',
    borderRadius: 3,
  },
  sparseHint: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: EN.textSecondary,
  },
  detail: {
    borderTopWidth: 1,
    borderTopColor: EN.border,
    paddingTop: 12,
    marginBottom: 16,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  detailName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
  },
  detailAmount: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
  },
  detailList: {
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txLeft: {
    flex: 1,
    marginRight: 12,
  },
  txDesc: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    color: EN.textPrimary,
  },
  txDate: {
    fontSize: 11,
    fontFamily: 'Satoshi-Regular',
    color: EN.textSecondary,
    marginTop: 1,
  },
  txAmount: {
    fontSize: 13,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
  },
  fareStrip: {
    borderTopWidth: 1,
    borderTopColor: EN.border,
    paddingTop: 12,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fareSpent: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    color: EN.textSecondary,
  },
  fareSpentValue: {
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
  },
  fareLeft: {
    fontSize: 13,
    fontFamily: 'Satoshi-Bold',
    color: EN.success,
  },
  fareOver: {
    color: EN.danger,
  },
  fareTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: EN.surfaceSunken,
    overflow: 'hidden',
  },
  fareFill: {
    height: '100%',
    borderRadius: 2,
  },
  fareHint: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: EN.textSecondary,
    paddingTop: 8,
  },
});

export default MoneyMap;
