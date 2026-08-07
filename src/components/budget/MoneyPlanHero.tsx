import React, { useEffect } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
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
import { CountUp } from '../anim/CountUp';
import { PressableScale } from '../anim/PressableScale';
import { useSpecTheme } from '../../theme/specTheme';
import { Money } from '../../utils/money';

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

const deg2rad = (d: number) => (d * Math.PI) / 180;

export const MoneyPlanHero: React.FC<Props> = ({
  income,
  previewOutcome,
  hasIncome,
  isBalanced,
  onAddIncome,
  colors,
}) => {
  const { cardRadius, cardShadow, iconShadow } = useSpecTheme();
  const { label: scoreLabel, color: scoreColor, confidence } = getScoreState(previewOutcome.budgetHealthScore, colors);

  // ── Arc animation ─────────────────────────────────────────────────────────
  const arcProgress = useSharedValue(0);

  useEffect(() => {
    // Entrance animation: arc draws in from 0 → score
    arcProgress.value = withDelay(
      300,
      withSpring(hasIncome ? previewOutcome.budgetHealthScore / 100 : 0, { damping: 18, stiffness: 80 })
    );
  }, [previewOutcome.budgetHealthScore, hasIncome]);

  const sweepAngle = useDerivedValue(
    () => arcProgress.value * SWEEP_TOTAL
  );

  // ── Card width measure for arc centering ─────────────────────────────────
  const [cardWidth, setCardWidth] = React.useState(0);

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={[
        styles.outer,
        { backgroundColor: colors.card, borderRadius: cardRadius },
        cardShadow,
      ]}
      onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
    >
      {hasIncome ? (
        <View style={styles.contentRow}>
          {/* ── Left: number block ── */}
          <View style={styles.leftBlock}>
            <Text
              variant="caption"
              style={[styles.overline, { color: colors.textSecondary }]}
            >
              TODAY'S PLAN LIMIT
            </Text>
            <CountUp value={previewOutcome.safeToSpendToday} prefix="₹" isPaise style={[styles.bigNumber, { color: colors.textPrimary }]} />
            
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Monthly Remaining</Text>
                <CountUp value={previewOutcome.monthlyRemaining} prefix="₹" isPaise style={[styles.metricValue, { color: colors.skyDeep }]} />
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Savings Goal</Text>
                <CountUp value={previewOutcome.monthlySavings} prefix="₹" isPaise style={[styles.metricValue, { color: colors.mintDeep }]} />
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Budget Health</Text>
                <Text style={[styles.metricValue, { color: scoreColor }]}>{previewOutcome.budgetHealthScore}/100 (Grade {previewOutcome.grade})</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Freedom Progress</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {previewOutcome.emergencyFundMonths ? `E-Fund in ${previewOutcome.emergencyFundMonths} mos` : 'No E-Fund'}
                </Text>
              </View>
            </View>

            {/* Recommendation / confidence line */}
            <View style={[styles.insightChip, { backgroundColor: `${scoreColor}12`, borderColor: `${scoreColor}30`, marginTop: 12 }]}>
              <Text
                variant="caption"
                style={{ color: scoreColor, fontFamily: 'Satoshi-Bold', fontSize: 11, lineHeight: 16 }}
                numberOfLines={2}
              >
                {isBalanced
                  ? confidence
                  : 'Allocation must total 100%'}
              </Text>
            </View>
          </View>

          {/* ── Right: Skia arc ── */}
          <View style={styles.rightBlock}>
            {ARC_SIZE > 0 && (
              <Canvas style={{ width: ARC_SIZE, height: ARC_SIZE, alignSelf: 'center' }}>
                {/* Track (background ring) */}
                <ArcPath
                  cx={ARC_CX}
                  cy={ARC_CY}
                  r={ARC_RADIUS}
                  startAngle={START_ANGLE}
                  sweepAngle={SWEEP_TOTAL}
                  color={`${colors.textPrimary}10`}
                  stroke={ARC_STROKE}
                />

                {/* Progress arc — driven by sweepAngle shared value */}
                <AnimatedArcPath
                  cx={ARC_CX}
                  cy={ARC_CY}
                  r={ARC_RADIUS}
                  startAngle={START_ANGLE}
                  sweepAngle={sweepAngle}
                  color={scoreColor}
                  stroke={ARC_STROKE}
                />

                {/* Center dot */}
                <Circle
                  cx={ARC_CX}
                  cy={ARC_CY}
                  r={4}
                  color={scoreColor}
                  opacity={0.6}
                />
              </Canvas>
            )}

            {/* Score label below arc */}
            <View style={styles.scoreLabelWrap}>
              <Text style={[styles.scorePercent, { color: scoreColor }]}>
                {previewOutcome.grade}
              </Text>
              <Text variant="caption" style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                {scoreLabel}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* ── Empty state ── */
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconRing, { backgroundColor: `${colors.mintDeep}12`, borderColor: `${colors.mintDeep}25` }]}>
            <PlusCircle color={colors.mintDeep} size={28} strokeWidth={1.8} />
          </View>
          <Text
            style={[styles.emptyTitle, { color: colors.textPrimary }]}
          >
            Set Your Income
          </Text>
          <Text
            variant="body"
            style={[styles.emptyBody, { color: colors.textSecondary }]}
          >
            Add your monthly income to unlock your personalised money plan.
          </Text>
          <PressableScale
            onPress={onAddIncome}
            style={[styles.addBtn, { backgroundColor: colors.textPrimary }]}
          >
            <Text style={styles.addBtnText}>Add Income</Text>
          </PressableScale>
        </View>
      )}
    </Animated.View>
  );
};

// ── Skia arc helpers ──────────────────────────────────────────────────────────

interface ArcPathProps {
  cx: number;
  cy: number;
  r: number;
  startAngle: number;
  sweepAngle: number | Animated.SharedValue<number>;
  color: string;
  stroke: number;
}

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
  outer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leftBlock: {
    flex: 1,
    paddingRight: 16,
  },
  rightBlock: {
    alignItems: 'center',
  },
  overline: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bigNumber: {
    fontFamily: 'Satoshi-Black',
    fontSize: 34,
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 6,
  },
  metricsGrid: {
    marginTop: 8,
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 12,
  },
  metricLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  metricValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  incomeLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    marginBottom: 12,
  },
  insightChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  scoreLabelWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  scorePercent: {
    fontFamily: 'Satoshi-Black',
    fontSize: 18,
    lineHeight: 22,
  },
  scoreLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  // ── Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Satoshi-Black',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    maxWidth: 260,
  },
  addBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignSelf: 'center',
  },
  addBtnText: {
    color: '#FFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
});
