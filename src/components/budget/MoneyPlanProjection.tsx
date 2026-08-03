import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, ShieldCheck } from 'lucide-react-native';
import { Text } from '../ui/Text';
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

export const MoneyPlanProjection: React.FC<Props> = ({
  income, savingsPercent, emergencyFundTarget, emergencyFundCurrent, colors, cardRadius,
}) => {
  const { cardShadow } = useSpecTheme();
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(12);
  const points = computeProjection({ income, savingsPercent, months: [...HORIZONS] });
  const selected = points.find(p => p.months === horizon) ?? points[points.length - 1];

  const monthlySavings = Math.round(income * (savingsPercent / 100));
  const { label: emergencyFundLabel } = computeEmergencyFundReadiness({
    target: emergencyFundTarget, current: emergencyFundCurrent, monthlySavings,
  });

  return (
    <View>
      <View style={[styles.horizonTrack, { backgroundColor: colors.surfaceSunken, borderRadius: 999 }]}>
        {HORIZONS.map(h => (
          <TouchableOpacity
            key={h}
            onPress={() => setHorizon(h)}
            style={[
              styles.horizonBtn,
              { backgroundColor: horizon === h ? colors.segmentActiveBg : 'transparent', borderRadius: 999 },
            ]}
          >
            <Text variant="caption" style={{ color: horizon === h ? colors.segmentActiveText : colors.segmentInactiveText, fontFamily: 'Satoshi-Bold' }}>
              {h} mo
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.box, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.success}15` }]}>
              <TrendingUp color={colors.success} size={16} />
            </View>
            <Text variant="body" style={{ color: colors.textSecondary }}>Projected Savings</Text>
          </View>
          <Text variant="h3" style={{ color: colors.success }}>
            +₹{selected.cumulativeSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.skyDeep}15` }]}>
              <ShieldCheck color={colors.skyDeep} size={16} />
            </View>
            <Text variant="body" style={{ color: colors.textSecondary }}>Emergency Fund</Text>
          </View>
          <Text variant="h3" style={{ color: colors.textPrimary }}>{emergencyFundLabel}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  horizonTrack: { flexDirection: 'row', padding: 4, marginBottom: 16 },
  horizonBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  box: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginVertical: 16 },
});
