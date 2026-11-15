import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { brand } from '../../theme/specTheme';
import { useReducedMotion } from '../../theme/motion';

const SIZE = 420;

/**
 * A slow pool of warm light drifting behind the number, so the black hero has
 * depth and life instead of a flat fill. Transform only; still under
 * reduce-motion.
 */
export const HeroGlow: React.FC = () => {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    x.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
    y.value = withRepeat(withTiming(1, { duration: 9500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, x, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (x.value - 0.5) * 70 }, { translateY: (y.value - 0.5) * 40 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.glow, style]}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={brand.signal} stopOpacity={0.3} />
            <Stop offset="0.55" stopColor={brand.signal} stopOpacity={0.08} />
            <Stop offset="1" stopColor={brand.signal} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={SIZE} height={SIZE} fill="url(#glow)" />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: -120, left: -110, width: SIZE, height: SIZE },
});
