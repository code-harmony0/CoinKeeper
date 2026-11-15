import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import {
  DURATION,
  INFORMATIONAL,
  informationalDuration,
  useReducedMotion,
} from '../../theme/motion';
import { Money } from '../../utils/money';
import type { Transaction } from '../../types/transaction';

const AnimatedPath = Animated.createAnimatedComponent(Path);

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
const PAD_TOP = 36;
const PAD_BOTTOM = 8;

/**
 * The month's pace at a glance: cumulative spend against the straight-line
 * pace that would spend the plan exactly by month end. Under the line is
 * ahead, over it is behind, and a tag at today says so in words, so the
 * verdict never rests on colour alone. The line draws itself in.
 */
export const PaceChart: React.FC<Props> = ({
  expenses,
  planPaise,
  width,
  height = 152,
  replayToken = 0,
}) => {
  const { colors } = useSpecTheme();
  const reduced = useReducedMotion();
  const draw = useSharedValue(0);

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
    const ideal = planPaise > 0 ? (planPaise * today) / days : 0;
    return {
      line,
      area,
      length: Math.max(length, 1),
      ideal: planPaise > 0 ? `M${x(1)},${y(planPaise / days)} L${x(days)},${y(planPaise)}` : null,
      end: pts[pts.length - 1],
      diff: planPaise > 0 ? ideal - spent : 0,
      hasPlan: planPaise > 0,
    };
  }, [expenses, planPaise, width, height]);

  useEffect(() => {
    draw.value = 0;
    draw.value = withDelay(
      250,
      withTiming(1, {
        duration: informationalDuration(DURATION.fill * 2, reduced),
        easing: Easing.out(Easing.cubic),
        reduceMotion: INFORMATIONAL,
      }),
    );
  }, [replayToken, reduced, draw, geo.line]);

  const ahead = geo.diff >= 0;
  // Deep tones, not the bright status greens: the line must hold 3:1 on the canvas.
  const tone = geo.hasPlan ? (ahead ? colors.mintDeep : colors.danger) : colors.textPrimary;
  const tagBg = ahead ? colors.mint : colors.peach;
  const tagInk = ahead ? colors.mintDeep : colors.peachDeep;

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: geo.length * (1 - draw.value),
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: draw.value }));

  const tag = geo.hasPlan
    ? `${Money.format(Math.abs(Math.round(geo.diff)), { zeroDecimals: true })} ${
        ahead ? 'under' : 'over'
      } pace`
    : null;
  // The tag sizes itself (text scales with the system font); a wide centred
  // box follows the dot and is clamped inside the chart.
  const BOX = 240;
  const tagTop = Math.max(4, geo.end[1] - 40);
  const tagLeft = Math.min(Math.max(geo.end[0] - BOX / 2, 0), width - BOX);

  return (
    <View style={{ width, height }} accessible accessibilityLabel={tag ? `Month pace: ${tag}` : 'Month spending'}>
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
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
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {geo.ideal && (
          <Path
            d={geo.ideal}
            stroke={colors.textSecondary}
            strokeOpacity={0.55}
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
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} pointerEvents="none">
        <Svg width={width} height={height}>
          <Circle cx={geo.end[0]} cy={geo.end[1]} r={9} fill={tone} fillOpacity={0.18} />
          <Circle cx={geo.end[0]} cy={geo.end[1]} r={5} fill={colors.card} stroke={tone} strokeWidth={3} />
        </Svg>
        {tag && (
          <View style={[styles.tagBox, { left: tagLeft, top: tagTop, width: BOX }]} pointerEvents="none">
            <View style={[styles.tag, { backgroundColor: tagBg }]}>
              <Text style={[styles.tagText, { color: tagInk }]}>{tag}</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
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
