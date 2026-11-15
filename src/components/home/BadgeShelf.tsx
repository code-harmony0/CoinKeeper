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
import { useSpecTheme } from '../../theme/specTheme';
import {
  DURATION,
  EXPRESSIVE,
  INFORMATIONAL,
  informationalDuration,
  useReducedMotion,
} from '../../theme/motion';
import type { Badge } from '../../services/badges';
import { Medal } from './Medal';
import { Bezel } from '../shared/Bezel';

const SIZE = 60;
const EASE = Easing.bezier(0.32, 0.72, 0, 1);

export interface ShelfBadge {
  badge: Badge;
  earned: boolean;
}

interface Props {
  badges: ShelfBadge[];
  /** The badge closest to being earned, with how far along it is. */
  next: { label: string; ratio: number; hint: string } | null;
}

/** A soft light sweeps across an earned medal once as the shelf arrives. */
const Shine: React.FC<{ delay: number }> = ({ delay }) => {
  const reduced = useReducedMotion();
  const x = useSharedValue(-SIZE);
  useEffect(() => {
    if (reduced) return;
    x.value = withDelay(
      delay,
      withTiming(SIZE * 1.4, { duration: 1000, easing: EASE }),
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
        easing: EASE,
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
 * The badge ladder as a shelf of medals inside a nested bezel (hairline shell,
 * inner plate with a top highlight). Earned medals catch the light; locked ones
 * keep their silhouette, and one bar says how close the next is.
 */
export const BadgeShelf: React.FC<Props> = ({ badges, next }) => {
  const { colors, isDark } = useSpecTheme();
  return (
    <Bezel tone="paper">
        <View style={styles.row}>
          {badges.map(({ badge, earned }, i) => (
            <Animated.View
              key={badge.id}
              entering={ZoomIn.springify().damping(12).stiffness(170).delay(300 + i * 90).reduceMotion(EXPRESSIVE)}
              style={styles.item}
              accessible
              accessibilityLabel={`${badge.label}, ${earned ? 'earned' : 'locked'}`}
            >
              <View style={styles.medalWrap}>
                <Medal id={badge.id} icon={badge.icon} earned={earned} size={SIZE} dark={isDark} />
                {earned && (
                  <View style={styles.clip} pointerEvents="none">
                    <Shine delay={900 + i * 500} />
                  </View>
                )}
              </View>
              <Text
                style={[styles.label, { color: earned ? colors.textPrimary : colors.textSecondary }]}
                numberOfLines={2}
              >
                {badge.label}
              </Text>
            </Animated.View>
          ))}
        </View>

        {next && (
          <View style={styles.next}>
            <View style={styles.nextHead}>
              <Text style={[styles.nextTitle, { color: colors.textPrimary }]}>Next: {next.label}</Text>
              <Text style={[styles.nextPct, { color: colors.textSecondary }]}>{Math.round(next.ratio * 100)}% there</Text>
            </View>
            <Fill ratio={next.ratio} />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{next.hint}</Text>
          </View>
        )}
    </Bezel>
  );
};

const styles = StyleSheet.create({
  shell: { padding: 6, borderRadius: 32, borderWidth: 1 },
  core: { borderRadius: 26, padding: 16, overflow: 'hidden' },
  sheen: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { width: 58, alignItems: 'center', gap: 6 },
  medalWrap: { width: SIZE, height: SIZE + 6 },
  clip: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' },
  shine: { position: 'absolute', top: -10, width: 12, height: SIZE + 20, backgroundColor: 'rgba(255,255,255,0.6)' },
  label: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold', textAlign: 'center' },
  next: { marginTop: 16, gap: 8 },
  nextHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nextTitle: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  nextPct: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  hint: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
});
