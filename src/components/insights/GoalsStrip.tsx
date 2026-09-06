/**
 * GoalsStrip — what your saving adds up to, what it unlocks next, and the one
 * goal worth a tap today.
 *
 * ## Why this isn't a list any more
 *
 * It used to render every goal as an identical row: a mini ring, a percentage,
 * an "₹11,324 of ₹50,000", a full-width bar, a green milestone line and an Add
 * chip — repeated once per goal. Four separate encodings of a single number in
 * every row, and no answer at all to the question a home module exists to
 * answer: *what should I do?* Four rows of equal weight is a table, and a table
 * has no point of view.
 *
 * It also grew without bound. At four goals the card ran ~950px; at eight it
 * would have owned the entire home screen for a secondary module.
 *
 * ## The shape now
 *
 * Three bands, each answering one question, in the order people ask them:
 *
 * 1. **What have I built?** The total, counting up. The card was named "Goals"
 *    and never once said how much had been saved — the single most motivating
 *    number in the feature was the one number missing from it.
 * 2. **What does it unlock?** One reward bar, driven by the real badge ladder
 *    in `services/badges`. One target, not the same green sentence repeated
 *    under three rows, which reads as wallpaper rather than as a prize.
 * 3. **What do I do now?** One focus goal at full size with one primary
 *    action, and the remainder compressed into chips that wrap instead of
 *    stacking.
 *
 * The focus goal is the *closest to done* rather than the most urgent: a home
 * card gets a glance and a single tap, and "you're ₹443 from halfway" moves
 * people in a way "this one is behind pace" does not. Urgency ranking still
 * exists and still leads the Goals screen, which is where a user goes when
 * they want to be told what is wrong.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { ChevronRight, Flame, Medal, PiggyBank, Target, Trophy } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CountUp } from '../anim/CountUp';
import { Money } from '../../utils/money';
import { nextGoalBadge } from '../../services/badges';
import { INFORMATIONAL, SPRING, sequenceDelay, useReducedMotion } from '../../theme/motion';

export interface GoalsStripItem {
  id: string;
  name: string;
  targetAmount: number; // paise
  currentAmount: number; // paise
}

interface GoalsStripProps {
  goals: GoalsStripItem[];
  onPress: () => void;
  /** Opens the add-funds sheet for one goal, without leaving home. */
  onAddMoney: (goalId: string) => void;
}

const BADGE_ICONS = { Flame, Trophy, Medal, PiggyBank, Target };

/**
 * Each goal keeps one ink for life, assigned by its position in the list.
 *
 * The card used to paint every ring and every bar in `primaryAccent` navy, so
 * four goals read as four rows of the same thing and the eye had nothing to
 * hold on to. Colour here is identity, not status — a goal is a *place you are
 * saving toward*, and it should be as recognisable across the app as a bank
 * card's colour is in a wallet. Status still owns green/amber/red on the Goals
 * screen, which is why nothing in this rotation is any of those.
 *
 * The order matches the accent rotation the rest of the app cycles
 * (DESIGN.md §2), so a goal shows the same ink here and on its detail card.
 */
const GOAL_INKS = ['lavenderDeep', 'pinkDeep', 'mintDeep', 'peachDeep', 'skyDeep'] as const;
const GOAL_TINTS = ['lavender', 'pink', 'mint', 'peach', 'sky'] as const;

const FOCUS_RING = 52;
const FOCUS_STROKE = 5;
const CHIP_RING = 18;
const CHIP_STROKE = 2.5;

const ratioOf = (g: GoalsStripItem): number =>
  g.targetAmount > 0 ? Math.min(1, Math.max(0, g.currentAmount / g.targetAmount)) : 0;

/**
 * At 0% this draws a dashed outline and nothing else. A solid track with a 3%
 * stub was the old compromise, and on a new goal it read as a broken progress
 * bar — the app's first impression of your savings was a dot that looked like
 * a failure. A dashed outline reads as a slot waiting to be filled.
 */
const Ring: React.FC<{
  size: number;
  stroke: number;
  progress: number;
  color: string;
  track: string;
  /** Rendered in the middle — the value the arc encodes, stated. */
  label?: string;
  labelColor?: string;
}> = ({ size, stroke, progress, color, track, label, labelColor }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const empty = progress <= 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={empty ? color : track}
          strokeWidth={empty ? 1.5 : stroke}
          strokeDasharray={empty ? '3 4' : undefined}
          opacity={empty ? 0.5 : 1}
          fill="none"
        />
        {!empty && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {label && (
        <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Black', color: labelColor }}>
          {label}
        </Text>
      )}
    </View>
  );
};

export const GoalsStrip: React.FC<GoalsStripProps> = ({
  goals,
  onPress,
  onAddMoney,
}) => {
  const { colors, cardRadius, cardShadow, chipRadius } = useSpecTheme();
  const st = makeStyles(colors, cardRadius, chipRadius);
  const reduced = useReducedMotion();

  const rewardFill = useSharedValue(0);

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Keyed off the goal's position in the full list, never its position in the
  // focus/rest split — otherwise a goal would change colour the moment it
  // became (or stopped being) the focus, and the identity would be worthless.
  const inkOf = (id: string) =>
    colors[GOAL_INKS[Math.max(0, goals.findIndex(g => g.id === id)) % GOAL_INKS.length]];
  const tintOf = (id: string) =>
    colors[GOAL_TINTS[Math.max(0, goals.findIndex(g => g.id === id)) % GOAL_TINTS.length]];

  // Closest to done, completed ones excluded — they have nothing left to ask
  // for. Falls back to the first goal when every goal is finished, so the card
  // never renders headless.
  const focus =
    [...goals]
      .filter(g => ratioOf(g) < 1)
      .sort((a, b) => ratioOf(b) - ratioOf(a))[0] ?? goals[0];

  const rest = goals.filter(g => g.id !== focus?.id);

  const bestProgress = goals.reduce((best, g) => Math.max(best, ratioOf(g)), 0);
  const bestGoal = goals.find(g => ratioOf(g) === bestProgress);
  const halfwayGapPaise = bestGoal
    ? Math.max(0, Math.round(bestGoal.targetAmount / 2) - bestGoal.currentAmount)
    : 0;

  const reward = nextGoalBadge(totalSaved, bestProgress, halfwayGapPaise);

  React.useEffect(() => {
    // The reward bar IS the distance to the badge — informational, so it
    // shortens under reduce-motion rather than skipping to the end.
    rewardFill.value = withDelay(
      sequenceDelay(400, reduced),
      withSpring(reward ? Math.min(1, reward.ratio) * 100 : 100, {
        ...SPRING.settle,
        reduceMotion: INFORMATIONAL,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward?.ratio, reduced]);

  const rewardStyle = useAnimatedStyle(() => ({ width: `${rewardFill.value}%` }));

  if (goals.length === 0 || !focus) return null;

  const focusRatio = ratioOf(focus);
  const focusPct = Math.round(focusRatio * 100);
  const focusUntouched = focus.currentAmount <= 0;
  const RewardIcon = reward ? BADGE_ICONS[reward.badge.icon] : Target;

  return (
    <View style={[st.card, cardShadow]}>
      <PressableScale
        onPress={onPress}
        style={st.header}
        accessibilityRole="button"
        accessibilityLabel={`${Money.format(totalSaved, { zeroDecimals: true })} saved across ${goals.length} goals. Open goals`}
      >
        <Text style={st.eyebrow}>Goals</Text>
        <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2.2} />
      </PressableScale>

      {/* Band 1 — what it adds up to. The number the card never had. */}
      <CountUp
        value={totalSaved}
        isPaise
        prefix="₹"
        delay={sequenceDelay(200, reduced)}
        style={st.total}
      />
      <Text style={st.totalCaption}>
        saved across {goals.length} goal{goals.length === 1 ? '' : 's'}
      </Text>

      {/* Band 2 — what it unlocks. One reward, from the real badge ladder. */}
      <View style={st.reward}>
        <View style={st.rewardHead}>
          <View style={st.rewardIcon}>
            <RewardIcon size={13} color={colors.mintDeep} strokeWidth={2.4} />
          </View>
          <Text style={st.rewardText} numberOfLines={1}>
            {reward ? reward.hint : 'Every badge on the savings track is yours'}
          </Text>
        </View>
        <View style={st.rewardTrack}>
          <Animated.View style={[st.rewardFill, rewardStyle]} />
        </View>
      </View>

      {/* Band 3 — the one goal worth a tap, at a size that says so. */}
      <PressableScale
        onPress={() => onAddMoney(focus.id)}
        style={[st.focus, { backgroundColor: tintOf(focus.id) }]}
        accessibilityRole="button"
        accessibilityLabel={
          focusUntouched
            ? `Start ${focus.name} with ₹500`
            : `${focus.name}, ${focusPct} percent. Add funds`
        }
      >
        <Ring
          size={FOCUS_RING}
          stroke={FOCUS_STROKE}
          progress={focusRatio}
          color={inkOf(focus.id)}
          // NOT the row's own background — the track vanished into it and a
          // 47% arc read as a stray broken circle rather than 47% of a whole.
          // White reads as a well cut into the tinted row.
          track={colors.card}
          label={focusUntouched ? undefined : `${focusPct}%`}
          labelColor={colors.textPrimary}
        />
        <View style={st.focusTitles}>
          <Text style={st.focusName} numberOfLines={1}>{focus.name}</Text>
          <Text style={st.focusMeta} numberOfLines={1}>
            {focusUntouched
              ? `Target ${Money.format(focus.targetAmount, { zeroDecimals: true })}`
              : `${Money.format(focus.currentAmount, { zeroDecimals: true })} of ${Money.format(focus.targetAmount, { zeroDecimals: true })}`}
          </Text>
        </View>
        <View style={[st.focusCta, focusUntouched && st.focusCtaStart]}>
          <Text style={st.focusCtaText}>
            {focusUntouched ? 'Start ₹500' : 'Add'}
          </Text>
        </View>
      </PressableScale>

      {/* The rest — present and tappable, but not competing. Wraps rather than
          stacking, so ten goals cost one more line and not ten more rows. */}
      {rest.length > 0 && (
        <View style={st.chips}>
          {rest.map(g => {
            const r = ratioOf(g);
            return (
              <PressableScale
                key={g.id}
                onPress={() => onAddMoney(g.id)}
                style={[st.chip, { backgroundColor: tintOf(g.id) }]}
                accessibilityRole="button"
                accessibilityLabel={`${g.name}, ${Math.round(r * 100)} percent. Add money`}
              >
                <Ring
                  size={CHIP_RING}
                  stroke={CHIP_STROKE}
                  progress={r}
                  color={r >= 1 ? colors.success : inkOf(g.id)}
                  track={colors.card}
                />
                <Text style={st.chipName} numberOfLines={1}>{g.name}</Text>
                {/* A goal with nothing in it gets an invitation, not a "0%" —
                    the dashed ring already says it is empty, and repeating it
                    as a number only scores the user on not having started. */}
                {/* The goal's own ink, not a global green — a green "Start"
                    sitting on a peach chip was two unrelated hues arguing. */}
                <Text style={[st.chipPct, r <= 0 && { fontFamily: 'Satoshi-Bold', color: inkOf(g.id) }]}>
                  {r <= 0 ? 'Start' : `${Math.round(r * 100)}%`}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      )}
    </View>
  );
};

const makeStyles = (colors: any, cardRadius: number, chipRadius: number) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    eyebrow: {
      fontSize: 11,
      fontFamily: 'Satoshi-Bold',
      color: colors.sectionLabel,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    total: {
      fontSize: 34,
      lineHeight: 40,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      letterSpacing: -0.8,
    },
    // 12px hung off a 34px hero as an afterthought — too big a drop to read as
    // the hero's own subtitle, so the number looked unlabelled. 15/Bold makes
    // it the second thing you read instead of the last.
    totalCaption: {
      fontSize: 15,
      fontFamily: 'Satoshi-Bold',
      color: colors.textSecondary,
      marginTop: 4,
    },
    reward: {
      marginTop: 16,
      gap: 8,
    },
    rewardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rewardIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.mintDeep}18`,
    },
    // The prize, not a footnote — the only line that says what acting earns.
    rewardText: {
      flex: 1,
      fontSize: 12.5,
      fontFamily: 'Satoshi-Bold',
      color: colors.mintDeep,
    },
    rewardTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceSunken,
      overflow: 'hidden',
    },
    rewardFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.mintDeep,
    },
    focus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 18,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.surfaceSunken,
    },
    focusTitles: { flex: 1, gap: 3 },
    focusName: {
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    focusMeta: {
      fontSize: 12.5,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },
    focusCta: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: chipRadius,
      backgroundColor: colors.primaryAccent,
    },
    focusCtaStart: { paddingHorizontal: 14 },
    focusCtaText: {
      fontSize: 13,
      fontFamily: 'Satoshi-Bold',
      color: colors.segmentActiveText,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      minHeight: 44,
      paddingLeft: 10,
      paddingRight: 12,
      borderRadius: chipRadius,
      backgroundColor: colors.surfaceSunken,
    },
    chipName: {
      fontSize: 12.5,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      // 96 truncated "Emergency Fund" to "Emergency Fu…", which is the one
      // goal name in the app users must be able to read at a glance.
      maxWidth: 132,
    },
    chipPct: {
      fontSize: 12.5,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },
  });

export default GoalsStrip;
