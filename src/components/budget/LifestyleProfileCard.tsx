import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { computePresetOutcome } from '../../services/moneyPlanIntelligence';

interface Preset {
  id: string;
  name: string;
  n: number;
  w: number;
  s: number;
  icon: React.ReactNode;
}

interface Props {
  preset: Preset;
  income: number;
  onSelect: (n: number, w: number, s: number) => void;
  colors: any;
  cardRadius: number;
}

export const LifestyleProfileCard: React.FC<Props> = ({ preset, income, onSelect, colors, cardRadius }) => {
  const outcome = computePresetOutcome({
    income,
    needsPercent: preset.n,
    wantsPercent: preset.w,
    savingsPercent: preset.s,
  });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: cardRadius }]}
      onPress={() => onSelect(preset.n, preset.w, preset.s)}
      activeOpacity={0.8}
    >
      <View style={[styles.icon, { backgroundColor: colors.primaryAccent }]}>{preset.icon}</View>
      <Text variant="h3" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', marginBottom: 12 }}>{preset.name}</Text>

      <View style={styles.outcomeRow}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>Safe to Spend</Text>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
          ₹{outcome.safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      <View style={styles.outcomeRow}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>Savings</Text>
        <Text variant="caption" style={{ color: colors.success, fontFamily: 'Satoshi-Bold' }}>
          ₹{outcome.monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      <View style={styles.outcomeRow}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>Emergency Fund</Text>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
          {outcome.emergencyFundMonths ? `${outcome.emergencyFundMonths} mos` : '—'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { width: 180, padding: 20, borderWidth: 1, marginRight: 16 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  outcomeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
});
