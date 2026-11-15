/**
 * MONEY MAP — home screen world (direction: money-transit; seed key 6e483ad1).
 *
 * THESIS: The home is a transit diagram of the month's money — income is the
 * central interchange, categories are stations, the top line burns brightest,
 * the budget is a fare boundary. It refuses the category default: a row of
 * stat cards above a bar chart.
 * OWN-WORLD: a neutral enamel panel (`enamel` tokens) on the light canvas;
 * porcelain hub and station ticks; line inks drawn from the category palette
 * so a route's colour belongs to its category; routes bend only at 45/90;
 * one line burns.
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
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useSpecTheme, enamel } from '../../theme/specTheme';
import { categoryInk } from '../../theme/categoryColors';
import { Money } from '../../utils/money';
import { categoryLabel } from '../../utils/categoryLabel';
import { PaceRing } from './PaceRing';
import { StoryRow, StatusLine, KpiPills, PlanBar, ForecastLine } from './HeroStats';
import { PressableScale } from '../anim';
import type { Badge } from '../../services/badges';
import type { AgeOfMoney } from '../../services/ageOfMoney';
import type { HomeStatus } from '../../services/homeNarrative';
import type { MonthLedger } from '../../hooks/useMonthLedger';
import { EXPRESSIVE, HOME_SEQUENCE, STAGGER } from '../../theme/motion';

const SCREEN_W = Dimensions.get('window').width;

// Line inks come from the category palette, not the app's pastel accent
// rotation. The rotation is right on the light canvas; inside the dark hero it
// put a pink route beside a green ring and an amber warning, and a colour that
// carries no meaning sitting between two that do reads as a bug. A route's
// colour is now a property of its category, stable across renders and screens.
const lineColor = (name: string) => categoryInk(name).fill;

const EN = enamel;

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


type MonthPlan = {
  safeToSpend: number; // paise
  monthlyRemaining: number; // paise
  safeToSpendToday: number; // paise
};

interface MoneyMapProps {
  /** The month's aggregates, derived once by useMonthLedger. */
  ledger: MonthLedger;
  /**
   * This month's income, from FinancialIntelligenceEngine.
   *
   * NOT from the ledger. The engine is the single source for income — it is
   * what derives the plan, the buckets and safe-to-spend — and taking income
   * from a second computation put ₹1,00,000 on Home beside ₹85,000 on Money
   * Plan for the same month. Worse, the outer ring divides the engine's plan
   * by the ledger's income, mixing two sources inside one ratio.
   */
  incomePaise: number;
  monthPlan: MonthPlan | null;
  onOpenReports: () => void;
  /** Opens category management — the map's growth prompt when data is thin. */
  onAddCategory: () => void;
  /** Consecutive days at or under the daily allowance. */
  streakDays: number;
  /** The one badge worth showing, or null. */
  badge: Badge | null;
  /** How long money sits before being spent, or null when unprovable. */
  ageOfMoney: AgeOfMoney | null;
  /** The contextual sentence under the ring. */
  status: HomeStatus;
  /** Bumped on pull-to-refresh to rewind and redraw the gauge. */
  replayToken?: number;
  /** Bills still unpaid this cycle — cadence-aware, from `billsSummary`. */
  unpaidBillsPaise: number;
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
  ledger,
  incomePaise: income,
  monthPlan,
  onOpenReports,
  onAddCategory,
  streakDays,
  badge,
  ageOfMoney,
  status,
  replayToken = 0,
  unpaidBillsPaise,
}) => {
  const { cardRadius, cardShadow } = useSpecTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = useSharedValue(0);

  const {
    spendPaise: spend,
    todaySpendPaise: todaySpend,
    byCategory: breakdown,
    expenses,
  } = ledger;

  const stations = useMemo(() => breakdown.slice(0, 5), [breakdown]);

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
  const mapW = Math.min(SCREEN_W - 80, 340);
  const mapH = mapW * (VH / VW);
  // The transit diagram needs at least three spokes to read as a map.
  const sparse = stations.length > 0 && stations.length < 3;


  const renderStation = (
    station: { name: string; amountPaise: number },
    i: number,
  ) => {
    const color = lineColor(station.name);
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
          {categoryLabel(station.name)}
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
        <PressableScale
          onPress={onOpenReports}
          accessibilityRole="button"
          accessibilityLabel="View report"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.reportLink}
        >
          <Text style={styles.reportLinkText}>View report</Text>
          <ChevronRight size={13} color={EN.textPrimary} strokeWidth={2.6} />
        </PressableScale>
      </View>

      {/* Hero: one dial — how much of today's allowance is still standing.
          The month's pace lives on the PlanBar below, where a marker on a
          straight track compares two positions instead of two arcs. */}
      <View style={styles.heroRing}>
        <PaceRing
          safeTodayPaise={monthPlan?.safeToSpendToday ?? 0}
          todaySpendPaise={todaySpend}
          spendPaise={spend}
          planPaise={safeToSpend}
          incomePaise={income}
          replayToken={replayToken}
        />
      </View>

      <StoryRow streakDays={streakDays} badge={badge} ageOfMoney={ageOfMoney} />
      <StatusLine status={status} />
      <KpiPills incomePaise={income} planPaise={safeToSpend} />
      {safeToSpend > 0 && (
        <PlanBar
          spendPaise={spend}
          planPaise={safeToSpend}
          categories={breakdown}
        />
      )}
      {safeToSpend > 0 && (
        <ForecastLine
          transactions={expenses}
          planPaise={safeToSpend}
          unpaidBillsPaise={unpaidBillsPaise}
        />
      )}

      {/* The map is the second act: the hero says how the month is going, the
          map says where the money went. A rule keeps them from reading as one
          undifferentiated column of panel. */}
      <View style={styles.actBreak} />

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
          {stations.map(s => {
            const color = lineColor(s.name);
            const share = spend > 0 ? s.amountPaise / spend : 0;
            return (
              <View key={s.name} style={styles.sparseRow}>
                <View style={styles.sparseRowHead}>
                  <Text style={styles.sparseName}>{categoryLabel(s.name)}</Text>
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
          {/* This is a growth prompt, and it spent its life as dead grey text
              at the foot of the panel where nobody would ever action it. A
              prompt worth making is worth making tappable — and it arrives
              after the rows it follows, so it reads as the conclusion of the
              list rather than as another row of it. */}
          <Animated.View
            entering={FadeInDown.springify()
              .damping(16)
              .delay(HOME_SEQUENCE.breakdown + stations.length * STAGGER.normal)
              .reduceMotion(EXPRESSIVE)}
          >
            <PressableScale
              onPress={onAddCategory}
              style={styles.sparseCta}
              accessibilityRole="button"
              accessibilityLabel="Add a category to build your money map"
            >
              <Plus size={16} color={EN.success} strokeWidth={2.8} />
              <Text style={styles.sparseCtaText}>
                Add a category to build your map
              </Text>
            </PressableScale>
          </Animated.View>
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
                color={lineColor(s.name)}
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
                        lineColor(activeStation.name),
                    },
                  ]}
                />
                <Text style={styles.detailName}>
                  {categoryLabel(activeStation.name)}
                </Text>
                <Text
                  style={[
                    styles.detailAmount,
                    {
                      color: lineColor(activeStation.name),
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
                        {categoryLabel(tx.description || tx.category)}
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
  actBreak: {
    height: 1,
    backgroundColor: EN.border,
    marginTop: 24,
    marginBottom: 20,
  },
  panelTitle: {
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
  },
  heroRing: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  // A real button, not a text link: it is the only way out of the panel and
  // was previously indistinguishable from the labels around it.
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: EN.card,
    paddingLeft: 12,
    paddingRight: 9,
    paddingVertical: 7,
    borderRadius: 999,
  },
  reportLinkText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
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
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: EN.textSecondary,
  },
  sparseIncomeValue: {
    fontSize: 28,
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
  sparseCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: `${EN.success}1F`,
  },
  sparseCtaText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    color: EN.success,
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
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    color: EN.textPrimary,
  },
  txDate: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: EN.textSecondary,
    marginTop: 1,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
  },
});

export default MoneyMap;
