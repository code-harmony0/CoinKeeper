import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Home, Receipt, Tv, Wifi, Zap, type LucideIcon } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';
import { EXPRESSIVE, STAGGER } from '../../theme/motion';
import { PressableScale } from '../anim';
import { Money } from '../../utils/money';
import { billStatus, upcomingBills } from '../../services/billSchedule';
import type { Bill } from '../../store/billStore';

interface Props {
  bills: Bill[];
  onPress: () => void;
}

const MAX = 4;

const iconFor = (name: string): LucideIcon => {
  const n = name.toLowerCase();
  if (/rent|home|house|emi|loan/.test(n)) return Home;
  if (/electric|power|current/.test(n)) return Zap;
  if (/wifi|fibre|fiber|internet|broadband|jio|airtel/.test(n)) return Wifi;
  if (/netflix|spotify|prime|hotstar|youtube|subscription/.test(n)) return Tv;
  return Receipt;
};

const when = (daysAway: number) =>
  daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`;

/**
 * Bills as a plain list, soonest first, like a departures board: a black icon
 * square, the name, when it is due, the amount. Anything overdue or due today
 * wears a yellow label, so urgency is a word you can read, not a colour you
 * have to guess.
 */
export const UpcomingList: React.FC<Props> = ({ bills, onPress }) => {
  const { colors, isDark } = useSpecTheme();
  const rows = useMemo(() => {
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

  if (rows.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textSecondary }]}>
        {bills.length === 0 ? 'No bills tracked yet.' : 'Nothing owing. Every bill is paid.'}
      </Text>
    );
  }

  return (
    <View>
      {rows.map((b, i) => {
        const Icon = iconFor(b.name);
        const label = b.overdue ? 'OVERDUE' : b.daysAway === 0 ? 'TODAY' : null;
        return (
          <Animated.View
            key={`${b.name}-${i}`}
            entering={FadeInDown.springify().damping(18).delay(i * STAGGER.tight).reduceMotion(EXPRESSIVE)}
          >
            <PressableScale
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={`${b.name}, ${Money.format(b.amountPaise, { zeroDecimals: true })}, ${
                label ?? when(b.daysAway)
              }`}
              style={[styles.row, i < rows.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={[styles.icon, isDark && { backgroundColor: colors.chipBg }]}>
                <Icon size={20} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <View style={styles.text}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {b.name}
                </Text>
                {label ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{label}</Text>
                  </View>
                ) : (
                  <Text style={[styles.when, { color: colors.textSecondary }]}>{when(b.daysAway)}</Text>
                )}
              </View>
              <Text style={[styles.amount, { color: colors.textPrimary }]}>
                {Money.format(b.amountPaise, { zeroDecimals: true })}
              </Text>
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  when: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: brand.signal,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Black', color: brand.ink, letterSpacing: 0.5 },
  amount: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black' },
});
