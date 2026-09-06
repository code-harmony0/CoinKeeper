/**
 * PaceRing — the home hero's gauge.
 *
 * Three concentric rings, each answering a question at a different time scale,
 * ordered inside-out from the most immediate to the most structural:
 *
 *   inner  — today:  how much of today's allowance is already gone
 *   middle — month:  spend against an even draw-down of the plan, with a marker
 *                    at where an even draw-down would put you right now
 *   outer  — plan:   what share of this month's income the plan claims
 *
 * ## Weight is the hierarchy
 *
 * The rings were once near-identical strokes, and three equal rings are three
 * rings competing rather than one answer with two pieces of context. Weight now
 * carries the ranking: the inner ring is thick and at full strength, the middle
 * ring is half its weight, and the outer ring is a hairline at 40% — present
 * when looked for, silent otherwise.
 *
 * ## The centre is a light source, not a stain
 *
 * The glow behind the hero figure used to be a solid circle under a heavy blur.
 * A blurred solid over a dark ground is mud — an amber one turned the centre
 * olive. It is now a radial gradient falling to fully transparent, which is
 * what light actually does, and it sits over a neutral radial well so nothing
 * tints the ground it lands on.
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
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { enamel, specLight } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import { computePace, type PaceStatus } from '../../services/budgetPacing';
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
// rather than a constant — a 288px ring on a 320dp phone would clip.
const SCREEN_W = Dimensions.get('window').width;
export const RING_SIZE = Math.min(SCREEN_W - 104, 288);

const C = RING_SIZE / 2;
const SCALE = RING_SIZE / 288;

// Weight is the hierarchy: 4 / 8 / 12, thinnest and faintest on the outside.
const OUTER = { r: 138 * SCALE, stroke: 4 * SCALE, opacity: 0.4 };
const MIDDLE = { r: 122 * SCALE, stroke: 8 * SCALE, opacity: 0.85 };
const INNER = { r: 102 * SCALE, stroke: 12 * SCALE, opacity: 1 };

const WELL_R = MIDDLE.r + MIDDLE.stroke;
const START_ANGLE = -90; // 12 o'clock

/** Today's allowance thresholds — the same rule the status line uses. */
const TODAY_WARN = 0.6;

/**
 * The colour of each ring, derived once.
 *
 * The gauge and its legend used to each carry their own copy of this ladder.
 * They agreed, but only by coincidence of two edits staying in step — and a
 * legend that disagrees with the ring it explains is worse than no legend at
 * all, because it is confidently wrong. One function, both consumers, and a
 * test pinning that they match.
 */
export const ringTones = (
  todayUsed: number,
  paceStatus: PaceStatus | undefined,
) => ({
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
        : enamel.warning,
  // Under pace is green, faster than plan is amber, and on pace is a neutral
  // blue — deliberately not green, so "exactly on plan" never reads as a win
  // the plan does not actually claim.
  month:
    paceStatus === 'fast'
      ? enamel.warning
      : paceStatus === 'ahead'
        ? enamel.success
        : specLight.sky,
  plan: enamel.textSecondary,
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

interface PaceRingProps {
  /** Today's share of what's left in the plan, paise. */
  safeTodayPaise: number;
  /** Expenses logged today, paise. */
  todaySpendPaise: number;
  /** Month-to-date expense total, paise. */
  spendPaise: number;
  /** The month's spending plan, paise. */
  planPaise: number;
  /** This month's income, paise — the outer ring's denominator. */
  incomePaise: number;
  /**
   * Bumped to rewind and redraw the gauge (pull-to-refresh). The rings wind
   * back to zero, then draw in again.
   */
  replayToken?: number;
  /** injectable for tests */
  now?: Date;
}

const arcPathFor = (r: number, sweepDeg: number) => {
  'worklet';
  const p = Skia.Path.Make();
  p.addArc(
    { x: C - r, y: C - r, width: r * 2, height: r * 2 },
    START_ANGLE,
    Math.max(0.01, sweepDeg),
  );
  return p;
};

const fullRing = (r: number) => {
  const p = Skia.Path.Make();
  p.addArc({ x: C - r, y: C - r, width: r * 2, height: r * 2 }, START_ANGLE, 360);
  return p;
};

/** A hero of four characters fits the clear width; longer ones step down. */
const heroFontSize = (text: string): number => {
  const base = text.length <= 6 ? 56 : text.length <= 8 ? 46 : 36;
  return Math.round(base * Math.min(1, SCALE));
};

export const PaceRing: React.FC<PaceRingProps> = ({
  safeTodayPaise,
  todaySpendPaise,
  spendPaise,
  planPaise,
  incomePaise,
  replayToken = 0,
  now,
}) => {
  const reduced = useReducedMotion();

  const pace = useMemo(
    () => computePace(spendPaise, planPaise, now ?? new Date()),
    [spendPaise, planPaise, now],
  );

  const hasPlan = planPaise > 0;

  // Today's allowance is the denominator for the inner ring. When today's
  // allowance is zero (plan exhausted) any spend at all is a full ring.
  const todayUsed = todayUsedRatio(safeTodayPaise, todaySpendPaise);

  const monthUsed = hasPlan ? Math.min(1, spendPaise / planPaise) : 0;
  const planShare = incomePaise > 0 ? Math.min(1, planPaise / incomePaise) : 0;

  const calm = todayUsed < TODAY_WARN;
  const tones = ringTones(todayUsed, pace?.status);
  const todayTone = tones.today;
  const todayToneBright = tones.todayBright;
  const paceTone = tones.month;

  const outerSweep = useSharedValue(0);
  const midSweep = useSharedValue(0);
  const innerSweep = useSharedValue(0);
  const markerOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const shimmerOpacity = useSharedValue(0);

  // Draw-on: outer, middle, inner, marker — outside-in, so the eye finishes at
  // the centre where the number is. Informational, so it plays regardless of
  // the system flag; under reduce-motion the whole sequence compresses.
  useEffect(() => {
    const draw = (target: number, at: number) =>
      withDelay(sequenceDelay(at, reduced), withSpring(target, {
        ...SPRING.settle,
        reduceMotion: INFORMATIONAL,
      }));

    // A replay rewinds first, so the redraw reads as the same gesture running
    // again rather than as a value jumping.
    const rewinding = replayToken > 0;
    const wind = (
      sv: typeof outerSweep,
      target: number,
      at: number,
    ) => {
      sv.value = rewinding
        ? withSequence(
            withTiming(0, {
              duration: informationalDuration(DURATION.entrance, reduced),
              easing: Easing.in(Easing.cubic),
              reduceMotion: INFORMATIONAL,
            }),
            draw(target, at),
          )
        : draw(target, at);
    };

    wind(outerSweep, planShare * 360, HOME_SEQUENCE.ringOuter);
    wind(midSweep, monthUsed * 360, HOME_SEQUENCE.ringMiddle);
    wind(innerSweep, Math.min(1, todayUsed) * 360, HOME_SEQUENCE.ringInner);

    markerOpacity.value = withDelay(
      sequenceDelay(HOME_SEQUENCE.heroCount, reduced),
      withTiming(0.75, {
        duration: DURATION.quick,
        reduceMotion: INFORMATIONAL,
      }),
    );
  }, [
    planShare,
    monthUsed,
    todayUsed,
    replayToken,
    reduced,
    outerSweep,
    midSweep,
    innerSweep,
    markerOpacity,
  ]);

  // Shimmer — a single pass of light along the rings once they have drawn.
  // Purely decorative, so it honours the system flag and never loops.
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

  // Rate, not hue, is what the breath says. Calm is a slow 3s cycle; anything
  // past 60% of today's allowance halves it. The glow itself stays neutral —
  // see the canvas below for why tinting it was the wrong signal.
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

  const outerTrack = useMemo(() => fullRing(OUTER.r), []);
  const midTrack = useMemo(() => fullRing(MIDDLE.r), []);
  const innerTrack = useMemo(() => fullRing(INNER.r), []);

  const outerArc = useDerivedValue(() => arcPathFor(OUTER.r, outerSweep.value));
  const midArc = useDerivedValue(() => arcPathFor(MIDDLE.r, midSweep.value));
  const innerArc = useDerivedValue(() => arcPathFor(INNER.r, innerSweep.value));

  const glowTransform = useDerivedValue(() => [{ scale: glowScale.value }]);
  const shimmerTransform = useDerivedValue(() => [
    { rotate: shimmer.value * Math.PI * 2 },
  ]);

  const markerStyle = useAnimatedStyle(() => ({
    opacity: markerOpacity.value,
  }));

  const heroText = Money.format(safeTodayPaise, { zeroDecimals: true });
  const heroSize = heroFontSize(heroText);

  const label = hasPlan
    ? [
        `${heroText} safe to spend today.`,
        pace ? `${pace.message}.` : '',
        planShare > 0
          ? `This month's plan is ${Math.round(planShare * 100)}% of income.`
          : '',
      ]
        .filter(Boolean)
        .join(' ')
    : 'No spending plan set yet';

  // No plan means every ring is empty. Drawing a 288dp triple gauge with
  // nothing in it spends the largest object on the screen saying "no data" —
  // so with no plan there is no gauge, just the prompt that resolves it.
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
            rings sit on a surface catching light rather than floating. */}
        <Circle cx={C} cy={C} r={WELL_R}>
          <RadialGradient
            c={vec(C, C)}
            r={WELL_R}
            colors={[enamel.card, enamel.wellEdge]}
          />
        </Circle>

        {/* The glow is a light source, not a status.
​
            It used to be tinted with the day's state colour, which meant that
            at 91% of today's budget an amber wash sat behind the hero figure
            and fought the amber ring around it — the whole centre read warm and
            muddy. The state was already stated three times over (the inner
            ring, the legend row, the status line), so the glow was a fourth,
            redundant encoding whose only real effect was to dirty the well.
​
            It is now neutral white, and the *rhythm* carries the state instead
            of the hue: a slow 3s breath while calm, a 1.5s one when not. A
            cool neutral centre also lets the coloured rings read at full
            strength against it. */}
        <Group transform={glowTransform} origin={vec(C, C)} opacity={glowOpacity}>
          <Circle cx={C} cy={C} r={INNER.r}>
            <RadialGradient
              c={vec(C, C)}
              r={INNER.r}
              colors={['#FFFFFF2E', '#FFFFFF12', '#FFFFFF00']}
              positions={[0, 0.55, 1]}
            />
          </Circle>
        </Group>

        {/* Outer — plan against income. A hairline; context, not a status. */}
        <Path
          path={outerTrack}
          style="stroke"
          strokeWidth={OUTER.stroke}
          color={`${enamel.textPrimary}14`}
        />
        <Path
          path={outerArc}
          style="stroke"
          strokeWidth={OUTER.stroke}
          strokeCap="round"
          color={enamel.textSecondary}
          opacity={OUTER.opacity}
        />

        {/* Middle — pace through the month. */}
        <Path
          path={midTrack}
          style="stroke"
          strokeWidth={MIDDLE.stroke}
          color={`${enamel.textPrimary}14`}
        />
        <Path
          path={midArc}
          style="stroke"
          strokeWidth={MIDDLE.stroke}
          strokeCap="round"
          color={paceTone}
          opacity={MIDDLE.opacity}
        />

        {/* Inner — today's allowance. The hero ring: thickest, full strength. */}
        <Path
          path={innerTrack}
          style="stroke"
          strokeWidth={INNER.stroke}
          color={`${enamel.textPrimary}14`}
        />
        <Path
          path={innerArc}
          style="stroke"
          strokeWidth={INNER.stroke}
          strokeCap="round"
          color={todayTone}
        >
          <SweepGradient
            c={vec(C, C)}
            colors={[todayTone, todayToneBright, todayTone]}
          />
        </Path>

        {/* Shimmer — one pass of light around the rings after they draw. A
            sweep gradient that is transparent everywhere but one short arc,
            rotated once through 360°. */}
        <Group
          transform={shimmerTransform}
          origin={vec(C, C)}
          opacity={shimmerOpacity}
        >
          {[OUTER, MIDDLE, INNER].map(ring => (
            <Path
              key={ring.r}
              path={fullRing(ring.r)}
              style="stroke"
              strokeWidth={ring.stroke}
              strokeCap="round"
            >
              <SweepGradient
                c={vec(C, C)}
                colors={[
                  '#FFFFFF00',
                  '#FFFFFF00',
                  '#FFFFFF80',
                  '#FFFFFF00',
                  '#FFFFFF00',
                ]}
                positions={[0, 0.12, 0.2, 0.28, 1]}
              />
            </Path>
          ))}
        </Group>
      </Canvas>

      {/* Pace marker — where an even draw-down would put you today. */}
      {pace && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.markerLayer,
            markerStyle,
            { transform: [{ rotate: `${pace.elapsed * 360}deg` }] },
          ]}
        >
          <View
            style={[
              styles.marker,
              {
                height: MIDDLE.stroke + 6,
                marginTop: C - MIDDLE.r - MIDDLE.stroke / 2 - 3,
              },
            ]}
          />
        </Animated.View>
      )}

      <View style={styles.centre} pointerEvents="none">
        {hasPlan ? (
          <>
            <CountUp
              value={safeTodayPaise}
              isPaise
              prefix="₹"
              delay={HOME_SEQUENCE.heroCount}
              duration={DURATION.count}
              style={[styles.centreValue, { fontSize: heroSize }]}
            />
            <Text style={styles.centreLabel}>Safe to spend today</Text>
          </>
        ) : (
          <Text style={styles.centreEmpty}>Add income to set a plan</Text>
        )}
      </View>
    </View>
  );
};

/* ----------------------------------------------------------------- legend */

interface RingLegendProps {
  safeTodayPaise: number;
  todaySpendPaise: number;
  spendPaise: number;
  planPaise: number;
  incomePaise: number;
  now?: Date;
}

/**
 * The key to the three rings.
 *
 * This is not optional chrome. A chart with more than one series always carries
 * a legend, and three unlabelled arcs are three things the reader has to guess
 * at — the ring semantics were written down in DESIGN.md and never put on the
 * screen where the person reading the gauge could see them.
 *
 * Each swatch is drawn at its ring's exact stroke weight and colour, so the key
 * is matched by thickness as well as hue. That matters twice over: it makes the
 * pairing unmistakable, and it means the ring identity does not rest on colour
 * alone, which is what a colour-blind reader needs.
 */
export const RingLegend: React.FC<RingLegendProps> = ({
  safeTodayPaise,
  todaySpendPaise,
  spendPaise,
  planPaise,
  incomePaise,
  now,
}) => {
  const pace = useMemo(
    () => computePace(spendPaise, planPaise, now ?? new Date()),
    [spendPaise, planPaise, now],
  );

  if (planPaise <= 0) return null;

  // Exactly the colours the gauge draws — same function, no second copy of the
  // ladder that could drift out of step with the rings it explains.
  const tones = ringTones(
    todayUsedRatio(safeTodayPaise, todaySpendPaise),
    pace?.status,
  );

  const rows = [
    {
      key: 'today',
      // Weights descend outward, so the legend reads in the same order the eye
      // ranks the rings: the thickest swatch is the ring that matters most.
      weight: INNER.stroke,
      color: tones.today,
      label: 'Today',
      value: `${Money.format(todaySpendPaise, {
        zeroDecimals: true,
      })} of ${Money.format(safeTodayPaise, { zeroDecimals: true })} used`,
    },
    {
      key: 'month',
      weight: MIDDLE.stroke,
      color: tones.month,
      label: 'This month',
      value: `${Math.round(
        Math.min(1, spendPaise / planPaise) * 100,
      )}% of plan spent`,
    },
    {
      key: 'plan',
      weight: OUTER.stroke,
      color: tones.plan,
      label: 'Plan size',
      value:
        incomePaise > 0
          ? `${Math.round((planPaise / incomePaise) * 100)}% of income`
          : 'Set by your income',
    },
  ];

  return (
    <View style={styles.legend}>
      {rows.map(row => (
        <View key={row.key} style={styles.legendRow}>
          <View style={styles.legendSwatchCell}>
            <View
              style={[
                styles.legendSwatch,
                {
                  height: Math.max(3, row.weight),
                  borderRadius: Math.max(3, row.weight) / 2,
                  backgroundColor: row.color,
                },
              ]}
            />
          </View>
          {/* Labels and values wear text tokens, never the series colour —
              the swatch beside them is what carries identity. */}
          <Text style={styles.legendLabel}>{row.label}</Text>
          <Text style={styles.legendValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  canvas: { width: RING_SIZE, height: RING_SIZE },
  markerLayer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    top: 0,
    alignItems: 'center',
  },
  marker: {
    width: 3,
    borderRadius: 2,
    backgroundColor: enamel.textPrimary,
  },
  centre: {
    position: 'absolute',
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
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    color: enamel.textSecondary,
    marginTop: 4,
  },
  emptyWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  centreEmpty: {
    fontSize: 18,
    fontFamily: 'Satoshi-Bold',
    color: enamel.textPrimary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Satoshi-Regular',
    color: enamel.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  legend: { alignSelf: 'stretch', marginTop: 20, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Fixed cell so swatches of different weights still line up on one axis.
  legendSwatchCell: { width: 18, alignItems: 'center' },
  legendSwatch: { width: 18 },
  legendLabel: {
    fontSize: 13,
    fontFamily: 'Satoshi-Bold',
    color: enamel.textPrimary,
    minWidth: 92,
  },
  legendValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    color: enamel.textSecondary,
    textAlign: 'right',
  },
});

export default PaceRing;
