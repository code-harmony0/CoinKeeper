/**
 * PulseHeader — the home screen's persistent answer to "can I spend right now?"
 *
 * Sits on the canvas (not in a card) above the room switcher, so the number
 * that drives the daily decision never scrolls out of reach behind the cards
 * that merely explain it.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { CountUp } from '../anim';
import { Money } from '../../utils/money';

interface PulseHeaderProps {
  /** paise — today's share of what's left in the month's plan */
  safeToSpendToday: number;
  /** paise — what's left across the whole month */
  monthlyRemaining: number;
  /** paise — the month's total spending plan; 0 when no income is recorded */
  safeToSpend: number;
  streakDays: number;
}

export const PulseHeader: React.FC<PulseHeaderProps> = ({
  safeToSpendToday,
  monthlyRemaining,
  safeToSpend,
  streakDays,
}) => {
  const { colors, chipRadius } = useSpecTheme();
  const st = makeStyles(colors);

  const hasPlan = safeToSpend > 0;

  // Streak framing follows the loss-aversion research on long streaks: past a
  // month, an escalating daily counter stops reading as an achievement and
  // starts reading as something fragile you can destroy. Switching to months
  // slows the tick and reframes it as a durable record, not a daily gamble.
  const streakLabel =
    streakDays >= 30
      ? `${Math.floor(streakDays / 30)} month${streakDays >= 60 ? 's' : ''} under budget`
      : `${streakDays}d under budget`;

  return (
    <Animated.View entering={FadeInDown.springify()} style={st.wrap}>
      <View style={st.topRow}>
        <Text style={st.label}>
          {hasPlan ? 'Safe to spend today' : 'No spending plan yet'}
        </Text>
        {streakDays > 0 && (
          <View style={[st.streak, { borderRadius: chipRadius }]}>
            <Flame size={13} color={colors.peachDeep} strokeWidth={2.5} />
            <Text style={st.streakText}>{streakLabel}</Text>
          </View>
        )}
      </View>

      {hasPlan ? (
        <>
          <CountUp
            value={safeToSpendToday}
            prefix="₹"
            isPaise
            style={st.hero}
            testID="pulse-safe-today"
          />
          <Text style={st.sub}>
            {Money.format(monthlyRemaining, { zeroDecimals: true })} left of{' '}
            {Money.format(safeToSpend, { zeroDecimals: true })} this month
          </Text>
        </>
      ) : (
        <Text style={st.emptyHero}>
          Add income to see what's safe to spend
        </Text>
      )}
    </Animated.View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    wrap: {
      marginBottom: 24,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    label: {
      fontSize: 13,
      fontFamily: 'Satoshi-Medium',
      color: colors.sectionLabel,
    },
    streak: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.peach,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    streakText: {
      fontSize: 12,
      fontFamily: 'Satoshi-Bold',
      color: colors.peachDeep,
    },
    hero: {
      fontSize: 40,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    sub: {
      fontSize: 13,
      fontFamily: 'Satoshi-Regular',
      color: colors.sectionLabel,
      marginTop: 4,
    },
    emptyHero: {
      fontSize: 20,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      lineHeight: 28,
    },
  });

export default PulseHeader;
