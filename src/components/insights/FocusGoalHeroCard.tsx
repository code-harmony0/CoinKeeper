import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AlertTriangle, CheckCircle2, Plus, Target } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim/PressableScale';
import { RollingNumber } from '../anim/RollingNumber';
import { Bezel } from '../shared/Bezel';
import { IconTile } from '../shared/IconTile';
import { ProgressBar } from '../shared/ProgressBar';
import { Money } from '../../utils/money';
import { GoalHealth, goalStatusCopy, goalTone, isUnstarted } from '../../services/goalIntelligence';
import { DURATION, EXPRESSIVE, sequenceDelay, useReducedMotion } from '../../theme/motion';

interface Props {
  name: string;
  targetAmount: number;
  currentAmount: number;
  /** Kept for callers; goals no longer carry their own colour. */
  tint?: string;
  deep?: string;
  onAddFunds: () => void;
  onPress: () => void;
  onLongPress?: () => void;
  health: GoalHealth;
  priorityRank: number;
}

/** The top-priority goal: one framed card, one bar, one clear next action. */
export const FocusGoalHeroCard: React.FC<Props> = ({
  name,
  targetAmount,
  currentAmount,
  onAddFunds,
  onPress,
  onLongPress,
  health,
  priorityRank,
}) => {
  const { colors } = useSpecTheme();
  const reduced = useReducedMotion();
  const delay = (ms: number) => sequenceDelay(ms, reduced);

  const percentage = health.progressPercent;
  const isComplete = health.state === 'completed';
  const unstarted = isUnstarted(health);
  const remainingPaise = Math.max(0, targetAmount - currentAmount);
  // Only a goal that is slipping gets a warning mark; an empty goal is an invitation.
  const tone = unstarted ? 'accent' : goalTone(health.state);
  const warn = tone === 'warn' || tone === 'bad';

  return (
    <Animated.View entering={FadeInDown.delay(delay(300)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}>
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${Money.format(currentAmount, { zeroDecimals: true })} saved of ${Money.format(targetAmount, { zeroDecimals: true })}, ${percentage} percent. ${goalStatusCopy(health)}`}
      >
        <Bezel tone="paper" padding={20}>
          <View style={styles.head}>
            <IconTile icon={Target} />
            <View style={styles.headText}>
              {priorityRank === 1 && <Text style={[styles.priority, { color: colors.textSecondary }]}>#1 Priority</Text>}
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
                {name}
              </Text>
            </View>
            <Text style={[styles.pct, { color: colors.textPrimary }]}>{percentage}%</Text>
          </View>

          <View style={styles.amounts}>
            <RollingNumber valuePaise={currentAmount} fontSize={28} lineHeight={36} letterSpacing={-0.5} color={colors.textPrimary} />
            <Text style={[styles.target, { color: colors.textSecondary }]}>
              of {Money.format(targetAmount, { zeroDecimals: true })}
            </Text>
          </View>

          <ProgressBar ratio={percentage / 100} delay={delay(500)} height={10} />

          <View style={styles.footer}>
            {isComplete ? (
              <View style={styles.done}>
                <CheckCircle2 color={colors.textPrimary} size={18} strokeWidth={2} />
                <Text style={[styles.status, { color: colors.textPrimary }]}>Goal reached</Text>
              </View>
            ) : (
              <>
                <View style={styles.statusCol}>
                  <View style={styles.statusLine}>
                    {warn && <AlertTriangle color={colors.textPrimary} size={16} strokeWidth={1.9} />}
                    <Text
                      style={[styles.status, { color: warn ? colors.textPrimary : colors.textSecondary }]}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.2}
                    >
                      {goalStatusCopy(health)}
                    </Text>
                  </View>
                  <Text style={[styles.togo, { color: colors.textSecondary }]}>
                    {Money.format(remainingPaise, { zeroDecimals: true })} to go
                  </Text>
                </View>
                <PressableScale
                  onPress={onAddFunds}
                  accessibilityRole="button"
                  accessibilityLabel={`Add money to ${name}`}
                  style={styles.add}
                >
                  <Plus color={brand.signal} size={18} strokeWidth={2.2} />
                  <Text style={styles.addText}>{unstarted ? 'Start' : 'Add money'}</Text>
                </PressableScale>
              </>
            )}
          </View>
        </Bezel>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1 },
  priority: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold' },
  name: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold' },
  pct: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Black' },
  amounts: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 12, flexWrap: 'wrap' },
  target: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  statusCol: { flex: 1, gap: 2 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  status: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  togo: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: brand.ink,
  },
  addText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold', color: '#FFFFFF' },
});
