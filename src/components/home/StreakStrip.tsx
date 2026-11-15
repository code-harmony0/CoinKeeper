import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { Check, Flame } from 'lucide-react-native';
import { brand } from '../../theme/specTheme';
import { EXPRESSIVE, useReducedMotion } from '../../theme/motion';

export type DayState = 'hit' | 'miss' | 'today' | 'future' | 'unknown';

export interface StreakDay {
  label: string;
  state: DayState;
}

interface Props {
  streakDays: number;
  days: StreakDay[];
  /** The next streak badge, e.g. { days: 5, label: 'Budget Master' }. */
  next: { days: number; label: string } | null;
}

const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';

/** The flame breathes: a slow scale and sway, still under reduce-motion. */
const LiveFlame: React.FC<{ lit: boolean }> = ({ lit }) => {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced || !lit) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reduced, lit, t]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + t.value * 0.12 },
      { rotate: `${(t.value - 0.5) * 8}deg` },
    ],
  }));
  return (
    <Animated.View style={style}>
      <Flame
        size={30}
        strokeWidth={2.2}
        color={lit ? brand.signal : 'rgba(255,255,255,0.4)'}
        fill={lit ? brand.signal : 'transparent'}
      />
    </Animated.View>
  );
};

/** Today's dot pulses so the one thing still open is the thing you see. */
const TodayDot: React.FC = () => {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reduced, p]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 - p.value * 0.45,
    transform: [{ scale: 1 + p.value * 0.35 }],
  }));
  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.pulse, ring]} />
      <View style={[styles.dot, styles.dotToday]} />
    </View>
  );
};

const Dot: React.FC<{ state: DayState }> = ({ state }) => {
  if (state === 'today') return <TodayDot />;
  if (state === 'hit') {
    return (
      <View style={[styles.dot, styles.dotHit]}>
        <Check size={16} strokeWidth={3.2} color={brand.ink} />
      </View>
    );
  }
  if (state === 'miss') return <View style={[styles.dot, styles.dotMiss]} />;
  return <View style={[styles.dot, styles.dotFuture]} />;
};

/**
 * The week as a game board: how many days in a row you stayed under your daily
 * limit, the last seven days as dots, and how far the next badge is.
 */
export const StreakStrip: React.FC<Props> = ({ streakDays, days, next }) => {
  const lit = streakDays > 0;
  const toGo = next ? Math.max(next.days - streakDays, 0) : 0;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <LiveFlame lit={lit} />
        <View style={styles.topText}>
          <Text style={styles.title}>
            {lit ? `${streakDays}-day streak` : 'Start a streak today'}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {next
              ? `${toGo} more ${toGo === 1 ? 'day' : 'days'} under your daily limit unlocks ${next.label}`
              : 'Every day under your limit keeps it alive'}
          </Text>
        </View>
      </View>
      <View style={styles.week} accessible accessibilityLabel={`Last seven days: ${days.filter(d => d.state === 'hit').length} under your limit`}>
        {days.map((d, i) => (
          <Animated.View
            key={i}
            entering={ZoomIn.springify()
              .damping(12)
              .stiffness(180)
              .delay(450 + i * 70)
              .reduceMotion(EXPRESSIVE)}
            style={styles.col}
          >
            <Dot state={d.state} />
            <Text style={[styles.dayLabel, d.state === 'today' && { color: WHITE }]}>{d.label}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const DOT = 32;
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 16,
    marginTop: 16,
    gap: 16,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topText: { flex: 1 },
  title: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black', color: WHITE },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: MUTED },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 6 },
  dayLabel: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold', color: 'rgba(255,255,255,0.55)' },
  dotWrap: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: brand.signal },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotHit: { backgroundColor: brand.signal },
  dotToday: { borderWidth: 3, borderColor: brand.signal, backgroundColor: 'transparent' },
  dotMiss: { backgroundColor: 'rgba(255,255,255,0.14)' },
  dotFuture: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', borderStyle: 'dashed' },
});
