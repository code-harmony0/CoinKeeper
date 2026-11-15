import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { brand } from '../../theme/specTheme';
import { useReducedMotion } from '../../theme/motion';

const W = 76;
const H = 96;
const EASE = Easing.bezier(0.32, 0.72, 0, 1);

// Outer flame, inner flame, and the number sits low in the inner core.
const OUTER =
  'M38 3 C41 21 62 32 62 58 C62 77 52 92 38 92 C24 92 14 77 14 58 C14 46 21 38 25 32 C26 40 30 45 34 45 C31 30 34 14 38 3 Z';
const INNER =
  'M38 46 C40 56 50 60 50 71 C50 80 45 87 38 87 C31 87 26 80 26 71 C26 63 33 58 38 46 Z';

const Spark: React.FC<{ x: number; delay: number; lit: boolean }> = ({ x, delay, lit }) => {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced || !lit) return;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2200, easing: EASE }), -1, false),
    );
  }, [reduced, lit, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: lit ? (t.value < 0.15 ? t.value / 0.15 : 1 - (t.value - 0.15) / 0.85) * 0.9 : 0,
    transform: [{ translateY: -t.value * 46 }, { translateX: Math.sin(t.value * 6) * 5 }, { scale: 1 - t.value * 0.6 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.spark, { left: x }, style]} />;
};

/**
 * The streak as an object: a layered gradient flame with the day count inside
 * it, a halo that breathes, and sparks drifting up. Unlit (no streak yet) it
 * is a cold ember, so starting one reads as lighting something.
 */
export const FlameBadge: React.FC<{ days: number; scale?: number }> = ({ days, scale = 1 }) => {
  const reduced = useReducedMotion();
  const lit = days > 0;
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced || !lit) return;
    t.value = withRepeat(
      withSequence(withTiming(1, { duration: 900, easing: EASE }), withTiming(0, { duration: 1100, easing: EASE })),
      -1,
    );
  }, [reduced, lit, t]);
  const sway = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + t.value * 0.05 }, { scaleX: 1 - t.value * 0.025 }, { rotate: `${(t.value - 0.5) * 3}deg` }],
  }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.55 + t.value * 0.35, transform: [{ scale: 1 + t.value * 0.08 }] }));

  const body = (
    <View style={styles.wrap} accessible accessibilityLabel={lit ? `${days} day streak` : 'No streak yet'}>
      <Animated.View style={[styles.halo, halo]} pointerEvents="none">
        <Svg width={150} height={150}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="55%" r="50%">
              <Stop offset="0" stopColor="#FF9A1F" stopOpacity={lit ? 0.5 : 0.08} />
              <Stop offset="0.6" stopColor="#FF9A1F" stopOpacity={lit ? 0.12 : 0.02} />
              <Stop offset="1" stopColor="#FF9A1F" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={150} height={150} fill="url(#halo)" />
        </Svg>
      </Animated.View>

      <Spark x={26} delay={0} lit={lit} />
      <Spark x={44} delay={700} lit={lit} />
      <Spark x={36} delay={1400} lit={lit} />

      <Animated.View style={[{ width: W, height: H }, sway]}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="outer" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor={lit ? '#FFD23F' : '#4A4D55'} />
              <Stop offset="0.45" stopColor={lit ? '#FF9A1F' : '#3A3D44'} />
              <Stop offset="1" stopColor={lit ? '#F2461E' : '#2B2D33'} />
            </LinearGradient>
            <LinearGradient id="inner" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor={lit ? '#FFF6C2' : '#5A5D66'} />
              <Stop offset="1" stopColor={lit ? '#FFC83D' : '#41444C'} />
            </LinearGradient>
          </Defs>
          <Ellipse cx={38} cy={93} rx={20} ry={3.2} fill="#000" opacity={0.28} />
          <Path d={OUTER} fill="url(#outer)" />
          <Path d={INNER} fill="url(#inner)" />
          {lit && <Path d="M24 40 C22 46 20 52 20 60" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2.2} strokeLinecap="round" fill="none" />}
        </Svg>
        <Text style={[styles.num, { color: lit ? brand.ink : 'rgba(255,255,255,0.55)' }]}>{days}</Text>
      </Animated.View>
    </View>
  );
  if (scale === 1) return body;
  return (
    <View style={{ width: 100 * scale, height: 112 * scale }}>
      <View style={{ width: 100, height: 112, transform: [{ scale }], transformOrigin: 'top left' }}>{body}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: 100, height: 112, alignItems: 'center', justifyContent: 'flex-end' },
  halo: { position: 'absolute', top: -20, left: -25, width: 150, height: 150 },
  spark: { position: 'absolute', bottom: 40, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFD23F' },
  num: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 52,
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 30,
    fontFamily: 'Satoshi-Black',
    includeFontPadding: false,
  },
});
