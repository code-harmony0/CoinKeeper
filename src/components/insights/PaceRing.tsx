/**
 * PaceRing — the home hero's circle.
 *
 * Answers three questions in one object: the centre says what is safe to spend
 * today, the ring says whether spending is ahead of or behind an even draw-down
 * of the month's plan, and the verdict says it in words.
 *
 * The Skia canvas draws geometry ONLY. Every piece of text is a React Native
 * <Text> layered over the canvas, which keeps type crisp, avoids loading
 * Satoshi into Skia, and leaves the numbers reachable by TalkBack.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  SweepGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withDelay,
  withSpring,
  withTiming,
  useAnimatedStyle,
  ReduceMotion,
} from 'react-native-reanimated';
import { specDark, specLight } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import { computePace } from '../../services/budgetPacing';

const EN = { ...specDark, background: '#121723' };

export const RING_SIZE = 220;
const STROKE = 14;
const R = (RING_SIZE - STROKE) / 2;
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;
const START_ANGLE = -90; // 12 o'clock

interface PaceRingProps {
  safeTodayPaise: number;
  spendPaise: number;
  planPaise: number;
  /** injectable for tests */
  now?: Date;
}

const oval = { x: CX - R, y: CY - R, width: R * 2, height: R * 2 };

export const PaceRing: React.FC<PaceRingProps> = ({
  safeTodayPaise,
  spendPaise,
  planPaise,
  now,
}) => {
  const pace = useMemo(
    () => computePace(spendPaise, planPaise, now ?? new Date()),
    [spendPaise, planPaise, now],
  );

  const progress = planPaise > 0 ? Math.min(1, spendPaise / planPaise) : 0;

  const ringColor =
    pace?.status === 'fast'
      ? EN.danger
      : pace?.status === 'ahead'
        ? EN.success
        : specLight.sky;

  // One authored moment: the ring draws in, then the marker arrives.
  const sweep = useSharedValue(0);
  const markerOpacity = useSharedValue(0);

  useEffect(() => {
    sweep.value = withDelay(
      200,
      withSpring(progress * 360, {
        damping: 18,
        stiffness: 80,
        reduceMotion: ReduceMotion.System,
      }),
    );
    markerOpacity.value = withDelay(
      900,
      withTiming(0.75, { duration: 300, reduceMotion: ReduceMotion.System }),
    );
  }, [progress, sweep, markerOpacity]);

  const trackPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc(oval, START_ANGLE, 360);
    return p;
  }, []);

  const arcPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addArc(oval, START_ANGLE, Math.max(0.01, sweep.value));
    return p;
  });

  const markerStyle = useAnimatedStyle(() => ({
    opacity: markerOpacity.value,
  }));

  const markerAngle = (pace?.elapsed ?? 0) * 360;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        pace
          ? `${Money.format(safeTodayPaise, {
              zeroDecimals: true,
            })} safe to spend today. ${pace.message}.`
          : 'No spending plan set yet'
      }
    >
      <Canvas style={styles.canvas}>
        <Path
          path={trackPath}
          style="stroke"
          strokeWidth={STROKE}
          color={`${EN.textPrimary}14`}
        />
        <Path
          path={arcPath}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          color={ringColor}
        >
          <SweepGradient
            c={vec(CX, CY)}
            colors={[ringColor, `${ringColor}66`, ringColor]}
          />
          <BlurMask blur={6} style="solid" />
        </Path>
      </Canvas>

      {/* Pace marker — an RN view so no extra Skia path math is needed */}
      {pace && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.markerLayer,
            markerStyle,
            { transform: [{ rotate: `${markerAngle}deg` }] },
          ]}
        >
          <View style={[styles.marker, { backgroundColor: EN.textPrimary }]} />
        </Animated.View>
      )}

      {/* Centre stack */}
      <View style={styles.centre} pointerEvents="none">
        {planPaise > 0 ? (
          <>
            <Text style={styles.centreValue}>
              {Money.format(safeTodayPaise, { zeroDecimals: true })}
            </Text>
            <Text style={styles.centreLabel}>Safe to spend today</Text>
          </>
        ) : (
          <Text style={styles.centreEmpty}>Add income to set a plan</Text>
        )}
      </View>

      {pace && (
        <View style={styles.verdictRow}>
          <View style={[styles.verdictDot, { backgroundColor: ringColor }]} />
          <Text style={[styles.verdict, { color: ringColor }]}>
            {pace.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  canvas: { width: RING_SIZE, height: RING_SIZE },
  markerLayer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    top: 0,
    alignItems: 'center',
  },
  marker: { width: 3, height: 18, borderRadius: 2, marginTop: -2 },
  centre: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreValue: {
    fontSize: 40,
    fontFamily: 'Satoshi-Black',
    color: EN.textPrimary,
    letterSpacing: -0.5,
  },
  centreLabel: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    color: EN.textSecondary,
    marginTop: 2,
  },
  centreEmpty: {
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  verdictDot: { width: 6, height: 6, borderRadius: 3 },
  verdict: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
});

export default PaceRing;
