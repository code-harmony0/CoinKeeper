import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { Flame, Lock, Medal, PiggyBank, Target, Trophy, type LucideIcon } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';
import {
  DURATION,
  EXPRESSIVE,
  INFORMATIONAL,
  informationalDuration,
  useReducedMotion,
} from '../../theme/motion';
import type { Badge } from '../../services/badges';

const ICONS: Record<Badge['icon'], LucideIcon> = { Flame, Trophy, Medal, PiggyBank, Target };
const SIZE = 56;

export interface ShelfBadge {
  badge: Badge;
  earned: boolean;
}

interface Props {
  badges: ShelfBadge[];
  /** The badge closest to being earned, with how far along it is. */
  next: { label: string; ratio: number; hint: string } | null;
}

/** A soft light sweeps across an earned medal every few seconds. */
const Shine: React.FC<{ delay: number }> = ({ delay }) => {
  const reduced = useReducedMotion();
  const x = useSharedValue(-SIZE);
  useEffect(() => {
    if (reduced) return;
    x.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(SIZE * 1.4, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
          withTiming(-SIZE, { duration: 0 }),
          withDelay(3200, withTiming(-SIZE, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [reduced, delay, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '20deg' }] }));
  return <Animated.View pointerEvents="none" style={[styles.shine, style]} />;
};

const Fill: React.FC<{ ratio: number }> = ({ ratio }) => {
  const { colors } = useSpecTheme();
  const reduced = useReducedMotion();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(
      500,
      withTiming(Math.min(Math.max(ratio, 0.04), 1) * 100, {
        duration: informationalDuration(DURATION.fill * 2, reduced),
        easing: Easing.out(Easing.cubic),
        reduceMotion: INFORMATIONAL,
      }),
    );
  }, [ratio, reduced, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={[styles.track, { backgroundColor: colors.border }]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.textPrimary }, style]} />
    </View>
  );
};

/**
 * The badge ladder as a shelf of medals: earned ones are yellow and catch the
 * light, locked ones show a lock, and one bar says how close the next is.
 */
export const BadgeShelf: React.FC<Props> = ({ badges, next }) => {
  const { colors, isDark } = useSpecTheme();
  return (
    <View>
      <View style={styles.row}>
        {badges.map(({ badge, earned }, i) => {
          const Icon = earned ? ICONS[badge.icon] : Lock;
          return (
            <Animated.View
              key={badge.id}
              entering={ZoomIn.springify()
                .damping(11)
                .stiffness(170)
                .delay(300 + i * 90)
                .reduceMotion(EXPRESSIVE)}
              style={styles.item}
              accessible
              accessibilityLabel={`${badge.label}, ${earned ? 'earned' : 'locked'}`}
            >
              <View
                style={[
                  styles.medal,
                  earned
                    ? { backgroundColor: brand.signal }
                    : { backgroundColor: isDark ? colors.chipBg : colors.border },
                ]}
              >
                <Icon
                  size={earned ? 26 : 22}
                  strokeWidth={earned ? 2.4 : 2.2}
                  color={earned ? brand.ink : colors.textSecondary}
                />
                {earned && <Shine delay={900 + i * 500} />}
              </View>
              <Text
                style={[styles.label, { color: earned ? colors.textPrimary : colors.textSecondary }]}
                numberOfLines={2}
              >
                {badge.label}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      {next && (
        <View style={styles.next}>
          <View style={styles.nextHead}>
            <Text style={[styles.nextTitle, { color: colors.textPrimary }]}>Next: {next.label}</Text>
            <Text style={[styles.nextPct, { color: colors.textSecondary }]}>{Math.round(next.ratio * 100)}%</Text>
          </View>
          <Fill ratio={next.ratio} />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{next.hint}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { width: 62, alignItems: 'center', gap: 6 },
  medal: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -10,
    width: 14,
    height: SIZE + 20,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  label: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold', textAlign: 'center' },
  next: { marginTop: 16, gap: 8 },
  nextHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nextTitle: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  nextPct: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  hint: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
});
