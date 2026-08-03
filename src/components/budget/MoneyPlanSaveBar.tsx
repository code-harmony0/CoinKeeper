import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
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
    <View style={[styles.footer, { paddingBottom, backgroundColor: colors.card, shadowColor: '#000' }]}>
      {hasChanges && (
        <View style={styles.diffRow}>
          <ArrowRight color={colors.textSecondary} size={14} />
          <Text variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
            This plan gives you <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>₹{safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text> to spend and{' '}
            <Text style={{ color: colors.success, fontFamily: 'Satoshi-Bold' }}>₹{monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</Text> saved
          </Text>
        </View>
      )}
      <Button title="Apply Plan" onPress={onApply} disabled={!isBalanced || isLoading} loading={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  diffRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center' },
});
