/**
 * The drawn parts of income health — one file, because they are one visual
 * vocabulary shared by the home card and the detail screen, and a score that
 * looks like a battery in one place and a ring in the other would read as two
 * different metrics.
 *
 * The band colours (red ≤30, amber ≤60, green above) are the same in every
 * component here, so a colour learned on the home card still means the same
 * thing on the detail screen.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { NOT_ENOUGH_DATA } from '../../services/income/IncomeAnalyticsService';
import type { IncomeMonth } from '../../services/income/IncomeAnalyticsService';
import type { SpecPalette } from '../../theme/specTheme';
import {
  DURATION,
  EXPRESSIVE,
  INFORMATIONAL,
  SPRING,
  informationalDuration,
  useReducedMotion,
} from '../../theme/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

export const bandColor = (score: number, colors: SpecPalette): string =>
  score <= 30 ? colors.danger : score <= 60 ? colors.warning : colors.success;

/* ------------------------------------------------------------- health bar */

interface HealthBarProps {
  score: number;
  colors: SpecPalette;
  height?: number;
  delay?: number;
}

/**
 * The score as a charge level. The three zones are drawn as a fixed background
 * so the bar shows not just where you are but what "good" would look like —
 * a single fill would leave the user with a length and no scale.
 */
export const HealthBar: React.FC<HealthBarProps> = ({
  score,
  colors,
  height = 14,
  delay = 200,
}) => {
  const width = useSharedValue(0);
  const target = Math.max(0, Math.min(100, score));

  useEffect(() => {
    width.value = withDelay(
      delay,
      withSpring(target, { ...SPRING.settle, reduceMotion: INFORMATIONAL }),
    );
  }, [target, delay, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View
      style={[
        styles.barTrack,
        { height, borderRadius: height / 2, backgroundColor: colors.surfaceSunken },
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: target }}
    >
      {/* Zones — flat tints of the band colours, so the fill reads against the
          scale it belongs to rather than against empty track. */}
      <View style={styles.zones} pointerEvents="none">
        <View style={[styles.zone, { flex: 30, backgroundColor: `${colors.danger}22` }]} />
        <View style={[styles.zone, { flex: 30, backgroundColor: `${colors.warning}22` }]} />
        <View style={[styles.zone, { flex: 40, backgroundColor: `${colors.success}22` }]} />
      </View>
      <AnimatedView
        style={[
          styles.barFill,
          { height, borderRadius: height / 2, backgroundColor: bandColor(target, colors) },
          animatedStyle,
        ]}
      />
    </View>
  );
};

/* -------------------------------------------------------------- arc gauge */

interface ArcGaugeProps {
  score: number;
  colors: SpecPalette;
  size?: number;
  delay?: number;
}

const ARC_STROKE = 6;

/**
 * A semicircle, drawn as a half-length dash on a full circle so the sweep can
 * animate with one number.
 *
 * Two empty states, and they are not the same thing. A pillar with no data
 * (`NOT_ENOUGH_DATA`) draws a **dashed** track — an outline waiting to be
 * filled. A pillar genuinely scoring zero draws a solid track with no fill.
 * Both used to render as the same flat grey arc, which read as a broken
 * component rather than as either honest answer.
 */
export const ArcGauge: React.FC<ArcGaugeProps> = ({
  score,
  colors,
  size = 64,
  delay = 300,
}) => {
  const measured = score !== NOT_ENOUGH_DATA;
  const r = (size - ARC_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const half = circumference / 2;

  const progress = useSharedValue(0);
  const target = measured ? Math.max(0, Math.min(100, score)) / 100 : 0;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(target, { ...SPRING.settle, reduceMotion: INFORMATIONAL }),
    );
  }, [target, delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: half * (1 - progress.value),
  }));

  return (
    <Svg width={size} height={size / 2 + ARC_STROKE} viewBox={`0 0 ${size} ${size / 2 + ARC_STROKE}`}>
      {measured ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceSunken}
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${half} ${circumference}`}
          transform={`rotate(180 ${size / 2} ${size / 2})`}
        />
      ) : (
        /* An explicit semicircle path, not a dashed circle.
​
           Dashing the circle needed `3 4` on top of the `half circumference`
           dash that cuts the circle down to a semicircle — and SVG duplicates
           an odd-length dash array, so `3 4 C` becomes "3 on, 4 off, C on":
           a couple of dashes followed by a long solid run. It rendered as a
           solid arc, which is the exact "looks broken" reading the dashed
           state exists to avoid. */
        <Path
          d={`M ${size / 2 - r},${size / 2} A ${r},${r} 0 0 1 ${
            size / 2 + r
          },${size / 2}`}
          stroke={colors.textSecondary}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
          strokeDasharray="3 5"
        />
      )}
      {measured && (
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={bandColor(score, colors)}
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${half} ${circumference}`}
          transform={`rotate(180 ${size / 2} ${size / 2})`}
          animatedProps={animatedProps}
        />
      )}
    </Svg>
  );
};

/* ------------------------------------------------------------- score ring */

interface ScoreRingProps {
  score: number;
  colors: SpecPalette;
  size?: number;
  children?: React.ReactNode;
}

const RING_STROKE = 14;

/**
 * The detail screen's headline gauge. The track is drawn as three band arcs
 * rather than one grey circle, so the position of the fill is legible against
 * the scale without a legend.
 */
export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  colors,
  size = 150,
  children,
}) => {
  const r = (size - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const measured = score !== NOT_ENOUGH_DATA;

  const progress = useSharedValue(0);
  const target = measured ? Math.max(0, Math.min(100, score)) / 100 : 0;

  useEffect(() => {
    progress.value = withDelay(
      250,
      withSpring(target, { ...SPRING.settle, reduceMotion: INFORMATIONAL }),
    );
  }, [target, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Band arcs: 0–30, 31–60, 61–100 of the circle, with a small gap between.
  const bands = [
    { from: 0, to: 0.3, color: colors.danger },
    { from: 0.3, to: 0.6, color: colors.warning },
    { from: 0.6, to: 1, color: colors.success },
  ];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {bands.map(band => {
          const len = (band.to - band.from) * circumference;
          return (
            <Circle
              key={band.color}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={`${band.color}2E`}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${Math.max(0, len - 4)} ${circumference}`}
              strokeDashoffset={-band.from * circumference}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
        {measured && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={bandColor(score, colors)}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            animatedProps={animatedProps}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCentre]}>{children}</View>
    </View>
  );
};

/* -------------------------------------------------------------- sparkline */

interface SparklineProps {
  months: IncomeMonth[];
  colors: SpecPalette;
  width: number;
  height?: number;
}

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

/**
 * Six months of income: gradient area, stroke, average rule, and a dot per
 * month. Deliberately unlabelled — the card's job is to make volatility
 * visible at a glance, and the detail screen's chart is where numbers live.
 *
 * It was previously a bare polyline on white, which reads as a wireframe: no
 * fill to give the shape body, no dots to say where a month is, and no
 * reference line to say whether any of it is good. The line draws itself
 * left-to-right, then the dots arrive.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  months,
  colors,
  width,
  height = 52,
}) => {
  const reduced = useReducedMotion();
  const draw = useSharedValue(0);
  const dots = useSharedValue(0);

  useEffect(() => {
    // The line is the data, so it draws regardless of the system flag.
    draw.value = withDelay(
      200,
      withTiming(1, {
        duration: informationalDuration(DURATION.draw, reduced),
        easing: Easing.out(Easing.cubic),
        reduceMotion: INFORMATIONAL,
      }),
    );
    dots.value = withDelay(
      200 + informationalDuration(DURATION.draw, reduced),
      withTiming(1, { duration: DURATION.quick, reduceMotion: EXPRESSIVE }),
    );
  }, [draw, dots, reduced, months]);

  const values = months.map(m => m.totalPaise);
  const max = Math.max(...values, 1);
  const average = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
  const step = width / Math.max(1, months.length - 1);
  const y = (v: number) => height - 6 - (v / max) * (height - 14);

  // Total stroke length is bounded by the bounding box perimeter; using it as
  // the dash length lets one number reveal the whole path.
  const strokeLen = width + height * months.length;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeLen * (1 - draw.value),
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dots.value }));

  if (months.length < 2) return null;

  const coords = months.map((m, i) => ({ x: i * step, y: y(m.totalPaise) }));
  const points = coords.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M0,${height} L${coords
    .map(p => `${p.x},${p.y}`)
    .join(' L')} L${width},${height} Z`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primaryAccent} stopOpacity="0.20" />
            <Stop offset="1" stopColor={colors.primaryAccent} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Path d={area} fill="url(#sparkFill)" />

        {/* Average — without a reference line a sparkline shows shape but not
            whether any month was actually good. */}
        <Line
          x1={0}
          y1={y(average)}
          x2={width}
          y2={y(average)}
          stroke={colors.textSecondary}
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.6}
        />

        <AnimatedPolyline
          points={points}
          fill="none"
          stroke={colors.primaryAccent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeLen}
          animatedProps={animatedProps}
        />
      </Svg>

      {/* Dots are an RN layer so they can fade in as a group after the draw,
          without a second animated SVG prop per point. */}
      <AnimatedView
        style={[StyleSheet.absoluteFill, dotStyle]}
        pointerEvents="none"
      >
        <Svg width={width} height={height}>
          {coords.map((p, i) => (
            <Circle
              key={months[i].key}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={colors.primaryAccent}
              stroke={colors.card}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      </AnimatedView>
    </View>
  );
};

/* ------------------------------------------------------------------ donut */

interface DonutProps {
  slices: Array<{ name: string; totalPaise: number }>;
  /** Slice inks, cycled in order — the accent rotation from DESIGN.md §2. */
  palette: string[];
  size?: number;
  children?: React.ReactNode;
}

const DONUT_STROKE = 22;

export const Donut: React.FC<DonutProps> = ({
  slices,
  palette,
  size = 160,
  children,
}) => {
  const r = (size - DONUT_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.totalPaise, 0);

  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withDelay(
      250,
      withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
        reduceMotion: INFORMATIONAL,
      }),
    );
  }, [sweep]);

  if (total <= 0) return null;

  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {slices.map((slice, i) => {
          const share = slice.totalPaise / total;
          const start = offset;
          offset += share;
          return (
            <DonutArc
              key={slice.name}
              cx={size / 2}
              cy={size / 2}
              r={r}
              circumference={circumference}
              color={palette[i % palette.length]}
              share={share}
              start={start}
              sweep={sweep}
            />
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCentre]}>{children}</View>
    </View>
  );
};

const DonutArc: React.FC<{
  cx: number;
  cy: number;
  r: number;
  circumference: number;
  color: string;
  share: number;
  start: number;
  sweep: { value: number };
}> = ({ cx, cy, r, circumference, color, share, start, sweep }) => {
  const animatedProps = useAnimatedProps(() => {
    const len = share * circumference * sweep.value;
    return {
      strokeDasharray: `${Math.max(0, len - 3)} ${circumference}`,
      strokeDashoffset: -start * circumference * sweep.value,
    };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={color}
      strokeWidth={DONUT_STROKE}
      fill="none"
      transform={`rotate(-90 ${cx} ${cy})`}
      animatedProps={animatedProps}
    />
  );
};

/* ------------------------------------------------------------------ score */

export const ScoreText: React.FC<{
  score: number;
  colors: SpecPalette;
  size?: number;
}> = ({ score, colors, size = 48 }) => (
  <View style={styles.scoreRow}>
    <Text
      style={[
        styles.scoreValue,
        { fontSize: size, color: bandColor(score, colors) },
      ]}
    >
      {score === NOT_ENOUGH_DATA ? '—' : score}
    </Text>
    <Text
      style={[
        styles.scoreMax,
        { fontSize: Math.round(size * 0.33), color: colors.textSecondary },
      ]}
    >
      /100
    </Text>
  </View>
);

const styles = StyleSheet.create({
  barTrack: { width: '100%', overflow: 'hidden' },
  zones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  zone: { height: '100%' },
  barFill: { position: 'absolute', left: 0, top: 0 },
  ringCentre: { alignItems: 'center', justifyContent: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  scoreValue: { fontFamily: 'Satoshi-Black', letterSpacing: -1 },
  scoreMax: { fontFamily: 'Satoshi-Medium' },
});
