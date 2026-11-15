import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { brand } from '../../theme/specTheme';
import {
  DURATION,
  EXPRESSIVE,
  INFORMATIONAL,
  informationalDuration,
  useReducedMotion,
} from '../../theme/motion';
import { Money } from '../../utils/money';
import type { Transaction } from '../../types/transaction';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DRAW_DELAY = 250;

interface Props {
  /** This month's expenses. */
  expenses: Transaction[];
  /** The month's plan in paise; 0 hides the pace line. */
  planPaise: number;
  width: number;
  height?: number;
  /** Bumped on pull-to-refresh to redraw. */
  replayToken?: number;
}

const PAD_X = 24;
const PAD_TOP = 32;
const PAD_BOTTOM = 8;
const BOX = 280;
const HOLD_MS = 1800;

/**
 * The month's pace at a glance: cumulative spend against the straight-line
 * pace that would spend the plan exactly by month end. A tag at today says
 * under or over in words. Drag a finger along it to read any day (with a light
 * tick per day); the line draws itself in on arrival.
 */
export const PaceChart: React.FC<Props> = ({
  expenses,
  planPaise,
  width,
  height = 116,
  replayToken = 0,
}) => {
  const reduced = useReducedMotion();
  const draw = useSharedValue(0);
  // Arrival beats after the line finishes: the dot pops, a ring ripples out once, the tag fades in.
  const pop = useSharedValue(0);
  const ripple = useSharedValue(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [hinted, setHinted] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDay = useRef<number | null>(null);

  const geo = useMemo(() => {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = now.getDate();
    const perDay = new Array<number>(today).fill(0);
    for (const t of expenses) {
      const d = new Date(t.date).getDate();
      if (d >= 1 && d <= today) perDay[d - 1] += t.amountPaise;
    }
    const cum: number[] = [];
    perDay.reduce((acc, v, i) => ((cum[i] = acc + v), acc + v), 0);
    const spent = cum[today - 1] ?? 0;
    const yMax = Math.max(planPaise, spent, 1) * 1.06;
    const innerW = width - PAD_X * 2;
    const innerH = height - PAD_TOP - PAD_BOTTOM;
    const x = (day: number) => PAD_X + ((day - 1) / Math.max(days - 1, 1)) * innerW;
    const y = (v: number) => PAD_TOP + innerH - (v / yMax) * innerH;

    const pts = cum.map((v, i) => [x(i + 1), y(v)] as const);
    const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ');
    const base = height - PAD_BOTTOM;
    const area = `${line} L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z`;
    let length = 0;
    for (let i = 1; i < pts.length; i++) {
      length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    const month = now.toLocaleString('en-IN', { month: 'short' });
    const ideal = planPaise > 0 ? (planPaise * today) / days : 0;
    return {
      days,
      today,
      cum,
      pts,
      line,
      area,
      length: Math.max(length, 1),
      ideal: planPaise > 0 ? `M${x(1)},${y(planPaise / days)} L${x(days)},${y(planPaise)}` : null,
      end: pts[pts.length - 1],
      diff: planPaise > 0 ? ideal - spent : 0,
      hasPlan: planPaise > 0,
      month,
      innerW,
    };
  }, [expenses, planPaise, width, height]);

  useEffect(() => {
    const dur = informationalDuration(DURATION.fill * 2, reduced);
    const ease = Easing.bezier(0.32, 0.72, 0, 1);
    draw.value = 0;
    pop.value = 0;
    ripple.value = 0;
    draw.value = withDelay(
      DRAW_DELAY,
      withTiming(1, { duration: dur, easing: ease, reduceMotion: INFORMATIONAL }),
    );
    pop.value = withDelay(
      DRAW_DELAY + dur * 0.85,
      withTiming(1, { duration: 360, easing: ease, reduceMotion: INFORMATIONAL }),
    );
    ripple.value = withDelay(
      DRAW_DELAY + dur * 0.95,
      withTiming(1, { duration: 900, easing: ease, reduceMotion: EXPRESSIVE }),
    );
  }, [replayToken, reduced, draw, pop, ripple, geo.line]);

  // Dragging sideways scrubs the month. Vertical drags still scroll the page:
  // the chart only claims a touch once it is clearly horizontal.
  // The responder is created once, so it reads geometry through a ref.
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const dayAt = (pageX: number) => {
    const g = geoRef.current;
    const raw = Math.round(((pageX - PAD_X) / g.innerW) * (g.days - 1)) + 1;
    return Math.min(Math.max(raw, 1), g.today);
  };
  const setDay = (d: number) => {
    if (lastDay.current !== d) {
      lastDay.current = d;
      ReactNativeHapticFeedback.trigger('impactLight');
    }
    setScrub(d);
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: e => {
        if (hold.current) clearTimeout(hold.current);
        setHinted(true);
        setDay(dayAt(e.nativeEvent.pageX));
      },
      onPanResponderMove: e => setDay(dayAt(e.nativeEvent.pageX)),
      onPanResponderRelease: () => {
        hold.current = setTimeout(() => {
          lastDay.current = null;
          setScrub(null);
        }, HOLD_MS);
      },
    }),
  ).current;
  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current);
    },
    [],
  );

  const ahead = geo.diff >= 0;
  const weekTicks = [8, 15, 22, 29]
    .filter(d => d <= geo.days)
    .map(d => PAD_X + ((d - 1) / Math.max(geo.days - 1, 1)) * geo.innerW);
  const tone = brand.signal;
  const faint = 'rgba(255,255,255,0.5)';

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: geo.length * (1 - draw.value),
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: draw.value }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ translateY: (1 - pop.value) * 6 }],
  }));
  const dotProps = useAnimatedProps(() => ({ r: 5 * pop.value }));
  const haloProps = useAnimatedProps(() => ({ r: 9 * pop.value }));
  const rippleProps = useAnimatedProps(() => ({
    r: 9 + 16 * ripple.value,
    strokeOpacity: ripple.value > 0 ? 0.5 * (1 - ripple.value) : 0,
  }));

  const scrubbing = scrub !== null;
  const dot = scrubbing ? geo.pts[scrub! - 1] : geo.end;
  const spentAt = scrubbing ? geo.cum[scrub! - 1] : 0;
  const tag = scrubbing
    ? `${scrub} ${geo.month} · ${Money.format(spentAt, { zeroDecimals: true })} spent`
    : geo.hasPlan
    ? `${Money.format(Math.abs(Math.round(geo.diff)), { zeroDecimals: true })} ${
        ahead ? 'less spent than planned' : 'more spent than planned'
      }`
    : null;
  const tagTop = Math.max(2, dot[1] - 42);
  const tagLeft = Math.min(Math.max(dot[0] - BOX / 2, 0), width - BOX);

  return (
    <View
      {...pan.panHandlers}
      style={{ width, height }}
      accessible
      accessibilityLabel={
        tag ? `Month pace: ${tag}. Drag sideways to read each day.` : 'Month spending'
      }
    >
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tone} stopOpacity={0.22} />
              <Stop offset="1" stopColor={tone} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={geo.area} fill="url(#area)" />
        </Svg>
      </Animated.View>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Line
          x1={PAD_X}
          x2={width - PAD_X}
          y1={height - PAD_BOTTOM}
          y2={height - PAD_BOTTOM}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={1}
        />
        {weekTicks.map(t => (
          <Line
            key={t}
            x1={t}
            x2={t}
            y1={height - PAD_BOTTOM - 6}
            y2={height - PAD_BOTTOM}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1}
          />
        ))}
        {geo.ideal && (
          <Path
            d={geo.ideal}
            stroke={faint}
            strokeWidth={1.5}
            strokeDasharray="4 5"
            fill="none"
          />
        )}
        <AnimatedPath
          d={geo.line}
          stroke={tone}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${geo.length} ${geo.length}`}
          animatedProps={lineProps}
        />
      </Svg>
      <View style={[styles.ends, { width }]} pointerEvents="none">
        <Text style={styles.endText} numberOfLines={1}>{`1 ${geo.month}`}</Text>
        {!hinted && <Text style={[styles.endText, styles.hint]}>Drag to explore</Text>}
        <Text style={styles.endText} numberOfLines={1}>{`${geo.days} ${geo.month}`}</Text>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} pointerEvents="none">
        <Svg width={width} height={height}>
          {scrubbing && (
            <Line
              x1={dot[0]}
              x2={dot[0]}
              y1={PAD_TOP - 4}
              y2={height - PAD_BOTTOM}
              stroke={faint}
              strokeWidth={1}
            />
          )}
          {!scrubbing && (
            <AnimatedCircle cx={dot[0]} cy={dot[1]} fill="none" stroke={tone} strokeWidth={2} animatedProps={rippleProps} />
          )}
          <AnimatedCircle cx={dot[0]} cy={dot[1]} fill={tone} fillOpacity={0.18} animatedProps={haloProps} />
          <AnimatedCircle cx={dot[0]} cy={dot[1]} fill={brand.ink} stroke={tone} strokeWidth={3} animatedProps={dotProps} />
        </Svg>
        {tag && (
          <Animated.View style={[styles.tagBox, { left: tagLeft, top: tagTop, width: BOX }, tagStyle]}>
            <View
              style={[
                styles.tag,
                ahead || scrubbing
                  ? { backgroundColor: brand.signal }
                  : { borderColor: brand.signal, borderWidth: 2 },
              ]}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
                style={[styles.tagText, { color: ahead || scrubbing ? brand.ink : brand.signal }]}
              >
                {tag}
              </Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  ends: {
    position: 'absolute',
    bottom: -20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD_X - 4,
  },
  endText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Satoshi-Medium',
    color: 'rgba(255,255,255,0.7)',
    flexShrink: 0,
  },
  hint: { color: 'rgba(255,255,255,0.58)' },
  tagBox: { position: 'absolute', alignItems: 'center' },
  tag: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold' },
});
