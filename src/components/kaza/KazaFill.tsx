import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DURATION, INFORMATIONAL, informationalDuration, useReducedMotion } from '../../theme/motion';

interface Props {
  /** 0–100. */
  percent: number;
  color: string;
  trackColor: string;
  height?: number;
}

/**
 * A bar that fills to its value. The fill IS the information, so it is the
 * "informational" motion class: it always plays and only shortens under the
 * OS reduce-motion setting (DESIGN.md §8) — never skipped.
 */
export const KazaFill: React.FC<Props> = ({ percent, color, trackColor, height = 8 }) => {
  const reduced = useReducedMotion();
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(100, Math.max(0, percent)), {
      duration: informationalDuration(DURATION.fill, reduced),
      reduceMotion: INFORMATIONAL,
    });
  }, [percent, reduced, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  const radius = height / 2;

  return (
    <View style={[styles.track, { height, borderRadius: radius, backgroundColor: trackColor }]}>
      <Animated.View style={[{ height, borderRadius: radius, backgroundColor: color }, fillStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
