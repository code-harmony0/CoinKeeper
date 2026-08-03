import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { computeProjection, computeEmergencyFundReadiness } from '../../services/moneyPlanIntelligence';

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
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(12);
  const points = computeProjection({ income, savingsPercent, months: [...HORIZONS] });
  const selected = points.find(p => p.months === horizon) ?? points[points.length - 1];

  const monthlySavings = Math.round(income * (savingsPercent / 100));
  const { label: emergencyFundLabel } = computeEmergencyFundReadiness({
    target: emergencyFundTarget, current: emergencyFundCurrent, monthlySavings,
  });

  return (
    <View>
      <View style={styles.horizonRow}>
        {HORIZONS.map(h => (
          <TouchableOpacity
            key={h}
            onPress={() => setHorizon(h)}
            style={[styles.horizonBtn, { backgroundColor: horizon === h ? colors.primaryAccent : colors.chipBg, borderRadius: 999 }]}
          >
            <Text variant="caption" style={{ color: horizon === h ? '#FFF' : colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
              {h} mo
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: cardRadius }]}>
        <View style={styles.row}>
          <Text variant="body" style={{ color: colors.textSecondary }}>Projected Savings</Text>
          <Text variant="h3" style={{ color: colors.success }}>
            +₹{selected.cumulativeSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text variant="body" style={{ color: colors.textSecondary }}>Emergency Fund</Text>
          <Text variant="h3" style={{ color: colors.textPrimary }}>{emergencyFundLabel}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  horizonRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  horizonBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  box: { padding: 20, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 16 },
});
