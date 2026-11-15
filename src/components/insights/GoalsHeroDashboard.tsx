import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import { PressableScale } from '../anim/PressableScale';
import { RollingNumber } from '../anim/RollingNumber';
import { Bezel } from '../shared/Bezel';
import { brand, onInk } from '../../theme/specTheme';
import { RankedGoal, generateRecommendationCopy } from '../../services/goalIntelligence';
import { Money } from '../../utils/money';
import { DURATION, EXPRESSIVE, sequenceDelay, useReducedMotion } from '../../theme/motion';

interface Props {
  rankedGoals: RankedGoal[];
  contributedThisMonthPaise: number;
  contributedLastMonthPaise: number;
  /** This month's unspent Money Plan savings allocation, in paise. */
  savingsBudgetRemainingPaise?: number;
  /** Called when the user routes the surplus into the top-ranked goal. */
  onRouteSurplus?: () => void;
}

/**
 * Goals' answer in one glance: how much is saved across every goal, how this
 * month compares, and one line of advice. Same black panel and signal number
 * as Home, so the two screens read as one app.
 */
export const GoalsHeroDashboard: React.FC<Props> = ({
  rankedGoals,
  contributedThisMonthPaise,
  contributedLastMonthPaise,
  savingsBudgetRemainingPaise = 0,
  onRouteSurplus,
}) => {
  const reduced = useReducedMotion();
  const delay = (ms: number) => sequenceDelay(ms, reduced);

  const totalSaved = rankedGoals.reduce((acc, r) => acc + r.goal.currentAmount, 0);
  const trendDeltaPaise = contributedThisMonthPaise - contributedLastMonthPaise;

  // Plain words, never an alarm: saving less than last month is information.
  const trend: string | null = (() => {
    if (contributedThisMonthPaise === 0 && contributedLastMonthPaise === 0) return null;
    if (trendDeltaPaise === 0) return 'Same as last month';
    const m = Money.format(Math.abs(trendDeltaPaise), { zeroDecimals: true });
    return trendDeltaPaise > 0 ? `${m} more than last month` : `${m} less than last month`;
  })();

  const topGoal = rankedGoals[0];
  const coachCopy = topGoal
    ? generateRecommendationCopy(topGoal.goal, topGoal.health, topGoal.priorityReason)
    : "Let's build your financial engine today.";

  const canRouteSurplus =
    !!topGoal && topGoal.health.state !== 'completed' && savingsBudgetRemainingPaise > 0 && !!onRouteSurplus;

  return (
    <View style={styles.container}>
      <Bezel tone="ink" solid>
        <Text style={styles.label}>Saved across your goals</Text>
        <RollingNumber valuePaise={totalSaved} fontSize={44} lineHeight={52} letterSpacing={-1.5} color={brand.signal} />
        {trend && <Text style={styles.trend}>{trend}</Text>}

        <Animated.View
          entering={FadeInDown.delay(delay(500)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}
          style={styles.coach}
        >
          <Text style={styles.coachText}>{coachCopy}</Text>
          {canRouteSurplus && (
            <PressableScale
              onPress={onRouteSurplus}
              accessibilityRole="button"
              accessibilityLabel={`Move ${Money.format(savingsBudgetRemainingPaise, { zeroDecimals: true })} of unused savings into ${topGoal!.goal.name}`}
              style={styles.surplus}
            >
              <Text style={styles.surplusText}>
                Move {Money.format(savingsBudgetRemainingPaise, { zeroDecimals: true })} of unspent savings to {topGoal!.goal.name}
              </Text>
              <ArrowRight size={18} color={brand.ink} strokeWidth={2} />
            </PressableScale>
          )}
        </Animated.View>
      </Bezel>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  trend: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid, marginTop: 4 },
  coach: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: onInk.hairline, gap: 12 },
  coachText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.high },
  surplus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: brand.signal,
  },
  surplusText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold', color: brand.ink },
});
