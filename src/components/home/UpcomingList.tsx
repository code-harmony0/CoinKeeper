import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Home, Receipt, Tv, Wifi, Zap, type LucideIcon } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';
import { EXPRESSIVE, STAGGER, useReducedMotion } from '../../theme/motion';
import { PressableScale } from '../anim';
import { IconTile } from '../shared/IconTile';
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

/** A slow live dot: today is happening now. Still under reduce-motion. */
const LiveDot: React.FC = () => {
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  React.useEffect(() => {
    if (reduced) return;
    o.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reduced, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.liveDot, st]} />;
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
              <IconTile icon={Icon} />
              <View style={styles.text}>
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {b.name}
                </Text>
                {label ? (
                  <View
                    style={[
                      styles.tag,
                      label === 'OVERDUE'
                        ? { backgroundColor: brand.alert }
                        : { backgroundColor: isDark ? colors.chipBg : brand.ink },
                    ]}
                  >
                    {label === 'TODAY' && <LiveDot />}
                    <Text style={[styles.tagText, label === 'TODAY' && { color: '#FFFFFF' }]}>{label}</Text>
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
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: brand.alert },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Black', color: brand.ink, letterSpacing: 0.5 },
  amount: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black' },
});
