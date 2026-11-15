import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { AlertTriangle } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { EXPRESSIVE, STAGGER } from '../../theme/motion';
import { PressableScale } from '../anim';
import { Money } from '../../utils/money';
import { billStatus, upcomingBills } from '../../services/billSchedule';
import type { Bill } from '../../store/billStore';

interface Props {
  bills: Bill[];
  onPress: () => void;
}

const MAX = 6;

const caption = (daysAway: number, overdue: boolean) => {
  if (overdue) return 'Overdue';
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  return `In ${daysAway} days`;
};

/** Bills as a swipeable row of chips, overdue first, each saying when it lands. */
export const UpcomingRail: React.FC<Props> = ({ bills, onPress }) => {
  const { colors } = useSpecTheme();
  const items = useMemo(() => {
    const open = bills.filter(b => billStatus(b) !== 'paid');
    const late = open
      .filter(b => billStatus(b) === 'overdue')
      .map(b => ({ name: b.name, amountPaise: b.amountPaise, daysAway: -1, overdue: true }));
    const rest = upcomingBills(open.filter(b => billStatus(b) !== 'overdue')).map(b => ({
      ...b,
      overdue: false,
    }));
    return [...late, ...rest].slice(0, MAX);
  }, [bills]);

  if (items.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textSecondary }]}>
        {bills.length === 0 ? 'No bills tracked yet.' : 'Nothing owing. Every bill is paid.'}
      </Text>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {items.map((b, i) => {
        const urgent = b.overdue || b.daysAway === 0;
        return (
          <Animated.View
            key={`${b.name}-${i}`}
            entering={FadeInRight.springify()
              .damping(18)
              .delay(i * STAGGER.tight)
              .reduceMotion(EXPRESSIVE)}
          >
            <PressableScale
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={`${b.name}, ${Money.format(b.amountPaise, { zeroDecimals: true })}, ${caption(b.daysAway, b.overdue)}`}
              style={[
                styles.chip,
                {
                  backgroundColor: urgent ? colors.peach : colors.card,
                  borderColor: urgent ? 'transparent' : colors.border,
                },
              ]}
            >
              <View style={styles.cap}>
                {urgent && <AlertTriangle size={14} color={colors.peachDeep} strokeWidth={2.4} />}
                <Text
                  style={[styles.capText, { color: urgent ? colors.peachDeep : colors.textSecondary }]}
                >
                  {caption(b.daysAway, b.overdue)}
                </Text>
              </View>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={[styles.amount, { color: colors.textPrimary }]}>
                {Money.format(b.amountPaise, { zeroDecimals: true })}
              </Text>
            </PressableScale>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -24 },
  row: { paddingHorizontal: 24, gap: 12, paddingBottom: 8 },
  empty: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', paddingBottom: 8 },
  chip: {
    width: 148,
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold' },
  name: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', marginTop: 4 },
  amount: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black' },
});
