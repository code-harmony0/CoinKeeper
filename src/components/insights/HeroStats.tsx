/**
 * HeroStats — everything the home hero says in words and bars, under the ring.
 *
 * Four bands, in descending order of how quickly the user can act on them:
 * the story row (what you've built up), the status line (what to do about
 * today), the two KPI pills (the month's frame), and the plan bar (where the
 * month actually stands, opening into the category breakdown).
 *
 * ## One colour system, scoped by span
 *
 * Two failures bracket the rule here, and both shipped before it was right.
 *
 * First the status line and the plan bar coloured from unrelated logic, which
 * put an amber "91% of today's budget used" directly above a bright green
 * "₹11,324 left" — two verdicts, no way to know which to believe.
 *
 * The over-correction was worse: one shared tone drove both, so "Today's
 * budget is spent" turned the *month* bar red while 90% of the plan was still
 * untouched. A bar that shouts when nothing is wrong teaches people to ignore
 * red, which is the same failure wearing the opposite colour.
 *
 * The rule that holds: one colour system, every element scoped to the span it
 * measures. The status line speaks for today. The plan bar speaks for the
 * month (`planTone`). They may legitimately disagree, and each says which span
 * it is talking about.
 *
 * These pieces live in one file because they are one composition: none is
 * reusable away from the hero, and splitting them into four modules would only
 * spread a single layout decision across four files.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Flame,
  Hourglass,
  Info,
  Medal,
  PiggyBank,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react-native';
import { enamel } from '../../theme/specTheme';
import { barInk } from '../../theme/categoryColors';
import { Money } from '../../utils/money';
import { categoryLabel } from '../../utils/categoryLabel';
import {
  computePace,
  type Pace,
  type PaceStatus,
} from '../../services/budgetPacing';
import { projectMonthEnd } from '../../services/monthEndForecast';
import type { AnalysableTransaction } from '../../services/spendingAnalysis';
import { PressableScale } from '../anim';
import type { Badge } from '../../services/badges';
import type { AgeOfMoney } from '../../services/ageOfMoney';
import type { HomeStatus, Tone } from '../../services/homeNarrative';
import {
  DURATION,
  EXPRESSIVE,
  HOME_SEQUENCE,
  INFORMATIONAL,
  SPRING,
  STAGGER,
  sequenceDelay,
  useReducedMotion,
} from '../../theme/motion';

const BADGE_ICONS = { Flame, Trophy, Medal, PiggyBank, Target };

const TONE_COLOR: Record<Tone, string> = {
  good: enamel.success,
  warn: enamel.warning,
  bad: enamel.danger,
  neutral: enamel.textSecondary,
};

/** The gradient each tone fills its bar with. */
const TONE_GRADIENT: Record<Tone, string[]> = {
  good: [enamel.success, enamel.successBright],
  warn: [enamel.warning, enamel.warningBright],
  bad: [enamel.danger, enamel.dangerBright],
  neutral: [enamel.textSecondary, enamel.neutralBright],
};


/* ------------------------------------------------------------------ story */

/**
 * Note what is NOT here: the month-end projection. `buildStatus` already leads
 * with it whenever it is the most useful thing to say, and rendering both put
 * "On track to save ₹48,800" on screen twice, one row above itself. The status
 * line wins — it is contextual, and drops the projection when something more
 * urgent outranks it.
 */
interface StoryRowProps {
  streakDays: number;
  badge: Badge | null;
  /** Null until the ledger has enough traceable spending to make the claim. */
  ageOfMoney: AgeOfMoney | null;
}

/**
 * Past a month an escalating daily counter stops reading as an achievement and
 * starts reading as something fragile the user can destroy, so the unit
 * switches to months and the tick slows. See DESIGN.md §7.
 */
const streakLabel = (days: number): string =>
  days >= 30
    ? `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} under budget`
    : `${days}-day under-budget run`;

export const StoryRow: React.FC<StoryRowProps> = ({
  streakDays,
  badge,
  ageOfMoney,
}) => {
  const reduced = useReducedMotion();
  const items: Array<{ key: string; icon: React.ReactNode; text: string }> = [];

  // Leads the row: it is the only figure here that describes the user's
  // position rather than their recent behaviour, and the only one that doesn't
  // reset with the calendar month.
  if (ageOfMoney) {
    items.push({
      key: 'age',
      icon: (
        <Hourglass
          size={16}
          color={TONE_COLOR[ageOfMoney.tone]}
          strokeWidth={2.5}
        />
      ),
      text: ageOfMoney.label,
    });
  }

  if (streakDays > 0) {
    items.push({
      key: 'streak',
      icon: <Flame size={16} color={enamel.warning} strokeWidth={2.5} />,
      text: streakLabel(streakDays),
    });
  }

  if (badge) {
    const Icon = BADGE_ICONS[badge.icon];
    items.push({
      key: 'badge',
      icon: <Icon size={16} color="#FFD60A" strokeWidth={2.5} />,
      text: badge.label,
    });
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.storyRow}>
      {items.map((item, i) => (
        <Animated.View
          key={item.key}
          entering={FadeInDown.springify()
            .damping(16)
            .delay(
              sequenceDelay(HOME_SEQUENCE.storyRow + i * STAGGER.tight, reduced),
            )
            .reduceMotion(EXPRESSIVE)}
          style={styles.storyItem}
        >
          {item.icon}
          <Text style={styles.storyText} numberOfLines={2}>
            {item.text}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
};

/* ----------------------------------------------------------------- status */

/**
 * A compact insight, not a paragraph. The rule down its left edge and the
 * tinted ground mark it as an aside about today — a full-width sentence in
 * this slot reads as an error banner every time the user opens the app.
 */
const STATUS_ICON: Record<Tone, typeof CheckCircle2> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: AlertOctagon,
  neutral: Info,
};

export const StatusLine: React.FC<{ status: HomeStatus }> = ({ status }) => {
  const reduced = useReducedMotion();
  const tone = TONE_COLOR[status.tone];
  const Icon = STATUS_ICON[status.tone];

  return (
    <Animated.View
      entering={FadeIn.delay(
        sequenceDelay(HOME_SEQUENCE.statusLine, reduced),
      ).reduceMotion(EXPRESSIVE)}
      style={[
        styles.statusRow,
        { backgroundColor: `${tone}14`, borderLeftColor: tone },
      ]}
      accessibilityLabel={status.message}
    >
      {/* A status colour never travels alone — the icon is what makes good /
          warning / over legible to a colour-blind reader and in forced-colours
          modes. This replaced a bare coloured dot, which carried no meaning of
          its own. */}
      <Icon size={16} color={tone} strokeWidth={2.4} />
      <Text style={[styles.statusText, { color: tone }]} numberOfLines={2}>
        {status.headline}
      </Text>
    </Animated.View>
  );
};

/* -------------------------------------------------------------------- kpi */

interface KpiPillsProps {
  incomePaise: number;
  planPaise: number;
}

export const KpiPills: React.FC<KpiPillsProps> = ({
  incomePaise,
  planPaise,
}) => {
  const reduced = useReducedMotion();
  // "80% of income" was the outer ring of the old triple gauge — a whole arc
  // spent on a ratio that is one line of text beside the number it is a ratio
  // of. It reads here, against the plan itself, instead of as a third circle.
  const pills = [
    { key: 'income', label: 'INCOME', value: incomePaise, caption: null },
    {
      key: 'plan',
      label: 'MONTHLY PLAN',
      value: planPaise,
      caption:
        incomePaise > 0
          ? `${Math.round((planPaise / incomePaise) * 100)}% of income`
          : null,
    },
  ];

  return (
    <View style={styles.kpiRow}>
      {pills.map((pill, i) => (
        <Animated.View
          key={pill.key}
          entering={FadeIn.delay(
            sequenceDelay(HOME_SEQUENCE.kpiPills + i * STAGGER.loose, reduced),
          )
            .duration(DURATION.micro)
            .reduceMotion(EXPRESSIVE)}
          style={styles.kpi}
        >
          <Text style={styles.kpiLabel}>{pill.label}</Text>
          <Text style={styles.kpiValue}>
            {Money.format(pill.value, { zeroDecimals: true })}
          </Text>
          {pill.caption && (
            <Text style={styles.kpiCaption}>{pill.caption}</Text>
          )}
        </Animated.View>
      ))}
    </View>
  );
};

/* --------------------------------------------------------------- plan bar */

export interface CategorySlice {
  name: string;
  amountPaise: number;
}

/**
 * A bar whose width springs in on appear, gradient-filled, with a single pass
 * of light across it once it lands.
 *
 * The width is informational — it *is* the percentage — so it plays regardless
 * of the system motion flag. The shimmer is decoration and honours it.
 */
const GradientFill: React.FC<{
  progress: number;
  colors: string[];
  delay?: number;
}> = ({ progress, colors, delay = HOME_SEQUENCE.planBar }) => {
  const reduced = useReducedMotion();
  const width = useSharedValue(0);
  const shine = useSharedValue(-1);

  // A 2%-of-plan spend rendered as a 2%-wide sliver reads as a rendering
  // fault, so the fill is floored at a width that still looks like a bar.
  const target = Math.max(Math.min(1, Math.max(0, progress)) * 100, 3);

  useEffect(() => {
    width.value = withDelay(
      sequenceDelay(delay, reduced),
      withSpring(target, { ...SPRING.settle, reduceMotion: INFORMATIONAL }),
    );

    // Once, after the fill lands — the signal is "this number is fresh", and a
    // loop would turn a signal into wallpaper.
    shine.value = -1;
    shine.value = withDelay(
      sequenceDelay(delay, reduced) + DURATION.fill,
      withTiming(2, {
        duration: DURATION.shimmer,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: EXPRESSIVE,
      }),
    );
  }, [target, delay, reduced, width, shine]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${shine.value * 100}%` }],
  }));

  return (
    <Animated.View style={[styles.planFill, fillStyle]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.shine, shineStyle]} pointerEvents="none">
        <LinearGradient
          colors={[`${enamel.textPrimary}00`, `${enamel.textPrimary}59`, `${enamel.textPrimary}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
};

interface PlanBarProps {
  spendPaise: number;
  planPaise: number;
  categories: CategorySlice[];
  /** injectable for tests */
  now?: Date;
}

/**
 * The bar's own verdict, about the month and nothing else.
 *
 * It briefly took the status line's tone, on the theory that one tone
 * everywhere meant one story. On device that produced "Today's budget is
 * spent" in red above "₹43,850 left" in red, with a red bar — while 90% of the
 * month's plan was still untouched. Blowing one day's allowance is not the
 * month going wrong, and a bar that shouts when nothing is wrong is exactly
 * the mixed signal the shared tone was meant to remove.
 *
 * The rule is one colour *system*, each element scoped to the span it
 * measures: the status line speaks for today, this bar speaks for the month.
 */
const planTone = (
  spendPaise: number,
  planPaise: number,
  pace: Pace | null,
): Tone => {
  if (spendPaise > planPaise) return 'bad';
  return pace?.status === 'fast' ? 'warn' : 'good';
};

/** The verdict the marker exists to make readable, in three words or fewer. */
const PACE_VERDICT: Record<PaceStatus, string> = {
  ahead: 'Under pace',
  on: 'On pace',
  fast: 'Ahead of plan',
};

/**
 * The month's plan as one thick bar, opening into the categories that filled
 * it. The breakdown is the answer to the question the bar provokes ("spent on
 * what?"), so it belongs here rather than one screen away.
 */
export const PlanBar: React.FC<PlanBarProps> = ({
  spendPaise,
  planPaise,
  categories,
  now,
}) => {
  const [open, setOpen] = useState(false);
  const remaining = planPaise - spendPaise;
  const over = remaining < 0;
  const progress = planPaise > 0 ? Math.min(1, spendPaise / planPaise) : 0;

  const pace = computePace(spendPaise, planPaise, now ?? new Date());
  const barTone = planTone(spendPaise, planPaise, pace);
  const accent = TONE_COLOR[barTone];

  // Where an even draw-down of the plan would have you by today. This was the
  // middle ring of the old triple gauge, where "am I ahead or behind" meant
  // unrolling an arc against a tick floating at its edge. On a straight track
  // it is one comparison of two positions, which is what the question is.
  const marker = pace && pace.elapsed > 0.02 && pace.elapsed < 0.98
    ? pace.elapsed
    : null;

  return (
    <View style={styles.planBlock}>
      <PressableScale
        onPress={() => setOpen(o => !o)}
        disabled={categories.length === 0}
        accessibilityRole="button"
        accessibilityLabel={
          over
            ? `${Money.format(-remaining, { zeroDecimals: true })} over plan. Show category breakdown`
            : `${Money.format(remaining, { zeroDecimals: true })} left in plan. Show category breakdown`
        }
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.planRow}>
          <Text style={styles.planSpent}>
            {Money.format(spendPaise, { zeroDecimals: true })} spent
          </Text>
          <View style={styles.planLeftGroup}>
            <Text style={[styles.planLeft, { color: accent }]}>
              {over
                ? `${Money.format(-remaining, { zeroDecimals: true })} over`
                : `${Money.format(remaining, { zeroDecimals: true })} left`}
            </Text>
            {categories.length > 0 && (
              <ChevronDown
                size={14}
                color={accent}
                strokeWidth={2.6}
                style={open ? styles.chevronOpen : undefined}
              />
            )}
          </View>
        </View>

        <View style={styles.planTrack}>
          <GradientFill
            progress={over ? 1 : progress}
            colors={TONE_GRADIENT[barTone]}
          />
          {marker !== null && (
            <View
              pointerEvents="none"
              style={[styles.planMarker, { left: `${marker * 100}%` }]}
            />
          )}
        </View>

        {/* A marker nobody can name is an artefact, so the track says what the
            tick is and the verdict says which side of it the bar is on. */}
        {pace && (
          <View style={styles.planFootRow}>
            <View style={styles.planFootKey}>
              <View style={styles.planFootTick} />
              <Text style={styles.planFootText}>Even pace by today</Text>
            </View>
            <Text style={[styles.planFootVerdict, { color: accent }]}>
              {PACE_VERDICT[pace.status]}
            </Text>
          </View>
        )}
      </PressableScale>

      {/* Reanimated layout, not LayoutAnimation: this app runs the New
          Architecture, where LayoutAnimation is a no-op — the row used to
          appear instantly and the "animation" never ran at all. */}
      {open && categories.length > 0 && (
        <Animated.View
          entering={FadeInDown.springify().damping(18).reduceMotion(EXPRESSIVE)}
          exiting={FadeIn.duration(DURATION.micro).reduceMotion(EXPRESSIVE)}
          layout={LinearTransition.springify().damping(18)}
          style={styles.breakdown}
        >
          {/* One ink for every row. Each row already states its own name and
              its own amount, so a hue per category would be a third encoding
              of what the text and the bar length already say — and the palette
              validator could not make five such hues distinguishable on this
              surface anyway. See src/theme/categoryColors.ts. */}
          {categories.map((cat, i) => {
            const share = spendPaise > 0 ? cat.amountPaise / spendPaise : 0;
            const ink = barInk(accent);
            return (
              <Animated.View
                key={cat.name}
                entering={FadeInDown.springify()
                  .damping(18)
                  .delay(i * STAGGER.normal)
                  .reduceMotion(EXPRESSIVE)}
                style={styles.breakdownRow}
              >
                <View style={styles.breakdownHead}>
                  <Text style={styles.breakdownName} numberOfLines={1}>
                    {categoryLabel(cat.name)}
                  </Text>
                  <Text style={styles.breakdownAmount}>
                    {Money.format(cat.amountPaise, { zeroDecimals: true })}
                  </Text>
                </View>
                <View
                  style={[styles.breakdownTrack, { backgroundColor: ink.track }]}
                >
                  <View
                    style={[
                      styles.breakdownFill,
                      {
                        width: `${Math.max(share * 100, 3)}%`,
                        backgroundColor: ink.fill,
                      },
                    ]}
                  />
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
};

/* --------------------------------------------------------------- forecast */

interface ForecastLineProps {
  transactions: readonly AnalysableTransaction[];
  planPaise: number;
  /** Bills still unpaid this cycle — cadence-aware, from `billsSummary`. */
  unpaidBillsPaise: number;
  /** injectable for tests */
  now?: Date;
}

/**
 * Where the month is heading, not just where it stands — the plan bar above
 * answers "how am I doing", this answers "and so what". Framed against the
 * plan rather than a bank balance CoinKeeper cannot see: only a handful of
 * this user's own bank SMS out of over a thousand ever quote one, so a
 * balance figure here would be a guess dressed as a fact.
 *
 * Renders nothing until `projectMonthEnd` has enough of the month to say
 * anything — a one-day extrapolation is noise, not a forecast.
 */
export const ForecastLine: React.FC<ForecastLineProps> = ({
  transactions,
  planPaise,
  unpaidBillsPaise,
  now,
}) => {
  const reduced = useReducedMotion();
  const forecast = projectMonthEnd(transactions, planPaise, unpaidBillsPaise, now ?? new Date());
  if (!forecast) return null;

  const tone = forecast.status === 'over' ? TONE_COLOR.warn : TONE_COLOR.good;
  const message =
    forecast.status === 'under'
      ? `At this pace, you'll finish ${Money.format(forecast.diffPaise, { zeroDecimals: true })} under plan`
      : `At this pace, you'll finish ${Money.format(forecast.diffPaise, { zeroDecimals: true })} over plan`;

  return (
    <Animated.View
      entering={FadeIn.delay(
        sequenceDelay(HOME_SEQUENCE.statusLine, reduced),
      ).reduceMotion(EXPRESSIVE)}
      style={[styles.statusRow, { backgroundColor: `${tone}14`, borderLeftColor: tone }]}
      accessibilityLabel={message}
    >
      <TrendingUp size={16} color={tone} strokeWidth={2.4} />
      <Text style={[styles.statusText, { color: tone }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  storyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  storyItem: {
    flex: 1,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: enamel.card,
  },
  // 11px was below this design system's own caption floor (12–13px) and
  // unreadable at arm's length on a phone. Achievements the user earned should
  // not be the smallest type on the screen.
  storyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Satoshi-Bold',
    color: enamel.textPrimary,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderLeftWidth: 2,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Satoshi-Bold',
  },

  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  kpi: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: enamel.card,
  },
  kpiLabel: {
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: 'Satoshi-Bold',
    color: enamel.textSecondary,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: 'Satoshi-Black',
    color: enamel.textPrimary,
    marginTop: 4,
  },
  kpiCaption: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    color: enamel.textSecondary,
    marginTop: 2,
  },

  planBlock: { marginTop: 20 },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planSpent: {
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    color: enamel.textSecondary,
  },
  planLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planLeft: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  planTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  planFill: { height: 10, borderRadius: 5, overflow: 'hidden' },
  // Inside the track, not straddling it: the track clips its children, and a
  // tick that pokes out of a 10px bar reads as a stray hairline rather than a
  // position on the scale.
  planMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: enamel.textPrimary,
    opacity: 0.85,
  },
  planFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  planFootKey: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planFootTick: {
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: enamel.textPrimary,
    opacity: 0.85,
  },
  planFootText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    color: enamel.textSecondary,
  },
  planFootVerdict: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
  },
  shine: { ...StyleSheet.absoluteFillObject, width: '55%' },

  breakdown: { marginTop: 16, gap: 14 },
  breakdownRow: { gap: 6 },
  breakdownHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  breakdownName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    color: enamel.textPrimary,
  },
  breakdownAmount: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    color: enamel.textPrimary,
  },
  breakdownTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 3 },
});
