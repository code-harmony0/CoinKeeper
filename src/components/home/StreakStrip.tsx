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
import { Check } from 'lucide-react-native';
import { brand } from '../../theme/specTheme';
import { EXPRESSIVE, useReducedMotion } from '../../theme/motion';
import { FlameBadge } from './FlameBadge';

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
const EASE = Easing.bezier(0.32, 0.72, 0, 1);

/** Today's chip breathes so the one open day is the one you see. */
const TodayChip: React.FC = () => {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000, easing: EASE }), withTiming(0, { duration: 1000, easing: EASE })),
      -1,
    );
  }, [reduced, p]);
  const glow = useAnimatedStyle(() => ({ opacity: 0.15 + p.value * 0.3 }));
  return (
    <View style={[styles.chip, styles.chipToday]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.todayGlow, glow]} />
    </View>
  );
};

const Chip: React.FC<{ state: DayState }> = ({ state }) => {
  if (state === 'today') return <TodayChip />;
  if (state === 'hit') {
    return (
      <View style={[styles.chip, styles.chipHit]}>
        <Check size={18} strokeWidth={2.6} color={brand.ink} />
      </View>
    );
  }
  if (state === 'miss') return <View style={[styles.chip, styles.chipMiss]} />;
  return <View style={[styles.chip, styles.chipFuture]} />;
};

/**
 * The week as a game board, in a nested "bezel": a hairline shell around an
 * inner plate with its own top highlight. The flame is the object; the day
 * chips under it say which days you held the line.
 */
export const StreakStrip: React.FC<Props> = ({ streakDays, days, next }) => {
  const lit = streakDays > 0;
  const toGo = next ? Math.max(next.days - streakDays, 0) : 0;
  return (
    <View style={styles.shell}>
      <View style={styles.core}>
        <View style={styles.sheen} pointerEvents="none" />
        <View style={styles.top}>
          <FlameBadge days={streakDays} />
          <View style={styles.topText}>
            <Text style={styles.title}>{lit ? 'day streak' : 'Light your streak'}</Text>
            <Text style={styles.sub}>
              {next
                ? `${toGo} more ${toGo === 1 ? 'day' : 'days'} under your daily limit unlocks ${next.label}`
                : 'Every day under your limit keeps it alive'}
            </Text>
          </View>
        </View>
        <View
          style={styles.week}
          accessible
          accessibilityLabel={`Last seven days: ${days.filter(d => d.state === 'hit').length} under your limit`}
        >
          {days.map((d, i) => (
            <Animated.View
              key={i}
              entering={ZoomIn.springify().damping(13).stiffness(190).delay(450 + i * 70).reduceMotion(EXPRESSIVE)}
              style={styles.col}
            >
              <Chip state={d.state} />
              <Text style={[styles.dayLabel, d.state === 'today' && { color: WHITE }]}>{d.label}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer shell: hairline + padding; inner plate has a smaller, concentric radius.
  shell: {
    marginTop: 16,
    padding: 6,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  core: {
    borderRadius: 26,
    padding: 16,
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topText: { flex: 1, gap: 4 },
  title: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Black', color: brand.signal },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: MUTED },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 6, flex: 1 },
  dayLabel: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold', color: 'rgba(255,255,255,0.55)' },
  chip: { width: 36, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipHit: { backgroundColor: brand.signal },
  chipToday: { borderWidth: 2, borderColor: brand.signal, overflow: 'hidden' },
  todayGlow: { backgroundColor: brand.signal },
  chipMiss: { backgroundColor: 'rgba(255,255,255,0.09)' },
  chipFuture: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed' },
});
