import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ArrowDownRight, CheckCircle2, Info } from 'lucide-react-native';
import { brand, onInk } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { RollingNumber } from '../anim/RollingNumber';
import { Money } from '../../utils/money';
import { PaceChart } from './PaceChart';
import { StreakStrip, weekDots } from './StreakStrip';
import { HeroGlow } from './HeroGlow';
import type { MonthLedger } from '../../hooks/useMonthLedger';
import type { HomeStatus, Tone } from '../../services/homeNarrative';

const SCREEN_W = Dimensions.get('window').width;

interface Props {
  ledger: MonthLedger;
  safeTodayPaise: number;
  /** The month's plan, 0 when there is no income yet. */
  planPaise: number;
  monthlyRemainingPaise: number;
  unpaidBillsPaise: number;
  streakDays: number;
  /** The one next goal, shared with the badge shelf. */
  nextGoal: { label: string; hint: string } | null;
  status: HomeStatus;
  /** Bills needing action, so the hero can say it before anything else. */
  alert: { overdue: number; today: number };
  onAlertPress: () => void;
  /** No income yet: show the first step instead of a meaningless ₹0. */
  needsIncome: boolean;
  onAddIncome: () => void;
  replayToken?: number;
}

const toneIcon = (tone: Tone) =>
  tone === 'good' ? CheckCircle2 : tone === 'neutral' ? Info : AlertTriangle;

const alertText = ({ overdue, today }: { overdue: number; today: number }) =>
  [overdue > 0 && `${overdue} overdue`, today > 0 && `${today} due today`].filter(Boolean).join(' · ');

/**
 * Home's answer, in one glance and in this order: what is safe to spend today,
 * the arithmetic behind it in plain words, what needs action, how your streak
 * stands, and the month's spending against the plan. Warnings use the alert
 * colour; yellow is reserved for the number, the chart line and rewards.
 */
export const HeroPace: React.FC<Props> = ({
  ledger,
  safeTodayPaise,
  planPaise,
  monthlyRemainingPaise,
  unpaidBillsPaise,
  streakDays,
  nextGoal,
  status,
  alert,
  onAlertPress,
  needsIncome,
  onAddIncome,
  replayToken,
}) => {
  const StatusIcon = toneIcon(status.tone);
  const now = new Date();
  const day = now.getDate();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Same days-left the engine divides by, so the line below can never disagree
  // with the number above it.
  const daysLeft = Math.max(1, days - day);
  const hasAlert = alert.overdue + alert.today > 0;

  const projected = day >= 3 ? (ledger.spendPaise / day) * days + unpaidBillsPaise : 0;
  const gap = planPaise > 0 && projected > 0 ? planPaise - projected : 0;

  const dots = weekDots(streakDays, now);

  if (needsIncome) {
    return (
      <View>
        <HeroGlow />
        <Text style={styles.label}>Safe to spend today</Text>
        <Text style={styles.firstRun}>
          Add your income and we will show what is safe to spend each day.
        </Text>
        <PressableScale
          onPress={onAddIncome}
          accessibilityRole="button"
          accessibilityLabel="Add your income"
          style={styles.firstRunButton}
        >
          <Text style={styles.firstRunButtonText}>Add income</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View>
      <HeroGlow />
      <Text style={styles.label}>Safe to spend today</Text>
      <RollingNumber
        valuePaise={safeTodayPaise}
        fontSize={64}
        lineHeight={68}
        letterSpacing={-2}
        color={brand.signal}
        replayToken={replayToken}
      />

      <View style={styles.math}>
        <ArrowDownRight size={16} color={onInk.mid} strokeWidth={1.9} style={styles.mathIcon} />
        <Text style={styles.mathText}>
          {monthlyRemainingPaise > 0
            ? `${Money.format(monthlyRemainingPaise, { zeroDecimals: true })} left this month ÷ ${daysLeft} ${
                daysLeft === 1 ? 'day' : 'days'
              }`
            : 'No budget left this month'}
          {'  ·  '}
          {Money.format(ledger.todaySpendPaise, { zeroDecimals: true })} spent today
        </Text>
      </View>

      {hasAlert ? (
        <PressableScale
          onPress={onAlertPress}
          accessibilityRole="button"
          accessibilityLabel={`${alertText(alert)}. Open bills`}
          style={[styles.pill, styles.pillAlert]}
        >
          <AlertTriangle size={16} color={brand.alert} strokeWidth={1.9} />
          <Text style={styles.pillText}>{alertText(alert)}</Text>
        </PressableScale>
      ) : (
        <View style={[styles.pill, styles.pillCalm]}>
          <StatusIcon size={16} color={onInk.high} strokeWidth={1.9} />
          <Text style={styles.pillText} numberOfLines={2}>
            {status.headline}
          </Text>
        </View>
      )}

      <StreakStrip streakDays={streakDays} days={dots} next={nextGoal} compact />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <Text style={styles.legendText}>Your spending</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDash} />
          <Text style={styles.legendText}>Plan for the month</Text>
        </View>
      </View>
      <View style={styles.chart}>
        <PaceChart
          expenses={ledger.expenses}
          planPaise={planPaise}
          width={SCREEN_W}
          replayToken={replayToken}
        />
      </View>

      {planPaise > 0 && gap !== 0 && (
        <Text style={styles.outlook}>
          {gap > 0
            ? `At this rate you finish the month ${Money.format(Math.round(gap), { zeroDecimals: true })} under plan, after bills.`
            : `At this rate you finish the month ${Money.format(Math.round(-gap), { zeroDecimals: true })} over plan, after bills.`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  math: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  mathIcon: { marginTop: 2 },
  mathText: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 12,
    minHeight: 40,
    marginTop: 16,
  },
  pillAlert: { borderWidth: 2, borderColor: brand.alert },
  pillCalm: { backgroundColor: onInk.fill },
  pillText: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold', color: onInk.high },
  legend: { flexDirection: 'row', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2, backgroundColor: brand.signal },
  legendDash: { width: 16, height: 0, borderTopWidth: 1.5, borderColor: onInk.low, borderStyle: 'dashed' },
  legendText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium', color: onInk.mid },
  chart: { marginHorizontal: -24, marginTop: 4, marginBottom: 20 },
  outlook: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid, marginTop: 4 },
  firstRun: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold', color: onInk.high, marginTop: 8, maxWidth: 320 },
  firstRunButton: {
    alignSelf: 'flex-start',
    minHeight: 56,
    borderRadius: 999,
    paddingHorizontal: 28,
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: brand.signal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstRunButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold', color: brand.ink },
});
