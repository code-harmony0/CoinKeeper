import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TrendingUp, ShieldCheck, Clock } from 'lucide-react-native';
import { Money } from '../../utils/money';
import { Text } from '../ui/Text';
import { PresetOutcome, computeProjection } from '../../services/moneyPlanIntelligence';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  currentOutcome: PresetOutcome;
  newOutcome: PresetOutcome;
  /** Monthly income (paise), needed to project savings forward in time. */
  income: number;
  currentSavingsPercent: number;
  newSavingsPercent: number;
  emergencyFundTarget: number;
  emergencyFundCurrent: number;
  colors: any;
  cardRadius: number;
}

const PROJECTION_HORIZON_MONTHS = [6, 12, 24];

export const MoneyPlanProjection: React.FC<Props> = ({
  currentOutcome,
  newOutcome,
  income,
  currentSavingsPercent,
  newSavingsPercent,
  emergencyFundTarget,
  emergencyFundCurrent,
  colors,
  cardRadius,
}) => {
  const { cardShadow } = useSpecTheme();

  const hasChanged = currentOutcome.monthlySavings !== newOutcome.monthlySavings || currentOutcome.safeToSpend !== newOutcome.safeToSpend;

  const savingsDelta = newOutcome.monthlySavings - currentOutcome.monthlySavings;
  const spendDelta = newOutcome.safeToSpendToday - currentOutcome.safeToSpendToday;

  const efCurrentMo = currentOutcome.emergencyFundMonths;
  const efNewMo = newOutcome.emergencyFundMonths;
  const efDelta = (efCurrentMo && efNewMo) ? (efNewMo - efCurrentMo) : null;

  // Pure arithmetic (monthlySavings × months, no compounding/interest assumed)
  // projected out to 6/12/24 months — this is what actually answers "where
  // does this plan lead," not just this month's delta.
  const currentTrajectory = computeProjection({ income, savingsPercent: currentSavingsPercent, months: PROJECTION_HORIZON_MONTHS });
  const newTrajectory = computeProjection({ income, savingsPercent: newSavingsPercent, months: PROJECTION_HORIZON_MONTHS });

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <View
        style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}
      >
        <View style={styles.planSection}>
          <Text variant="caption" style={[styles.sectionTitle, { color: colors.textSecondary }]}>CURRENT PLAN</Text>
          <Text style={[styles.planSummary, { color: colors.textPrimary }]}>
            {Money.format(currentOutcome.monthlySavings, { zeroDecimals: true })}/mo savings • {Money.format(currentOutcome.safeToSpendToday, { zeroDecimals: true })}/day limit
          </Text>
        </View>

        <View style={styles.arrowContainer}>
          <TrendingUp size={16} color={colors.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
        </View>

        <View style={styles.planSection}>
          <Text variant="caption" style={[styles.sectionTitle, { color: colors.primaryAccent || colors.skyDeep }]}>NEW PLAN</Text>
          <Text style={[styles.planSummary, { color: colors.textPrimary }]}>
            {Money.format(newOutcome.monthlySavings, { zeroDecimals: true })}/mo savings • {Money.format(newOutcome.safeToSpendToday, { zeroDecimals: true })}/day limit
          </Text>
        </View>

        {hasChanged && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text variant="caption" style={[styles.sectionTitle, { color: colors.textPrimary }]}>ESTIMATED IMPACT</Text>
            <View style={styles.impactList}>
              {savingsDelta !== 0 && (
                <View style={styles.impactRow}>
                  <View style={[styles.impactBadge, { backgroundColor: `${savingsDelta > 0 ? colors.mintDeep : colors.peachDeep}15` }]}>
                    <Text style={[styles.impactBadgeText, { color: savingsDelta > 0 ? colors.mintDeep : colors.peachDeep }]}>
                      {savingsDelta > 0 ? '+' : ''}{Money.format(savingsDelta, { zeroDecimals: true })}
                    </Text>
                  </View>
                  <Text style={[styles.impactText, { color: colors.textPrimary }]}>Monthly Savings</Text>
                </View>
              )}
              {spendDelta !== 0 && (
                <View style={styles.impactRow}>
                  <View style={[styles.impactBadge, { backgroundColor: `${spendDelta > 0 ? colors.mintDeep : colors.peachDeep}15` }]}>
                    <Text style={[styles.impactBadgeText, { color: spendDelta > 0 ? colors.mintDeep : colors.peachDeep }]}>
                      {spendDelta > 0 ? '+' : ''}{Money.format(spendDelta, { zeroDecimals: true })}
                    </Text>
                  </View>
                  <Text style={[styles.impactText, { color: colors.textPrimary }]}>Daily Spending Limit</Text>
                </View>
              )}
              {efDelta !== null && efDelta !== 0 && (
                <View style={styles.impactRow}>
                  <View style={[styles.impactBadge, { backgroundColor: `${efDelta < 0 ? colors.mintDeep : colors.peachDeep}15` }]}>
                    <Text style={[styles.impactBadgeText, { color: efDelta < 0 ? colors.mintDeep : colors.peachDeep }]}>
                      {efDelta > 0 ? '+' : ''}{efDelta} months
                    </Text>
                  </View>
                  <Text style={[styles.impactText, { color: colors.textPrimary }]}>
                    {efDelta < 0 ? 'Emergency Fund Earlier' : 'Emergency Fund Later'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text variant="caption" style={[styles.sectionTitle, { color: colors.textPrimary }]}>WHERE THIS PLAN LEADS</Text>
        <View style={styles.trajectoryRow}>
          {newTrajectory.map((point, i) => {
            const currentPoint = currentTrajectory[i];
            const delta = hasChanged ? point.cumulativeSavings - currentPoint.cumulativeSavings : 0;
            const label = point.months >= 12 ? `${point.months / 12}${point.months === 12 ? ' yr' : ' yrs'}` : `${point.months} mo`;
            return (
              <View key={point.months} style={styles.trajectoryCol}>
                <Text variant="caption" style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
                <Text style={[styles.trajectoryValue, { color: colors.textPrimary }]}>
                  {Money.format(point.cumulativeSavings, { zeroDecimals: true })}
                </Text>
                {delta !== 0 && (
                  <Text style={{ color: delta > 0 ? colors.mintDeep : colors.peachDeep, fontFamily: 'Satoshi-Bold', fontSize: 11, marginTop: 2 }}>
                    {delta > 0 ? '+' : ''}{Money.format(delta, { zeroDecimals: true })}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <Text variant="caption" style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'center' }}>
          Cumulative savings at this rate — plain arithmetic, no interest or investment growth assumed.
        </Text>

      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    marginBottom: 20,
  },
  planSection: {
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  planSummary: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  impactList: {
    marginTop: 12,
    gap: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  impactBadgeText: {
    fontFamily: 'Satoshi-Black',
    fontSize: 13,
  },
  impactText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  trajectoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  trajectoryCol: {
    alignItems: 'center',
    flex: 1,
  },
  trajectoryValue: {
    fontFamily: 'Satoshi-Black',
    fontSize: 16,
    marginTop: 4,
  },
});
