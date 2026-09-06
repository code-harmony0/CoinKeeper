import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Target, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim/PressableScale';
import { CountUp } from '../anim/CountUp';
import { Money } from '../../utils/money';
import {
  GoalHealth,
  goalBarTone,
  goalStatusCopy,
  goalTone,
  isUnstarted,
} from '../../services/goalIntelligence';
import {
  DURATION,
  EXPRESSIVE,
  INFORMATIONAL,
  SPRING,
  sequenceDelay,
  useReducedMotion,
} from '../../theme/motion';

interface Props {
  name: string;
  targetAmount: number;
  currentAmount: number;
  tint: string;
  deep: string;
  onAddFunds: () => void;
  onPress: () => void;
  onLongPress?: () => void;
  health: GoalHealth;
  priorityRank: number;
}

/** Offsets from mount, in ms — continues the hero's sequence. */
const SEQUENCE = {
  card: 300,
  bar: 600,
  footer: 800,
} as const;

export const FocusGoalHeroCard: React.FC<Props> = ({
  name,
  targetAmount,
  currentAmount,
  tint,
  deep,
  onAddFunds,
  onPress,
  onLongPress,
  health,
  priorityRank,
}) => {
  const { colors, cardRadius, cardShadow, iconShadow, iconContainerRadius, space } = useSpecTheme();
  const reduced = useReducedMotion();
  const delay = (ms: number) => sequenceDelay(ms, reduced);

  const percentage = health.progressPercent;
  const isComplete = health.state === 'completed';
  const unstarted = isUnstarted(health);
  const remainingPaise = Math.max(0, targetAmount - currentAmount);

  // One card, one verdict — carried by the status line and the icon. A goal
  // with nothing in it is not a warning, it's an invitation, so it never takes
  // the amber even though the stall rule technically fires on it.
  const tone = unstarted ? 'accent' : goalTone(health.state);
  const statusColor =
    tone === 'good' ? colors.success
    : tone === 'warn' ? colors.warning
    : tone === 'bad' ? colors.danger
    : deep;

  // The bar measures how full the goal is; it is not a second opinion about
  // its health. See goalBarTone for why these are deliberately different.
  const barTone = goalBarTone(health.state);
  const barColor =
    barTone === 'good' ? colors.success
    : barTone === 'bad' ? colors.danger
    : deep;

  const fillWidth = useSharedValue(0);

  useEffect(() => {
    // A bar filling to its percentage IS the percentage — informational, so it
    // shortens under reduce-motion rather than snapping to the end value.
    fillWidth.value = withDelay(
      delay(SEQUENCE.bar),
      withSpring(percentage, { ...SPRING.settle, reduceMotion: INFORMATIONAL }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, reduced]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`,
  }));

  const accessibilityLabel = `${name}. ${Money.format(currentAmount, { zeroDecimals: true })} saved of ${Money.format(targetAmount, { zeroDecimals: true })}, ${percentage} percent. ${goalStatusCopy(health)}`;

  return (
    <Animated.View entering={FadeInDown.delay(delay(SEQUENCE.card)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}>
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={[
          styles.card,
          cardShadow,
          {
            backgroundColor: colors.card,
            borderRadius: cardRadius,
            padding: space.md,
          },
        ]}>

          <View style={[styles.header, { marginBottom: space.md }]}>
            <View style={styles.badgeRow}>
              <View style={[
                styles.iconWrap,
                iconShadow,
                {
                  backgroundColor: tone === 'accent' ? tint : `${statusColor}1F`,
                  borderRadius: iconContainerRadius,
                },
              ]}>
                <Target color={tone === 'accent' ? deep : statusColor} size={20} />
              </View>
              {priorityRank === 1 && (
                <View style={[styles.priorityBadge, { backgroundColor: colors.chipBg }]}>
                  <Text variant="label" style={{ color: colors.primaryAccent, fontFamily: 'Satoshi-Bold' }}>#1 Priority</Text>
                </View>
              )}
            </View>

            <Text variant="h2" style={{ color: colors.textPrimary, marginTop: space.sm }}>{name}</Text>
          </View>

          <View style={[styles.progressSection, { marginBottom: space.md }]}>
            <View style={[styles.progressRow, { marginBottom: space.xs }]}>
              <View>
                <Text variant="label" style={{ color: colors.textSecondary }}>Saved</Text>
                <CountUp
                  value={currentAmount}
                  isPaise
                  prefix="₹"
                  delay={delay(SEQUENCE.bar)}
                  duration={DURATION.fill}
                  style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 28, marginTop: 4 }}
                />
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <Text variant="label" style={{ color: colors.textSecondary }}>Target</Text>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', fontSize: 16, marginTop: 4 }}>
                  {Money.format(targetAmount, { zeroDecimals: true })}
                </Text>
              </View>
            </View>

            {/*
              At 0% a solid track reads as a bar that failed to render. A
              dashed outline reads as a slot waiting to be filled — the same
              information, without looking broken.
            */}
            <View style={[
              styles.track,
              unstarted
                ? { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border }
                : { backgroundColor: colors.chipBg },
            ]}>
              {!unstarted && (
                <Animated.View style={[styles.fill, { backgroundColor: barColor }, fillStyle]} />
              )}
            </View>
          </View>

          <Animated.View
            entering={FadeInDown.delay(delay(SEQUENCE.footer)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}
            style={styles.footerRow}
          >
            {isComplete ? (
              <View style={[styles.completeBadge, { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center' }]}>
                <CheckCircle2 color="#FFFFFF" size={14} />
                <Text variant="caption" style={{ color: '#FFFFFF', fontFamily: 'Satoshi-Bold', marginLeft: 6 }}>Goal Achieved</Text>
              </View>
            ) : (
              <>
                <View style={styles.statusCol}>
                  {/*
                    One status line, built once, instead of four near-duplicate
                    conditional branches that each formatted their own copy and
                    could disagree with the card next to them.
                  */}
                  <View style={styles.statusLine}>
                    {(tone === 'warn' || tone === 'bad') && (
                      <AlertTriangle color={statusColor} size={14} style={{ marginRight: 4 }} />
                    )}
                    <Text
                      variant="caption"
                      numberOfLines={2}
                      style={{ color: tone === 'accent' ? colors.textSecondary : statusColor, flexShrink: 1 }}
                    >
                      {goalStatusCopy(health)}
                    </Text>
                  </View>
                  {/* The gap — the number the user is actually working against, and the one fact neither the coach line nor the Saved/Target pair states outright. */}
                  <Text variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                    {Money.format(remainingPaise, { zeroDecimals: true })} to go
                  </Text>
                </View>

                <PressableScale
                  onPress={onAddFunds}
                  accessibilityRole="button"
                  accessibilityLabel={`Add funds to ${name}`}
                  style={[styles.addBtn, { backgroundColor: colors.primaryAccent }]}
                >
                  <Plus color="#FFFFFF" size={16} />
                  <Text variant="caption" style={{ color: '#FFFFFF', fontFamily: 'Satoshi-Bold', marginLeft: 4 }}>
                    {unstarted ? 'Start' : 'Add Funds'}
                  </Text>
                </PressableScale>
              </>
            )}
          </Animated.View>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 0,
  },
  header: {},
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  progressSection: {},
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // 8px clear of the Add Funds target, so the two never crowd.
    gap: 12,
  },
  statusCol: {
    flex: 1,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  completeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
