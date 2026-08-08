/**
 * GoalsStrip — every goal in one card, compact.
 *
 * Home previously showed one full-size goal card and nothing else, hiding work
 * the user had already done. All goals belong here at a glance; the Goals
 * screen owns editing and detail.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { Money } from '../../utils/money';

export interface GoalsStripItem {
  id: string;
  name: string;
  targetAmount: number; // paise
  currentAmount: number; // paise
}

interface GoalsStripProps {
  goals: GoalsStripItem[];
  onPress: () => void;
}

export const GoalsStrip: React.FC<GoalsStripProps> = ({ goals, onPress }) => {
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const st = makeStyles(colors, cardRadius);

  if (goals.length === 0) return null;

  return (
    <PressableScale
      onPress={onPress}
      style={[st.card, cardShadow]}
      accessibilityRole="button"
      accessibilityLabel={`${goals.length} savings goals`}
    >
      <View style={st.header}>
        <Text style={st.heading}>Goals</Text>
        <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2.2} />
      </View>

      <View style={st.list}>
        {goals.map(goal => {
          const pct =
            goal.targetAmount > 0
              ? Math.round(
                  Math.min(1, Math.max(0, goal.currentAmount / goal.targetAmount)) *
                    100,
                )
              : 0;
          return (
            <View key={goal.id} style={st.goal}>
              <View style={st.goalHead}>
                <Text style={st.goalName} numberOfLines={1}>
                  {goal.name}
                </Text>
                <Text style={st.goalPct}>{pct}%</Text>
              </View>
              <View style={st.track}>
                <View
                  style={[
                    st.fill,
                    {
                      // A goal at 0% with a hairline fill reads as broken; a
                      // visible stub reads as "started, nothing saved yet".
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: colors.primaryAccent,
                    },
                  ]}
                />
              </View>
              <Text style={st.goalMeta}>
                {Money.format(goal.currentAmount, { zeroDecimals: true })} of{' '}
                {Money.format(goal.targetAmount, { zeroDecimals: true })}
              </Text>
            </View>
          );
        })}
      </View>
    </PressableScale>
  );
};

const makeStyles = (colors: any, cardRadius: number) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    heading: {
      fontSize: 15,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    list: { gap: 16 },
    goal: { gap: 6 },
    goalHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    goalName: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Satoshi-Medium',
      color: colors.textPrimary,
    },
    goalPct: {
      fontSize: 14,
      fontFamily: 'Satoshi-Bold',
      color: colors.primaryAccent,
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceSunken,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 3 },
    goalMeta: {
      fontSize: 12,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
    },
  });

export default GoalsStrip;
