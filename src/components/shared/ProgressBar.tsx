import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { brand, onInk, useSpecTheme } from '../../theme/specTheme';
import { DURATION, INFORMATIONAL, informationalDuration, useReducedMotion } from '../../theme/motion';

interface Props {
  /** 0 to 1. */
  ratio: number;
  /** 'ink' on the light page, 'signal' on a black panel. */
  tone?: 'ink' | 'signal';
  /** An unstarted bar is a dashed slot, not a broken empty bar. */
  height?: number;
  delay?: number;
}

/**
 * The one progress line: a rounded track, a fill that slides in on the
 * transform (never animating width), and a dashed slot at zero.
 */
export const ProgressBar: React.FC<Props> = ({ ratio, tone = 'ink', height = 8, delay = 300 }) => {
  const { colors } = useSpecTheme();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  const clamped = Math.min(Math.max(ratio, 0), 1);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(clamped, {
        duration: informationalDuration(DURATION.fill * 2, reduced),
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        reduceMotion: INFORMATIONAL,
      }),
    );
  }, [clamped, delay, reduced, p]);
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: (p.value - 1) * w }] }));
  const onDark = tone === 'signal';
  const unstarted = clamped <= 0;
  return (
    <View
      onLayout={e => setW(e.nativeEvent.layout.width)}
      style={[
        styles.track,
        { height, borderRadius: height / 2 },
        unstarted
          ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: onDark ? onInk.hairline : colors.border }
          : { backgroundColor: onDark ? onInk.fill : colors.border },
      ]}
    >
      {!unstarted && (
        <Animated.View
          style={[
            styles.fill,
            { height, borderRadius: height / 2, backgroundColor: onDark ? brand.signal : colors.textPrimary },
            fill,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  fill: { width: '100%' },
});
