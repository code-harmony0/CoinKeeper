import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { Goal } from '../../store/goalStore';
import { Money } from '../../utils/money';

interface Props {
  goals: Goal[];
}

export const GoalsHeroDashboard: React.FC<Props> = ({ goals }) => {
  const { colors } = useSpecTheme();

  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount).length;

  const getInsight = () => {
    if (goals.length === 0) return "Let's build your financial engine today.";
    if (activeGoals === 0 && goals.length > 0) return "Incredible! You've completed all your active goals.";
    const percentage = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    if (percentage > 75) return "You are on the final stretch! Keep the momentum going.";
    if (percentage > 25) return "Solid progress. You are building real wealth.";
    return "Every great journey starts with a single rupee.";
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>Total Wealth Built</Text>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 40, letterSpacing: -0.5, marginTop: 4 }}>
            {Money.format(totalSaved, { zeroDecimals: true })}
          </Text>
        </View>
      </View>

      <View style={[styles.coachBanner, { backgroundColor: `${colors.primaryAccent}10` }]}>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Medium', lineHeight: 18 }}>
          <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.primaryAccent }}>Coach: </Text>{getInsight()}
        </Text>
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
  }
});
