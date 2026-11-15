import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AlertTriangle, ArrowDownRight, CheckCircle2, Clock, Info } from 'lucide-react-native';
import { brand } from '../../theme/specTheme';
import { EXPRESSIVE } from '../../theme/motion';
import { RollingNumber } from '../anim/RollingNumber';
import { Money } from '../../utils/money';
import { PaceChart } from './PaceChart';
import { StreakStrip, type StreakDay } from './StreakStrip';
import { HeroGlow } from './HeroGlow';
import { BADGE_LADDER } from '../../services/badges';
import type { MonthLedger } from '../../hooks/useMonthLedger';
import type { HomeStatus, Tone } from '../../services/homeNarrative';
import type { Badge } from '../../services/badges';
import type { AgeOfMoney } from '../../services/ageOfMoney';

const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const SCREEN_W = Dimensions.get('window').width;

interface Props {
  ledger: MonthLedger;
  safeTodayPaise: number;
  /** The month's plan, 0 when there is no income yet. */
  planPaise: number;
  monthlyRemainingPaise: number;
  unpaidBillsPaise: number;
  streakDays: number;
  badge: Badge | null;
  ageOfMoney: AgeOfMoney | null;
  status: HomeStatus;
  replayToken?: number;
}

const toneIcon = (tone: Tone) =>
  tone === 'good' ? CheckCircle2 : tone === 'neutral' ? Info : AlertTriangle;

/**
 * Home's answer, in one glance: what is safe to spend today, why that is the
 * verdict, and the month's pace drawn against the plan. The chip row keeps the
 * streak, badge and age-of-money one line high instead of a panel of tiles.
 */
export const HeroPace: React.FC<Props> = ({
  ledger,
  safeTodayPaise,
  planPaise,
  monthlyRemainingPaise,
  unpaidBillsPaise,
  streakDays,
  badge,
  ageOfMoney,
  status,
  replayToken,
}) => {
  const StatusIcon = toneIcon(status.tone);
  // Straight-line projection of the month's spend plus what bills still owe.
  const now = new Date();
  const day = now.getDate();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = day >= 3 ? (ledger.spendPaise / day) * days + unpaidBillsPaise : 0;
  const gap = planPaise > 0 && projected > 0 ? planPaise - projected : 0;

  // Last seven days as game dots: the streak is the run of days under the
  // daily limit that ends yesterday; today is still open.
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekDots: StreakDay[] = Array.from({ length: 7 }, (_, k) => {
    const ago = 6 - k;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago);
    const label = dayLabels[d.getDay()];
    if (ago === 0) return { label, state: 'today' as const };
    return { label, state: ago <= streakDays ? ('hit' as const) : ('miss' as const) };
  });
  const streakBadges = BADGE_LADDER.filter(b => ['steady-start', 'budget-master', 'month-master'].includes(b.id));
  const streakTargets = [3, 5, 30];
  const nextIdx = streakTargets.findIndex(t => t > streakDays);
  const nextStreak = nextIdx >= 0 ? { days: streakTargets[nextIdx], label: streakBadges[nextIdx].label } : null;
  const chips: { key: string; Icon: typeof Clock; text: string }[] = [];
  if (ageOfMoney) chips.push({ key: 'age', Icon: Clock, text: ageOfMoney.label });

  return (
    <View>
      <HeroGlow />
      <Text style={[styles.label, { color: MUTED }]}>Safe to spend today</Text>
      <RollingNumber
        valuePaise={safeTodayPaise}
        fontSize={64}
        lineHeight={68}
        letterSpacing={-2}
        color={brand.signal}
        replayToken={replayToken}
      />

      <View style={styles.delta}>
        <ArrowDownRight size={16} color={MUTED} strokeWidth={2.4} style={styles.deltaIcon} />
        <Text style={[styles.deltaText, { color: MUTED }]}>
          {Money.format(ledger.todaySpendPaise, { zeroDecimals: true })} spent today
          {'  ·  '}
          {Money.format(Math.max(monthlyRemainingPaise, 0), { zeroDecimals: true })} left this month
        </Text>
      </View>

      <View style={[styles.status, status.tone === 'good' || status.tone === 'neutral' ? styles.statusCalm : styles.statusAlert]}>
        <StatusIcon size={16} color={brand.signal} strokeWidth={2.4} />
        <Text style={[styles.statusText, { color: WHITE }]} numberOfLines={2}>
          {status.headline}
        </Text>
      </View>

      <StreakStrip streakDays={streakDays} days={weekDots} next={nextStreak} />

      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((c, i) => (
            <Animated.View
              key={c.key}
              entering={FadeInDown.springify().damping(18).delay(500 + i * 80).reduceMotion(EXPRESSIVE)}
              style={styles.chip}
            >
              <c.Icon size={14} color={MUTED} strokeWidth={2.4} />
              <Text style={[styles.chipText, { color: WHITE }]} numberOfLines={1}>
                {c.text}
              </Text>
            </Animated.View>
          ))}
        </View>
      )}

      <View style={styles.chart}>
        <PaceChart
          expenses={ledger.expenses}
          planPaise={planPaise}
          width={SCREEN_W}
          replayToken={replayToken}
        />
      </View>

      {planPaise > 0 && gap !== 0 && (
        <Text style={[styles.forecast, { color: MUTED }]}>
          {gap > 0
            ? `On pace to finish ${Money.format(Math.round(gap), { zeroDecimals: true })} under plan.`
            : `On pace to run ${Money.format(Math.round(-gap), { zeroDecimals: true })} over plan.`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  number: { fontSize: 64, lineHeight: 68, fontFamily: 'Satoshi-Black', letterSpacing: -2, color: brand.signal },
  delta: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  deltaIcon: { marginTop: 2 },
  deltaText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', flexShrink: 1 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
  },
  statusCalm: { backgroundColor: 'rgba(255,255,255,0.12)' },
  statusAlert: { borderWidth: 2, borderColor: brand.signal },
  statusText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold', flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    minHeight: 32,
  },
  chipText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Bold' },
  chart: { marginHorizontal: -24, marginTop: 4, marginBottom: 20 },
  forecast: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', marginTop: 4 },
});
