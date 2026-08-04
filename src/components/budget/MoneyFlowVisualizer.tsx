import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Rect,
  RoundedRect,
  Group,
  rect,
  rrect,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';


interface Props {
  income: number;
  needs: number;
  wants: number;
  savings: number;
  safeToSpend: number;
  colors: any;
}

const BAR_HEIGHT = 28;
const BAR_RADIUS = BAR_HEIGHT / 2;
const SEGMENT_GAP = 3;
const LABEL_MIN_WIDTH = 60; // px — segments narrower than this hide their label

// Matches Satoshi-Medium as close as possible with system fonts on each platform
const fontStyle = {
  fontFamily: 'System',
  fontSize: 11,
  fontWeight: '600' as const,
};

export const MoneyFlowVisualizer: React.FC<Props> = ({
  income,
  needs,
  wants,
  savings,
  safeToSpend,
  colors,
}) => {
  const { cardRadius, cardShadow, space } = useSpecTheme();

  // ── Shared values (numeric — these actually animate) ─────────────────────
  const animNeeds = useSharedValue(needs);
  const animWants = useSharedValue(wants);
  const animSavings = useSharedValue(savings);

  useEffect(() => {
    animNeeds.value = withSpring(needs, { damping: 22, stiffness: 120 });
    animWants.value = withSpring(wants, { damping: 22, stiffness: 120 });
    animSavings.value = withSpring(savings, { damping: 22, stiffness: 120 });
  }, [needs, wants, savings]);

  // ── Bar layout dimensions ─────────────────────────────────────────────────
  const [barWidth, setBarWidth] = React.useState(0);

  // Derived pixel positions for each segment inside the Skia canvas
  const totalGapWidth = SEGMENT_GAP * 2; // 2 gaps between 3 segments

  const needsW = useDerivedValue(() => {
    const raw = (animNeeds.value / 100) * (barWidth - totalGapWidth);
    return Math.max(0, raw);
  });

  const wantsW = useDerivedValue(() => {
    const raw = (animWants.value / 100) * (barWidth - totalGapWidth);
    return Math.max(0, raw);
  });

  const savingsW = useDerivedValue(() => {
    const raw = (animSavings.value / 100) * (barWidth - totalGapWidth);
    return Math.max(0, raw);
  });

  // X offsets for each segment
  const wantsX = useDerivedValue(() => needsW.value + SEGMENT_GAP);
  const savingsX = useDerivedValue(() => needsW.value + SEGMENT_GAP + wantsW.value + SEGMENT_GAP);


  // ── Legend animated widths for native-side progress indicators removed ────
  // All animation now lives inside the Skia Canvas via useDerivedValue.

  const segments = [
    {
      label: 'Needs',
      percent: needs,
      amount: Math.round(income * (needs / 100)),
      color: colors.mintDeep,
    },
    {
      label: 'Wants',
      percent: wants,
      amount: Math.round(income * (wants / 100)),
      color: colors.peachDeep,
    },
    {
      label: 'Savings',
      percent: savings,
      amount: Math.round(income * (savings / 100)),
      color: colors.skyDeep,
    },
  ];

  const hasIncome = income > 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(100)}
      style={[styles.container, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text
          variant="caption"
          style={[styles.sectionLabel, { color: colors.textSecondary }]}
        >
          MONEY FLOW
        </Text>
        {hasIncome ? (
          <Text
            variant="caption"
            style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium' }}
          >
            ₹{income.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / mo
          </Text>
        ) : (
          <Text variant="caption" style={{ color: colors.danger, fontFamily: 'Satoshi-Medium' }}>
            No income set
          </Text>
        )}
      </View>

      {/* ── Skia Bar ── */}
      <View
        style={styles.barContainer}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Canvas style={{ width: barWidth, height: BAR_HEIGHT }}>
            {/* Background track */}
            <RoundedRect
              x={0}
              y={0}
              width={barWidth}
              height={BAR_HEIGHT}
              r={BAR_RADIUS}
              color={colors.surfaceSunken}
            />

            {/* Segments are square-cornered rects drawn inside a rounded clip,
                so only the bar's outer ends are rounded. Rounding each segment
                individually turned any narrow one (e.g. Wants at 10%, ~32dp
                wide against a 28dp-tall bar with r=14) into a circle. */}
            <Group clip={rrect(rect(0, 0, barWidth, BAR_HEIGHT), BAR_RADIUS, BAR_RADIUS)}>
              <Rect x={0} y={0} width={needsW} height={BAR_HEIGHT} color={colors.mintDeep} />
              <Rect x={wantsX} y={0} width={wantsW} height={BAR_HEIGHT} color={colors.peachDeep} />
              <Rect x={savingsX} y={0} width={savingsW} height={BAR_HEIGHT} color={colors.skyDeep} />
            </Group>
          </Canvas>
        )}
      </View>

      {/* ── Legend ── */}
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <View style={styles.legendText}>
              <Text
                variant="caption"
                style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', fontSize: 11 }}
              >
                {seg.label}
              </Text>
              <Text
                variant="caption"
                style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', fontSize: 13 }}
              >
                {hasIncome
                  ? `₹${seg.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                  : `${seg.percent}%`}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Safe To Spend Pill ── */}
      <View
        style={[
          styles.safePill,
          {
            backgroundColor: `${colors.mintDeep}12`,
            borderColor: `${colors.mintDeep}30`,
          },
        ]}
      >
        <View style={[styles.safeIndicator, { backgroundColor: colors.mintDeep }]} />
        <Text
          variant="caption"
          style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', flex: 1 }}
        >
          Safe to spend this month
        </Text>
        <Text
          variant="body"
          style={{ color: colors.mintDeep, fontFamily: 'Satoshi-Black', fontSize: 15 }}
        >
          {hasIncome
            ? `₹${safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
            : '—'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  barContainer: {
    width: '100%',
    marginBottom: 20,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  legendText: {
    gap: 2,
  },
  safePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  safeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
