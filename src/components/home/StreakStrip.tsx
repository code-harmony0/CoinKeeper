import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { brand, onInk } from '../../theme/specTheme';
import { EXPRESSIVE } from '../../theme/motion';
import { Bezel } from '../shared/Bezel';
import { FlameBadge } from './FlameBadge';

export type DayState = 'hit' | 'miss' | 'today' | 'future' | 'unknown';

export interface StreakDay {
  label: string;
  state: DayState;
}

/** The last seven days as game dots: the streak is the run of days under the
 *  daily limit that ends yesterday; today is still open. */
export const weekDots = (streakDays: number, now: Date = new Date()): StreakDay[] => {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, k) => {
    const ago = 6 - k;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago);
    const label = labels[d.getDay()];
    if (ago === 0) return { label, state: 'today' as const };
    return { label, state: ago <= streakDays ? ('hit' as const) : ('miss' as const) };
  });
};

interface Props {
  streakDays: number;
  days: StreakDay[];
  /** The ONE next goal (same source as the badge shelf), or null. */
  next: { label: string; hint: string } | null;
  /** One-line strip for the first screen; the full card lives in Rewards. */
  compact?: boolean;
}

/** Today's chip is a still ring: the only ambient loops belong to the flame and hero glow. */
const Chip: React.FC<{ state: DayState; small?: boolean }> = ({ state, small }) => {
  const box = small ? styles.chipSm : styles.chip;
  if (state === 'today') return <View style={[box, styles.chipToday]} />;
  if (state === 'hit') {
    return (
      <View style={[box, styles.chipHit]}>
        <Check size={small ? 14 : 18} strokeWidth={2.4} color={brand.ink} />
      </View>
    );
  }
  if (state === 'miss') return <View style={[box, styles.chipMiss]} />;
  return <View style={[box, styles.chipFuture]} />;
};

/**
 * The week as a game board. Compact (first screen): a small flame, "Day N" and
 * the one next goal on a single line, with the seven days as mini chips below.
 * Full (Rewards): the large flame and spaced day chips.
 */
export const StreakStrip: React.FC<Props> = ({ streakDays, days, next, compact }) => {
  const lit = streakDays > 0;
  const hit = days.filter(d => d.state === 'hit').length;

  if (compact) {
    return (
      <Bezel tone="ink" style={styles.compactShell} coreStyle={styles.compactCore} padding={12}>
        <View style={styles.compactRow} accessible accessibilityLabel={`Streak: ${streakDays} days. ${hit} of the last 7 days under your limit.${next ? ` Next: ${next.label}.` : ''}`}>
          <FlameBadge days={streakDays} scale={0.5} />
          <View style={styles.compactText}>
            <Text style={styles.compactTitle}>
              {lit ? `${streakDays}-day streak` : 'Start your streak today'}
            </Text>
            <Text style={styles.compactSub} numberOfLines={1}>
              {next ? `Next: ${next.label}` : 'Stay under your daily limit'}
            </Text>
          </View>
        </View>
      </Bezel>
    );
  }

  return (
    <Bezel tone="ink" solid coreStyle={{ gap: 16 }}>
      <View style={styles.top}>
        <FlameBadge days={streakDays} />
        <View style={styles.topText}>
          <Text style={styles.title}>{lit ? 'day streak' : 'Light your streak'}</Text>
          <Text style={styles.sub}>
            {'Stay under your daily limit to keep it going'}
          </Text>
        </View>
      </View>
      <View style={styles.week} accessible accessibilityLabel={`Last seven days: ${hit} under your limit`}>
        {days.map((d, i) => (
          <Animated.View
            key={i}
            entering={ZoomIn.springify().damping(13).stiffness(190).delay(300 + i * 70).reduceMotion(EXPRESSIVE)}
            style={styles.col}
          >
            <Chip state={d.state} />
            <Text style={[styles.dayLabel, d.state === 'today' && { color: onInk.high }]}>{d.label}</Text>
          </Animated.View>
        ))}
      </View>
    </Bezel>
  );
};

const styles = StyleSheet.create({
  compactShell: { marginTop: 16, borderRadius: 28 },
  compactCore: { borderRadius: 22 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  compactText: { flex: 1, minWidth: 130 },
  compactTitle: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black', color: onInk.high },
  compactSub: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  mini: { flexDirection: 'row', gap: 4, width: '100%', justifyContent: 'space-between', marginTop: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topText: { flex: 1, gap: 4 },
  title: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Black', color: brand.signal },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 6, flex: 1 },
  dayLabel: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold', color: onInk.low },
  chip: { width: 36, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipSm: { flex: 1, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chipHit: { backgroundColor: brand.signal },
  chipToday: { borderWidth: 2, borderColor: brand.signal, backgroundColor: 'rgba(255,196,0,0.18)' },
  chipMiss: { backgroundColor: onInk.fill },
  chipFuture: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed' },
});
