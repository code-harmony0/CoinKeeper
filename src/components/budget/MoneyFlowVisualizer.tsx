import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from '../ui/Text';

interface Stage {
  label: string;
  amount: number;
  color: string;
  widthPercent: number;
}

interface Props {
  income: number;
  needs: number;
  wants: number;
  savings: number;
  safeToSpend: number;
  colors: any;
}

export const MoneyFlowVisualizer: React.FC<Props> = ({ income, needs, wants, savings, safeToSpend, colors }) => {
  const stages: Stage[] = [
    { label: 'Income', amount: income, color: colors.textPrimary, widthPercent: 100 },
    { label: 'Needs', amount: Math.round(income * (needs / 100)), color: colors.mintDeep, widthPercent: needs },
    { label: 'Wants', amount: Math.round(income * (wants / 100)), color: colors.peachDeep, widthPercent: wants },
    { label: 'Savings', amount: Math.round(income * (savings / 100)), color: colors.skyDeep, widthPercent: savings },
    { label: 'Safe To Spend', amount: safeToSpend, color: colors.success, widthPercent: Math.min(100, needs + wants) },
  ];

  return (
    <View style={styles.container}>
      <Text variant="caption" style={[styles.label, { color: colors.textSecondary }]}>Money Flow</Text>
      {stages.map(stage => (
        <FlowRow key={stage.label} stage={stage} colors={colors} />
      ))}
    </View>
  );
};

const FlowRow: React.FC<{ stage: Stage; colors: any }> = ({ stage, colors }) => {
  const barStyle = useAnimatedStyle(() => ({ width: withSpring(`${Math.max(0, Math.min(100, stage.widthPercent))}%`, { damping: 20 }) }));

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>{stage.label}</Text>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
          ₹{stage.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
        <Animated.View style={[styles.fill, { backgroundColor: stage.color }, barStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 40, paddingHorizontal: 24 },
  label: { fontFamily: 'Satoshi-Medium', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, fontSize: 11 },
  row: { marginBottom: 14 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
