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
import type { LucideIcon } from 'lucide-react-native';
import { enamel, specDark } from '../../theme/specTheme';
import { EXPRESSIVE, STAGGER, useReducedMotion } from '../../theme/motion';
import { PressableScale } from '../anim';
import { RING_SIZE } from '../insights/PaceRing';

export type OrbitTint = 'peach' | 'mint' | 'lavender' | 'sky';

export interface OrbitItem {
  id: string;
  /** Spoken name; the face shows only the value, so this carries the meaning. */
  label: string;
  /** One live figure: "2 due", "47%", "35". */
  value: string;
  icon: LucideIcon;
  tint: OrbitTint;
  /** Something needs attention: shows a dot. */
  urgent?: boolean;
  onPress: () => void;
}

const SIZE = 56;
const LABEL_H = 20;
// Short faces for the visible caption; `label` stays the full spoken name.
const CAPTION: Record<string, string> = { bills: 'Bills', goals: 'Goals', income: 'Income', insights: 'Insights' };
const PAD_X = 24;
const PAD_Y = 16;
const DRIFT = 3;

// Corners around the open dial: top-left, top-right, bottom-left, bottom-right.
const CORNERS = [
  { left: 0, top: 0 },
  { right: 0, top: 0 },
  { left: 0, bottom: 0 },
  { right: 0, bottom: 0 },
] as const;

const Satellite: React.FC<{ item: OrbitItem; index: number }> = ({
  item,
  index,
}) => {
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);

  // Each satellite breathes on its own phase, so the dial feels alive without
  // the four ever moving in unison. Reduce-motion gets a still dial.
  useEffect(() => {
    if (reduced) return;
    drift.value = withDelay(
      index * 450,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [reduced, index, drift]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * DRIFT }],
  }));

  const Icon = item.icon;
  const fill = specDark[item.tint];
  const ink = specDark[`${item.tint}Deep` as const];

  return (
    <Animated.View
      entering={ZoomIn.springify()
        .damping(13)
        .stiffness(160)
        .delay(350 + index * STAGGER.normal)
        .reduceMotion(EXPRESSIVE)}
      style={[styles.slot, CORNERS[index]]}
    >
      <Animated.View style={[driftStyle, styles.stack]}>
        <PressableScale
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={[styles.satellite, { backgroundColor: fill, borderColor: `${ink}40` }]}
        >
          <Icon size={16} color={ink} strokeWidth={2.2} />
          <Text style={[styles.value, { color: enamel.textPrimary }]} numberOfLines={1}>
            {item.value}
          </Text>
          {item.urgent && <View style={styles.dot} />}
        </PressableScale>
        <Text style={[styles.caption, { color: enamel.textSecondary }]} numberOfLines={1}>
          {CAPTION[item.id] ?? item.label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

interface Props {
  items: OrbitItem[];
  /** The dial itself, drawn in the middle. */
  children: React.ReactNode;
}

/**
 * Home's structure: the safe-to-spend dial owns the screen and the rest of
 * the money picture orbits it. Each satellite is one live figure; tapping it
 * opens the full detail in a sheet, so nothing on Home is deleted, only held
 * one tap from the dial instead of stacked below it.
 */
export const OrbitDial: React.FC<Props> = ({ items, children }) => (
  <View style={styles.root}>
    {children}
    {items.slice(0, CORNERS.length).map((item, i) => (
      <Satellite key={item.id} item={item} index={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  root: {
    width: RING_SIZE + PAD_X * 2,
    minHeight: RING_SIZE + PAD_Y * 2 + LABEL_H,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: { position: 'absolute', width: SIZE + 16, height: SIZE + LABEL_H, alignItems: 'center' },
  stack: { alignItems: 'center' },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium', marginTop: 4 },
  satellite: {
    width: SIZE,
    height: SIZE,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  value: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold' },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: enamel.danger,
    borderWidth: 2,
    borderColor: enamel.background,
  },
});
