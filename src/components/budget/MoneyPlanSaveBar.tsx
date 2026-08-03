import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

interface Props {
  hasChanges: boolean;
  isBalanced: boolean;
  isLoading: boolean;
  safeToSpend: number;
  monthlySavings: number;
  onApply: () => void;
  colors: any;
  paddingBottom: number;
}

export const MoneyPlanSaveBar: React.FC<Props> = ({
  hasChanges, isBalanced, isLoading, safeToSpend, monthlySavings, onApply, colors, paddingBottom,
}) => {
  return (
    <View style={[styles.footer, { paddingBottom, backgroundColor: colors.background }]}>
      {hasChanges && (
        <View style={styles.diffRow}>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            Safe to Spend ₹{safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · Savings ₹{monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
          </Text>
        </View>
      )}
      <Button title="Apply Plan" onPress={onApply} disabled={!isBalanced || isLoading} loading={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.05)' },
  diffRow: { marginBottom: 12, alignItems: 'center' },
});
