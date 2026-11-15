import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Skia, Path, Circle } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withDelay,
  FadeInDown,
} from 'react-native-reanimated';
import { PlusCircle } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { RollingNumber } from '../anim/RollingNumber';
import { Bezel } from '../shared/Bezel';
import { PressableScale } from '../anim/PressableScale';
import { brand, onInk } from '../../theme/specTheme';
import { INFORMATIONAL, SPRING } from '../../theme/motion';

import { PresetOutcome } from '../../services/moneyPlanIntelligence';

interface Props {
  income: number;
  previewOutcome: PresetOutcome;
  hasIncome: boolean;
  isBalanced: boolean;
  onAddIncome: () => void;
  colors: any;
}

// Score → confidence label + color
const getScoreState = (score: number, colors: any) => {
  if (score >= 80) return { label: 'Excellent Plan', color: colors.mintDeep, confidence: 'Every rupee has a purpose.' };
  if (score >= 60) return { label: 'Good Plan', color: colors.skyDeep, confidence: 'A few tweaks will optimize it.' };
  if (score >= 40) return { label: 'Needs Work', color: colors.peachDeep, confidence: 'Follow the guidance below.' };
  return { label: 'Just Starting', color: colors.textSecondary, confidence: 'Set up your allocations below.' };
};

// Arc math
const ARC_SIZE = 120;
const ARC_STROKE = 9;
const ARC_RADIUS = (ARC_SIZE - ARC_STROKE) / 2;
const ARC_CX = ARC_SIZE / 2;
const ARC_CY = ARC_SIZE / 2;
const START_ANGLE = -210; // degrees, open at bottom-left
const SWEEP_TOTAL = 240; // degrees of travel

export const MoneyPlanHero: React.FC<Props> = ({
  income: _income,
  previewOutcome,
  hasIncome,
  isBalanced,
  onAddIncome,
  colors,
}) => {
  const { label: scoreLabel, confidence } = getScoreState(previewOutcome.budgetHealthScore, colors);

  // ── Arc animation ─────────────────────────────────────────────────────────
  const arcProgress = useSharedValue(0);

  useEffect(() => {
    // Entrance animation: arc draws in from 0 → score
    arcProgress.value = withDelay(
      300,
      // The arc draws to a value — informational motion, so it plays even
      // when the system asks for reduced motion (see theme/motion.ts).
      withSpring(hasIncome ? previewOutcome.budgetHealthScore / 100 : 0, {
        ...SPRING.settle,
        reduceMotion: INFORMATIONAL,
      }),
    );
  }, [previewOutcome.budgetHealthScore, hasIncome, arcProgress]);

  const sweepAngle = useDerivedValue(
    () => arcProgress.value * SWEEP_TOTAL
  );

  // ── Card width measure for arc centering ─────────────────────────────────
  // Removed unneeded onLayout to prevent initial mount jank

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.outer}>
      <Bezel tone="ink" solid>
        {hasIncome ? (
          <View style={styles.contentRow}>
            <View
              style={styles.leftBlock}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Today's plan limit is ${previewOutcome.safeToSpendToday} rupees`}
            >
              <Text style={styles.label}>Plan limit for today</Text>
              <RollingNumber
                valuePaise={previewOutcome.safeToSpendToday}
                fontSize={44}
                lineHeight={52}
                letterSpacing={-1.5}
                color={brand.signal}
              />
              <Text style={styles.body}>
                {previewOutcome.emergencyFundMonths
                  ? `You'll have an emergency fund in ${previewOutcome.emergencyFundMonths} month${
                      previewOutcome.emergencyFundMonths === 1 ? '' : 's'
                    }.`
                  : 'No emergency fund yet. Savings will build one.'}
              </Text>
            </View>

            <View style={styles.rightBlock}>
              <Canvas style={{ width: ARC_SIZE, height: ARC_SIZE }}>
                <ArcPath
                  cx={ARC_CX}
                  cy={ARC_CY}
                  r={ARC_RADIUS}
                  startAngle={START_ANGLE}
                  sweepAngle={SWEEP_TOTAL}
                  color={onInk.fill}
                  stroke={ARC_STROKE}
                />
                <AnimatedArcPath
                  cx={ARC_CX}
                  cy={ARC_CY}
                  r={ARC_RADIUS}
                  startAngle={START_ANGLE}
                  sweepAngle={sweepAngle}
                  color={brand.signal}
                  stroke={ARC_STROKE}
                />
              </Canvas>
              <View style={styles.gradeWrap} pointerEvents="none">
                <Text style={styles.grade}>{previewOutcome.grade}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Set your income</Text>
            <Text style={styles.body}>Add your monthly income to unlock your personal money plan.</Text>
            <PressableScale onPress={onAddIncome} accessibilityRole="button" style={styles.addBtn}>
              <PlusCircle color={brand.ink} size={20} strokeWidth={2} />
              <Text style={styles.addBtnText}>Add Income</Text>
            </PressableScale>
          </View>
        )}

        {hasIncome && (
          <View style={styles.verdict}>
            <Text style={styles.verdictLabel}>{isBalanced ? scoreLabel : 'Allocation must total 100%'}</Text>
            <Text style={styles.body} numberOfLines={2}>
              {isBalanced ? confidence : 'Adjust the split below until it adds up.'}
            </Text>
          </View>
        )}
      </Bezel>
    </Animated.View>
  );
};

// ── Skia arc helpers ──────────────────────────────────────────────────────────


/**
 * Static arc drawn as a Path (Skia Arc takes degrees, this matches).
 */
const ArcPath: React.FC<{
  cx: number; cy: number; r: number;
  startAngle: number; sweepAngle: number;
  color: string; stroke: number;
}> = ({ cx, cy, r, startAngle, sweepAngle, color, stroke }) => {
  const path = React.useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc(
      { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
      startAngle,
      sweepAngle
    );
    return p;
  }, [cx, cy, r, startAngle, sweepAngle]);

  return (
    <Path
      path={path}
      color={color}
      style="stroke"
      strokeWidth={stroke}
      strokeCap="round"
    />
  );
};

/**
 * Animated arc — path recomputed on the UI thread via useDerivedValue.
 */
const AnimatedArcPath: React.FC<{
  cx: number; cy: number; r: number;
  startAngle: number; sweepAngle: Animated.DerivedValue<number>;
  color: string; stroke: number;
}> = ({ cx, cy, r, startAngle, sweepAngle, color, stroke }) => {
  const animPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addArc(
      { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
      startAngle,
      Math.max(0.01, sweepAngle.value) // avoid 0-sweep flicker
    );
    return p;
  });

  return (
    <Path
      path={animPath}
      color={color}
      style="stroke"
      strokeWidth={stroke}
      strokeCap="round"
    />
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: { marginHorizontal: 24, marginBottom: 24 },
  contentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  leftBlock: { flex: 1 },
  rightBlock: { width: ARC_SIZE, height: ARC_SIZE, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  body: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid, marginTop: 4 },
  gradeWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  grade: { fontSize: 44, lineHeight: 52, fontFamily: 'Satoshi-Black', color: onInk.high },
  verdict: { marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: onInk.hairline },
  verdictLabel: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black', color: onInk.high },
  emptyState: { gap: 4 },
  emptyTitle: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold', color: onInk.high },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginTop: 16,
    backgroundColor: brand.signal,
  },
  addBtnText: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold', color: brand.ink },
});
