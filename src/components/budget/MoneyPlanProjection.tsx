import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, RoundedRect, Group } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  FadeInDown,
} from 'react-native-reanimated';
import { TrendingUp, ShieldCheck, Clock } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';
import { CountUp } from '../anim/CountUp';
import { computeProjection, computeEmergencyFundReadiness } from '../../services/moneyPlanIntelligence';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  income: number;
  savingsPercent: number;
  emergencyFundTarget: number;
  emergencyFundCurrent: number;
  colors: any;
  cardRadius: number;
}

const HORIZONS = [3, 6, 12] as const;
const EF_BAR_H = 8;
const EF_BAR_RADIUS = 4;

export const MoneyPlanProjection: React.FC<Props> = ({
  income,
  savingsPercent,
  emergencyFundTarget,
  emergencyFundCurrent,
  colors,
  cardRadius,
}) => {
  const { cardShadow } = useSpecTheme();
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(12);
  const [efBarWidth, setEfBarWidth] = useState(0);

  const points = computeProjection({ income, savingsPercent, months: [...HORIZONS] });
  const selected = points.find(p => p.months === horizon) ?? points[points.length - 1];

  const monthlySavings = Math.round(income * (savingsPercent / 100));
  const { remaining, label: emergencyFundLabel } = computeEmergencyFundReadiness({
    target: emergencyFundTarget,
    current: emergencyFundCurrent,
    monthlySavings,
  });

  // Progress percentage for Skia bar
  const efPct = emergencyFundTarget > 0
    ? Math.min(100, (emergencyFundCurrent / emergencyFundTarget) * 100)
    : 0;

  const efFillWidth = useSharedValue(0);
  useEffect(() => {
    efFillWidth.value = withSpring((efPct / 100) * efBarWidth, {
      damping: 22,
      stiffness: 90,
    });
  }, [efPct, efBarWidth]);

  // horizon segment active style uses textPrimary (#121723), NOT package blue
  const activeSegStyle = (h: number) =>
    horizon === h
      ? { backgroundColor: colors.textPrimary, borderRadius: 999 }
      : { backgroundColor: 'transparent', borderRadius: 999 };

  const activeTextStyle = (h: number) =>
    horizon === h
      ? { color: colors.card, fontFamily: 'Satoshi-Bold' }
      : { color: colors.textSecondary, fontFamily: 'Satoshi-Medium' };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      {/* ── Horizon selector ── */}
      <View style={[styles.horizonTrack, { backgroundColor: colors.surfaceSunken }]}>
        {HORIZONS.map(h => (
          <PressableScale
            key={h}
            onPress={() => setHorizon(h)}
            style={[styles.horizonBtn, activeSegStyle(h)]}
          >
            <Text variant="caption" style={activeTextStyle(h)}>
              {h} mo
            </Text>
          </PressableScale>
        ))}
      </View>

      {/* ── Projection card ── */}
      <View
        style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}
      >

        {/* Projected Savings */}
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.mintDeep}15` }]}>
              <TrendingUp color={colors.mintDeep} size={16} />
            </View>
            <View>
              <Text variant="caption" style={[styles.rowMeta, { color: colors.textSecondary }]}>
                Projected savings
              </Text>
              <Text variant="caption" style={{ color: colors.textSecondary, fontSize: 11 }}>
                in {horizon} months
              </Text>
            </View>
          </View>
          <CountUp
            value={selected.cumulativeSavings}
            prefix="₹"
            style={[styles.bigValue, { color: colors.mintDeep }]}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Emergency Fund */}
        <View style={styles.efBlock}>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.skyDeep}15` }]}>
                <ShieldCheck color={colors.skyDeep} size={16} />
              </View>
              <View>
                <Text variant="caption" style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  Emergency fund
                </Text>
                <Text
                  variant="caption"
                  style={{
                    color: efPct >= 100 ? colors.mintDeep : colors.textSecondary,
                    fontFamily: 'Satoshi-Medium',
                    fontSize: 11,
                  }}
                >
                  {emergencyFundLabel}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.efPct,
                { color: efPct >= 100 ? colors.mintDeep : colors.textPrimary },
              ]}
            >
              {Math.round(efPct)}%
            </Text>
          </View>

          {/* Skia progress bar */}
          <View
            style={styles.efBarOuter}
            onLayout={e => setEfBarWidth(e.nativeEvent.layout.width)}
          >
            {efBarWidth > 0 && (
              <Canvas style={{ width: efBarWidth, height: EF_BAR_H }}>
                {/* Track */}
                <RoundedRect
                  x={0}
                  y={0}
                  width={efBarWidth}
                  height={EF_BAR_H}
                  r={EF_BAR_RADIUS}
                  color={colors.surfaceSunken}
                />
                {/* Fill — width driven by shared value */}
                <RoundedRect
                  x={0}
                  y={0}
                  width={efFillWidth}
                  height={EF_BAR_H}
                  r={EF_BAR_RADIUS}
                  color={efPct >= 100 ? colors.mintDeep : colors.skyDeep}
                />
              </Canvas>
            )}
          </View>

          {/* Amount labels */}
          <View style={styles.efAmounts}>
            <Text variant="caption" style={{ color: colors.textSecondary, fontSize: 11 }}>
              ₹{emergencyFundCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} saved
            </Text>
            <Text variant="caption" style={{ color: colors.textSecondary, fontSize: 11 }}>
              Target: ₹{emergencyFundTarget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        {/* Monthly savings rate note */}
        {monthlySavings > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <View style={styles.rowLabel}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.peachDeep}15` }]}>
                  <Clock color={colors.peachDeep} size={16} />
                </View>
                <Text variant="caption" style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  Saving per month
                </Text>
              </View>
              <Text style={[styles.bigValue, { color: colors.textPrimary }]}>
                ₹{monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  horizonTrack: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  horizonBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  card: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowMeta: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigValue: {
    fontFamily: 'Satoshi-Black',
    fontSize: 18,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  efBlock: {
    gap: 12,
  },
  efPct: {
    fontFamily: 'Satoshi-Black',
    fontSize: 16,
  },
  efBarOuter: {
    width: '100%',
  },
  efAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
