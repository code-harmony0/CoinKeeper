import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';

interface Props {
  income: number;
  safeToSpend: number;
  monthlySavings: number;
  hasIncome: boolean;
  score: number;
  topRecommendation: string | null;
  isBalanced: boolean;
  onAddIncome: () => void;
  colors: any;
}

export const MoneyPlanHero: React.FC<Props> = ({
  income, safeToSpend, monthlySavings, hasIncome, score, topRecommendation, isBalanced, onAddIncome, colors,
}) => {
  return (
    <View style={styles.wrapper}>
      <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase' }}>
        Safe To Spend
      </Text>
      <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 40, letterSpacing: -0.5, marginTop: 4 }}>
        ₹{safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>

      {hasIncome && (
        <View style={styles.incomeRow}>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            of ₹{income.toLocaleString('en-IN', { maximumFractionDigits: 0 })} income
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <Text variant="caption" style={{ color: colors.success, fontFamily: 'Satoshi-Bold' }}>
            +₹{monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })} saved/mo
          </Text>
        </View>
      )}

      {!hasIncome ? (
        <View style={{ marginTop: 16 }}>
          <Text variant="body" style={{ color: colors.textSecondary, marginBottom: 12 }}>
            To calculate your personalized plan, add your monthly income.
          </Text>
          <PressableScale onPress={onAddIncome} style={[styles.addIncomeBtn, { backgroundColor: colors.primaryAccent }]}>
            <Text style={{ color: '#FFF', fontFamily: 'Satoshi-Bold' }}>Add Income</Text>
          </PressableScale>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <View style={styles.scoreRow}>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 20 }}>
              {score}%
            </Text>
            <Text variant="body" style={{ color: colors.textSecondary, marginLeft: 8 }}>Optimized</Text>
          </View>
          {topRecommendation ? (
            <Text variant="caption" style={{ color: isBalanced ? colors.success : colors.danger, fontFamily: 'Satoshi-Bold', marginTop: 4 }}>
              {topRecommendation}
            </Text>
          ) : (
            <Text variant="caption" style={{ color: colors.success, fontFamily: 'Satoshi-Bold', marginTop: 4 }}>
              Plan fully optimized. Every rupee has a purpose.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  incomeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  addIncomeBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, alignSelf: 'flex-start' },
});
