import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';
import { useSpecTheme } from '../../theme/specTheme';
import { RankedGoal, generateRecommendationCopy } from '../../services/goalIntelligence';
import { Money } from '../../utils/money';
import { ArrowRight } from 'lucide-react-native';

interface Props {
  rankedGoals: RankedGoal[];
  contributedThisMonthPaise: number;
  contributedLastMonthPaise: number;
  /** This month's unspent Money Plan savings allocation, in paise. */
  savingsBudgetRemainingPaise?: number;
  /** Called when the user routes the surplus into the top-ranked goal. */
  onRouteSurplus?: () => void;
}

export const GoalsHeroDashboard: React.FC<Props> = ({
  rankedGoals,
  contributedThisMonthPaise,
  contributedLastMonthPaise,
  savingsBudgetRemainingPaise = 0,
  onRouteSurplus,
}) => {
  const { colors } = useSpecTheme();

  const totalSaved = rankedGoals.reduce((acc, r) => acc + r.goal.currentAmount, 0);

  const trendDeltaPaise = contributedThisMonthPaise - contributedLastMonthPaise;
  const trendLabel = contributedLastMonthPaise === 0 && contributedThisMonthPaise === 0
    ? null
    : trendDeltaPaise >= 0
      ? `${Money.format(trendDeltaPaise, { zeroDecimals: true })} more than last month`
      : `${Money.format(Math.abs(trendDeltaPaise), { zeroDecimals: true })} less than last month`;

  const topGoal = rankedGoals[0];
  const coachCopy = topGoal
    ? generateRecommendationCopy(topGoal.goal, topGoal.health, topGoal.priorityReason)
    : "Let's build your financial engine today.";

  const canRouteSurplus =
    !!topGoal && topGoal.health.state !== 'completed' && savingsBudgetRemainingPaise > 0 && !!onRouteSurplus;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>Total Wealth Built</Text>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 40, letterSpacing: -0.5, marginTop: 4 }}>
            {Money.format(totalSaved, { zeroDecimals: true })}
          </Text>
          {trendLabel && (
            <Text variant="caption" style={{ color: trendDeltaPaise >= 0 ? colors.success : colors.textSecondary, marginTop: 4 }}>
              {trendLabel} this month
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.coachBanner, { backgroundColor: `${colors.primaryAccent}10` }]}>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Medium', lineHeight: 18 }}>
          <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.primaryAccent }}>Coach: </Text>{coachCopy}
        </Text>

        {canRouteSurplus && (
          <PressableScale onPress={onRouteSurplus} style={[styles.surplusRow, { borderTopColor: `${colors.primaryAccent}20` }]}>
            <Text variant="caption" style={{ color: colors.primaryAccent, fontFamily: 'Satoshi-Bold', flex: 1 }}>
              Route this month's unused {Money.format(savingsBudgetRemainingPaise, { zeroDecimals: true })} savings into {topGoal!.goal.name}
            </Text>
            <ArrowRight size={16} color={colors.primaryAccent} />
          </PressableScale>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
  },
  coachBanner: {
    padding: 16,
    borderRadius: 12,
  },
  surplusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
