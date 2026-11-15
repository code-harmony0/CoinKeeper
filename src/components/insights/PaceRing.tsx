/**
 * PaceRing — the home hero's gauge.
 *
 * ONE dial, not three rings. It answers one question — "how much can I spend
 * for the rest of today?" — and the arc is that same figure drawn: a fuel
 * gauge that starts full each morning and drains as the day is spent.
 *
 * ## Why the triple ring went
 *
 * Three concentric arcs shipped here and failed on device for reasons a
 * mock-up hides. On an ordinary morning — nothing spent yet, 2% of the month
 * gone — two of the three rings were empty tracks and the third, the least
 * important one (plan ÷ income), was the only arc with any ink in it. Three
 * near-identical grey circles read as moiré, not as a gauge, and the ring the
 * user needed was invisible. It also cost a three-row legend to explain, and a
 * chart that needs a key to survive a glance is not a glance.
 *
 * Worse, two of the three were saying what the panel already says in words
 * lower down: the month ring restated `PlanBar` (spent / left, coloured by the
 * same pace), and the plan ring restated the `MONTHLY PLAN` KPI. The month's
 * pace now lives on `PlanBar` as a marker on a straight track, where "ahead"
 * and "behind" are a comparison of two positions rather than two arcs the eye
 * has to unroll.
 *
 * ## The dial and the number are the same fact
 *
 * The arc draws what is LEFT of today's allowance, and the centre prints that
 * same amount. Ring and number can never disagree, and a full dial at 8am is
 * an honest picture rather than an empty circle that reads as a broken widget.
 *
 * ## The scale is the day
 *
 * Twenty-four ticks ring the dial, one per hour, lit up to the current hour
 * with a brighter tick at now. That is the comparison the daily allowance
 * actually invites — how much of the day is gone against how much of the money
 * is gone — and it gives the mark structure at 0% spent, which an empty ring
 * never has. It replaces the old floating pace tick, which read as a rendering
 * artefact at the ring's right edge.
 *
 * The Skia canvas draws geometry ONLY. Every string is a React Native <Text>
 * layered over the canvas, which keeps type crisp at any density, avoids
 * loading Satoshi into Skia, and leaves the numbers reachable by TalkBack.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { enamel } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import { computePace } from '../../services/budgetPacing';
import { CountUp } from '../anim';
import {
  DURATION,
  EXPRESSIVE,
  HOME_SEQUENCE,
  INFORMATIONAL,
  SPRING,
  informationalDuration,
  sequenceDelay,
  useReducedMotion,
} from '../../theme/motion';

// The gauge is the widest thing in the panel, so it sizes off the screen
// rather than a constant — a fixed 288px dial on a 320dp phone would clip.
const SCREEN_W = Dimensions.get('window').width;
export const RING_SIZE = Math.min(SCREEN_W - 112, 268);

const C = RING_SIZE / 2;
const SCALE = RING_SIZE / 268;

/**
 * An open dial, not a closed ring. The 96° gap at the foot is where the day's
 * spend caption sits — a closed circle would have to put that line outside the
 * mark, buying a whole extra row for a five-word caption.
 */
const GAP_DEG = 96;
const SWEEP_DEG = 360 - GAP_DEG;
const START_ANGLE = 90 + GAP_DEG / 2; // 138° — bottom-left, sweeping clockwise

const STROKE = Math.round(18 * SCALE);
const TICK_R = C - 2;
// The scale needs real air over the arc: at a 9px gap the longer ticks and the
// now-tick grazed the dial's outer edge and read as scratches on it rather
// than as a ring of their own.
const ARC_R = TICK_R - STROKE / 2 - 13;

const rad = (deg: number) => (deg * Math.PI) / 180;
// The lowest ink on the dial, and therefore where the foot caption goes.
const ARC_FOOT_Y = C + Math.sin(rad(START_ANGLE)) * ARC_R;
const CANVAS_H = Math.round(ARC_FOOT_Y + STROKE / 2 + 6);

/** Today's allowance thresholds — the same rule the status line uses. */
const TODAY_WARN = 0.6;

/**
 * The dial's colour ladder, derived once.
 *
 * Green while the day's allowance is mostly intact, amber past 60% of it
 * spent, red once it is gone. `danger` is reserved for actually being over —
 * a gauge that goes red before anything has gone wrong teaches the reader to
 * ignore red.
 */
export const ringTones = (todayUsed: number) => ({
  today:
    todayUsed >= 1
      ? enamel.danger
      : todayUsed < TODAY_WARN
        ? enamel.success
        : enamel.warning,
  todayBright:
    todayUsed >= 1
      ? enamel.dangerBright
      : todayUsed < TODAY_WARN
        ? enamel.successBright
        : enamel.warningBright,
});

/** Share of today's allowance already spent, 0..1+. */
export const todayUsedRatio = (
  safeTodayPaise: number,
  todaySpendPaise: number,
): number =>
  safeTodayPaise > 0
    ? todaySpendPaise / safeTodayPaise
    : todaySpendPaise > 0
      ? 1
      : 0;

/** Fraction of the calendar day elapsed, 0..1 — the tick scale's position. */
export const dayElapsed = (now: Date): number =>
  (now.getHours() * 60 + now.getMinutes()) / 1440;

interface PaceRingProps {
  /** Today's share of what's left in the plan, paise. */
  safeTodayPaise: number;
  /** Expenses logged today, paise. */
  todaySpendPaise: number;
  /** Month-to-date expense total, paise. */
  spendPaise: number;
  /** The month's spending plan, paise. */
  planPaise: number;
  /** This month's income, paise — stated by the KPI pills, not by the dial. */
  incomePaise: number;
  /**
   * Bumped to rewind and redraw the gauge (pull-to-refresh). The dial winds
   * back to empty, then fills in again.
   */
  replayToken?: number;
  /** injectable for tests */
  now?: Date;
}

const arcPathFor = (sweepDeg: number) => {
  'worklet';
  const p = Skia.Path.Make();
  p.addArc(
    { x: C - ARC_R, y: C - ARC_R, width: ARC_R * 2, height: ARC_R * 2 },
    START_ANGLE,
    Math.max(0.01, sweepDeg),
  );
  return p;
};

const fullArc = () => {
  const p = Skia.Path.Make();
  p.addArc(
    { x: C - ARC_R, y: C - ARC_R, width: ARC_R * 2, height: ARC_R * 2 },
    START_ANGLE,
    SWEEP_DEG,
  );
  return p;
};

/**
 * The hour scale. Ticks run clockwise from midnight at the top; `from`/`to`
 * select the elapsed run or the remaining one, so the two can be drawn at
 * different strengths without a second geometry pass.
 */
const tickPath = (from: number, to: number) => {
  const p = Skia.Path.Make();
  for (let h = from; h < to; h++) {
    const a = rad(-90 + h * 15);
    const long = h % 6 === 0;
    const outer = TICK_R;
    const inner = TICK_R - (long ? 8 : 4.5) * SCALE;
    p.moveTo(C + Math.cos(a) * outer, C + Math.sin(a) * outer);
    p.lineTo(C + Math.cos(a) * inner, C + Math.sin(a) * inner);
  }
  return p;
};

const nowTickPath = (elapsed: number) => {
  const p = Skia.Path.Make();
  const a = rad(-90 + elapsed * 360);
  p.moveTo(C + Math.cos(a) * (TICK_R + 2), C + Math.sin(a) * (TICK_R + 2));
  p.lineTo(
    C + Math.cos(a) * (TICK_R - 10 * SCALE),
    C + Math.sin(a) * (TICK_R - 10 * SCALE),
  );
  return p;
};

/** A hero of four characters fits the clear width; longer ones step down. */
const heroFontSize = (text: string): number => {
  const base = text.length <= 6 ? 54 : text.length <= 8 ? 44 : 35;
  return Math.round(base * Math.min(1, SCALE));
};

export const PaceRing: React.FC<PaceRingProps> = ({
  safeTodayPaise,
  todaySpendPaise,
  spendPaise,
  planPaise,
  replayToken = 0,
  now,
}) => {
  const reduced = useReducedMotion();
  const at = useMemo(() => now ?? new Date(), [now]);

  const pace = useMemo(
    () => computePace(spendPaise, planPaise, at),
    [spendPaise, planPaise, at],
  );

  const hasPlan = planPaise > 0;

  // Today's allowance is the denominator. When it is zero (plan exhausted)
  // any spend at all counts as the day being fully gone.
  const todayUsed = todayUsedRatio(safeTodayPaise, todaySpendPaise);
  // The dial draws what is LEFT, which is what the centre number states — so
  // an allowance of ₹0 is an empty dial, never a full one. Without this guard
  // a spent-out day (no allowance, nothing logged yet today) drew a complete
  // arc around a ₹0 hero: the mark and the number contradicting each other.
  const todayLeft =
    safeTodayPaise > 0 ? Math.max(0, 1 - Math.min(1, todayUsed)) : 0;

  const calm = todayUsed < TODAY_WARN;
  const { today: todayTone, todayBright } = ringTones(todayUsed);

  const elapsed = dayElapsed(at);
  const elapsedHours = Math.floor(elapsed * 24);

  const sweep = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const shimmerOpacity = useSharedValue(0);

  // The dial fills, then the number counts. Informational, so it plays
  // regardless of the system flag; under reduce-motion it compresses.
  useEffect(() => {
    const target = todayLeft * SWEEP_DEG;
    const draw = withDelay(
      sequenceDelay(HOME_SEQUENCE.ring, reduced),
      withSpring(target, { ...SPRING.settle, reduceMotion: INFORMATIONAL }),
    );

    // A replay rewinds first, so the redraw reads as the same gesture running
    // again rather than as a value jumping.
    sweep.value =
      replayToken > 0
        ? withSequence(
            withTiming(0, {
              duration: informationalDuration(DURATION.entrance, reduced),
              easing: Easing.in(Easing.cubic),
              reduceMotion: INFORMATIONAL,
            }),
            draw,
          )
        : draw;
  }, [todayLeft, replayToken, reduced, sweep]);

  // Shimmer — a single pass of light along the dial once it has drawn. Purely
  // decorative, so it honours the system flag and never loops.
  useEffect(() => {
    shimmer.value = 0;
    shimmerOpacity.value = 0;
    shimmer.value = withDelay(
      HOME_SEQUENCE.breakdown,
      withTiming(1, {
        duration: DURATION.shimmer,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: EXPRESSIVE,
      }),
    );
    shimmerOpacity.value = withDelay(
      HOME_SEQUENCE.breakdown,
      withSequence(
        withTiming(1, { duration: 200, reduceMotion: EXPRESSIVE }),
        withTiming(0, {
          duration: DURATION.shimmer - 200,
          reduceMotion: EXPRESSIVE,
        }),
      ),
    );
  }, [replayToken, shimmer, shimmerOpacity]);

  // Rate, not hue, is what the breath says. Calm is a slow cycle; anything
  // past 60% of today's allowance halves it. The glow itself stays neutral —
  // a tinted one turned the whole centre muddy at the amber state, and the
  // state is already carried by the arc and the status line.
  useEffect(() => {
    const half = calm ? DURATION.breatheCalm : DURATION.breatheAlert;
    const cycle = (from: number, to: number, sv: typeof glowOpacity) => {
      sv.value = withDelay(
        HOME_SEQUENCE.heroCount,
        withRepeat(
          withSequence(
            withTiming(to, {
              duration: half,
              easing: Easing.inOut(Easing.quad),
              reduceMotion: EXPRESSIVE,
            }),
            withTiming(from, {
              duration: half,
              easing: Easing.inOut(Easing.quad),
              reduceMotion: EXPRESSIVE,
            }),
          ),
          -1,
          false,
          undefined,
          EXPRESSIVE,
        ),
      );
    };

    glowOpacity.value = 0.3;
    glowScale.value = 1;
    cycle(0.3, 0.15, glowOpacity);
    cycle(1, calm ? 1.03 : 1.05, glowScale);
  }, [calm, glowOpacity, glowScale]);

  const track = useMemo(() => fullArc(), []);
  const pastTicks = useMemo(() => tickPath(0, elapsedHours + 1), [elapsedHours]);
  const futureTicks = useMemo(
    () => tickPath(elapsedHours + 1, 24),
    [elapsedHours],
  );
  const nowTick = useMemo(() => nowTickPath(elapsed), [elapsed]);

  const arc = useDerivedValue(() => arcPathFor(sweep.value));
  const glowTransform = useDerivedValue(() => [{ scale: glowScale.value }]);
  const shimmerTransform = useDerivedValue(() => [
    { rotate: shimmer.value * Math.PI * 2 },
  ]);

  const heroText = Money.format(safeTodayPaise, { zeroDecimals: true });
  const heroSize = heroFontSize(heroText);
  const usedText = Money.format(todaySpendPaise, { zeroDecimals: true });

  const label = hasPlan
    ? [
        `${heroText} safe to spend for the rest of today.`,
        `${usedText} spent today.`,
        pace ? `${pace.message}.` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : 'No spending plan set yet';

  // No plan means an empty dial. Drawing the largest object on the screen with
  // nothing in it spends the hero saying "no data" — so with no plan there is
  // no gauge, just the prompt that resolves it.
  if (!hasPlan) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.centreEmpty}>Add income to set a plan</Text>
        <Text style={styles.emptyHint}>
          Your monthly plan, daily allowance and pace all come from what you
          earn.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Canvas style={styles.canvas}>
        {/* The well — a neutral radial step up from the panel ground, so the
            dial sits on a surface catching light rather than floating. It
            stops inside the arc; a well wider than the mark was the muddy
            grey disc the triple ring floated on. */}
        <Circle cx={C} cy={C} r={ARC_R - STROKE / 2}>
          <RadialGradient
            c={vec(C, C)}
            r={ARC_R - STROKE / 2}
            colors={[enamel.card, enamel.wellEdge]}
          />
        </Circle>

        {/* The glow is a light source, not a status: neutral white falling to
            transparent, with the *rhythm* carrying the state. A blurred solid
            over a dark ground is a stain, and a tinted one fights the arc. */}
        <Group transform={glowTransform} origin={vec(C, C)} opacity={glowOpacity}>
          <Circle cx={C} cy={C} r={ARC_R}>
            <RadialGradient
              c={vec(C, C)}
              r={ARC_R}
              colors={[`${enamel.textPrimary}2E`, `${enamel.textPrimary}12`, `${enamel.textPrimary}00`]}
              positions={[0, 0.55, 1]}
            />
          </Circle>
        </Group>

        {/* The hour scale: how much of the day is gone, against how much of
            the money is. Hours already past are lit, the rest are faint. */}
        <Path
          path={futureTicks}
          style="stroke"
          strokeWidth={1.5}
          strokeCap="round"
          color={`${enamel.textPrimary}1F`}
        />
        <Path
          path={pastTicks}
          style="stroke"
          strokeWidth={1.5}
          strokeCap="round"
          color={`${enamel.textPrimary}59`}
        />
        <Path
          path={nowTick}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          color={enamel.textPrimary}
          opacity={0.9}
        />

        {/* The dial's empty track. */}
        <Path
          path={track}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          color={`${enamel.textPrimary}14`}
        />

        {/* The allowance still standing. */}
        <Path
          path={arc}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          color={todayTone}
        >
          <SweepGradient
            c={vec(C, C)}
            colors={[todayTone, todayBright, todayTone]}
          />
        </Path>

        {/* Shimmer — one pass of light around the dial after it draws. A sweep
            gradient transparent everywhere but one short arc, rotated once. */}
        <Group
          transform={shimmerTransform}
          origin={vec(C, C)}
          opacity={shimmerOpacity}
        >
          <Path
            path={track}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
          >
            <SweepGradient
              c={vec(C, C)}
              colors={[
                `${enamel.textPrimary}00`,
                `${enamel.textPrimary}00`,
                `${enamel.textPrimary}80`,
                `${enamel.textPrimary}00`,
                `${enamel.textPrimary}00`,
              ]}
              positions={[0, 0.12, 0.2, 0.28, 1]}
            />
          </Path>
        </Group>
      </Canvas>

      <View style={styles.centre} pointerEvents="none">
        <CountUp
          value={safeTodayPaise}
          isPaise
          prefix="₹"
          delay={HOME_SEQUENCE.heroCount}
          duration={DURATION.count}
          style={[styles.centreValue, { fontSize: heroSize }]}
        />
        <Text style={styles.centreLabel}>Safe to spend today</Text>
      </View>

      {/* The foot of the dial, inside the gap: the day's spend so far. The
          number above it is what's left, so this is the other half of the same
          sentence and belongs inside the same mark. */}
      <View style={styles.foot} pointerEvents="none">
        <View style={[styles.footDot, { backgroundColor: todayTone }]} />
        <Text style={styles.footText}>{usedText} spent today</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: RING_SIZE,
    height: CANVAS_H,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  canvas: { width: RING_SIZE, height: CANVAS_H },
  // Centres on the dial's true centre, not on the cropped canvas, so the hero
  // number sits on the axis the arc is drawn around.
  centre: {
    position: 'absolute',
    top: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreValue: {
    fontFamily: 'Satoshi-Black',
    color: enamel.textPrimary,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  centreLabel: {
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    color: enamel.textSecondary,
    marginTop: 4,
  },
  foot: {
    position: 'absolute',
    top: ARC_FOOT_Y - 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footDot: { width: 6, height: 6, borderRadius: 3 },
  footText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    color: enamel.textSecondary,
  },
  emptyWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  centreEmpty: {
    fontSize: 20,
    fontFamily: 'Satoshi-Bold',
    color: enamel.textPrimary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Satoshi-Regular',
    color: enamel.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default PaceRing;
