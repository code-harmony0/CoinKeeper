import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';
import { CountUp } from '../anim/CountUp';
import { useSpecTheme } from '../../theme/specTheme';
import { RankedGoal, generateRecommendationCopy } from '../../services/goalIntelligence';
import { Money } from '../../utils/money';
import { DURATION, EXPRESSIVE, sequenceDelay, useReducedMotion } from '../../theme/motion';
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

/** Absolute offsets from mount, in ms — the screen's choreography in one place. */
const SEQUENCE = {
  heroLabel: 0,
  heroCount: 200,
  trend: 500,
  coach: 600,
  surplus: 750,
} as const;

export const GoalsHeroDashboard: React.FC<Props> = ({
  rankedGoals,
  contributedThisMonthPaise,
  contributedLastMonthPaise,
  savingsBudgetRemainingPaise = 0,
  onRouteSurplus,
}) => {
  const { colors } = useSpecTheme();
  const reduced = useReducedMotion();
  const delay = (ms: number) => sequenceDelay(ms, reduced);

  const totalSaved = rankedGoals.reduce((acc, r) => acc + r.goal.currentAmount, 0);

  const trendDeltaPaise = contributedThisMonthPaise - contributedLastMonthPaise;

  // Three distinct cases, not two. The old ternary treated a delta of exactly
  // zero as "more than last month" and painted it success green — a confident
  // green "₹0 more than last month" for someone who matched last month
  // exactly. And the sentence it built already ended in "last month", while
  // the JSX appended " this month" after it, shipping the literal string
  // "₹2,000 more than last month this month".
  const trend: { label: string; color: string } | null = (() => {
    if (contributedThisMonthPaise === 0 && contributedLastMonthPaise === 0) return null;
    const magnitude = Money.format(Math.abs(trendDeltaPaise), { zeroDecimals: true });
    if (trendDeltaPaise === 0) {
      return { label: 'Exactly matching last month', color: colors.textSecondary };
    }
    return trendDeltaPaise > 0
      ? { label: `${magnitude} more than last month`, color: colors.success }
      : { label: `${magnitude} less than last month`, color: colors.warning };
  })();

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
          <Animated.View entering={FadeIn.duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}>
            <Text
              variant="caption"
              style={{
                color: colors.sectionLabel,
                fontFamily: 'Satoshi-Bold',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: 11,
              }}
            >
              Total Wealth Built
            </Text>
          </Animated.View>

          {/*
            The one figure this screen exists to answer, so it is the one that
            counts. It was a static formatted string at 40px — below the 48px
            floor a money hero has to clear, and arriving fully formed while
            the bars beneath it animated, which made the hero read as the
            static part of a moving screen.
          */}
          <CountUp
            value={totalSaved}
            isPaise
            prefix="₹"
            delay={delay(SEQUENCE.heroCount)}
            duration={DURATION.count}
            testID="goals-total-saved"
            style={{
              color: colors.textPrimary,
              fontFamily: 'Satoshi-Black',
              fontSize: 52,
              lineHeight: 60,
              letterSpacing: -1,
              marginTop: 4,
            }}
          />

          {trend && (
            <Animated.View entering={FadeInDown.delay(delay(SEQUENCE.trend)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}>
              <Text variant="caption" style={{ color: trend.color, marginTop: 4 }}>
                {trend.label}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      <Animated.View
        entering={FadeInDown.delay(delay(SEQUENCE.coach)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}
        style={[styles.coachBanner, { backgroundColor: `${colors.primaryAccent}10` }]}
      >
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Medium', lineHeight: 18 }}>
          <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.primaryAccent }}>Coach: </Text>{coachCopy}
        </Text>

        {canRouteSurplus && (
          <Animated.View entering={FadeIn.delay(delay(SEQUENCE.surplus)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}>
            <PressableScale
              onPress={onRouteSurplus}
              accessibilityRole="button"
              accessibilityLabel={`Move ${Money.format(savingsBudgetRemainingPaise, { zeroDecimals: true })} of unused savings into ${topGoal!.goal.name}`}
              style={[styles.surplusRow, { borderTopColor: `${colors.primaryAccent}20` }]}
            >
              <Text variant="caption" style={{ color: colors.primaryAccent, fontFamily: 'Satoshi-Bold', flex: 1 }}>
                You have {Money.format(savingsBudgetRemainingPaise, { zeroDecimals: true })} of savings unspent this month. Move it to {topGoal!.goal.name}?
              </Text>
              <ArrowRight size={16} color={colors.primaryAccent} />
            </PressableScale>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    // The hero needs air on every side to read as the hero, not just above it.
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    // NOT `alignItems: 'baseline'`. Under the New Architecture that makes Yoga
    // ask the Text descendant for its baseline, which calls
    // ParagraphShadowNode::baseline() and mutates an already-sealed shadow
    // node — Sealable::ensureUnsealed aborts the process. A CountUp rewrites
    // its text on every frame, so a baseline-aligned row containing one is a
    // guaranteed SIGABRT rather than an occasional one, and this screen crashed
    // on open every time.
    //
    // The row has a single child, so baseline alignment was never doing
    // anything here in the first place — it only armed the crash.
    marginBottom: 24,
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
    // 44pt minimum touch target — this was a 12px-padded text row at ~34pt.
    minHeight: 44,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
