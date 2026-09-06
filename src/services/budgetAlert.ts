import notifee from '@notifee/react-native';
import { CHANNELS, areNotificationsEnabled } from './notificationService';
import { getPreference, setPreference } from '../store/database';
import { FinancialIntelligenceEngine } from './FinancialIntelligenceEngine';
import { Money } from '../utils/money';

/** Preference holding the last warning sent, as "YYYY-MM:threshold". */
export const BUDGET_ALERT_PREF = 'budget_alert_sent';

/** Fractions of the month's plan worth interrupting someone for. */
const THRESHOLDS = [100, 80] as const;

export interface BudgetAlert {
  /** Dedup key, "YYYY-MM:threshold" — one warning per threshold per month. */
  key: string;
  title: string;
  body: string;
}

export const monthKeyOf = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

/**
 * Decides whether this spend is worth a notification.
 *
 * Warnings are per calendar month and per threshold, so a user hears about
 * their budget at most twice: once with room left to act, and once when the
 * plan is gone. Thresholds are checked highest-first, so a single large
 * purchase that blows the whole plan reports that, not 80%.
 */
export const decideBudgetAlert = (
  spendPaise: number,
  planPaise: number,
  lastSentKey: string | null,
  monthKey: string,
): BudgetAlert | null => {
  if (planPaise <= 0) return null;

  const percent = (spendPaise / planPaise) * 100;

  for (const threshold of THRESHOLDS) {
    if (percent < threshold) continue;

    const key = `${monthKey}:${threshold}`;
    // Escalation must still get through: having sent the 80% warning cannot
    // suppress the 100% one. Only a warning at this level or above blocks.
    const alreadyWarned = THRESHOLDS.filter(t => t >= threshold).some(
      t => lastSentKey === `${monthKey}:${t}`,
    );
    if (alreadyWarned) return null;

    if (threshold === 100) {
      const over = spendPaise - planPaise;
      return {
        key,
        title: 'Monthly plan spent',
        body:
          over > 0
            ? `You are ${Money.format(over)} over your plan for this month.`
            : 'You have spent your whole plan for this month.',
      };
    }

    return {
      key,
      title: '80% of your plan spent',
      body: `${Money.format(planPaise - spendPaise)} left for the rest of the month.`,
    };
  }

  return null;
};

/**
 * Reads the current month from the same engine the home screen uses, so the
 * warning can never disagree with the number on screen. Fire-and-forget: a
 * failure here must never cost the user their transaction.
 */
export const checkBudgetAlert = async (now: Date = new Date()): Promise<void> => {
  try {
    if (!(await areNotificationsEnabled())) return;

    const snapshot = await FinancialIntelligenceEngine.getCurrentSnapshot();

    // Total month spend, the same figure the home ring shows against the plan.
    // Summing the needs and wants buckets instead would miss any category with
    // no budget bucket set, so real overspending could never raise a warning.
    const alert = decideBudgetAlert(
      snapshot.totalExpenses,
      snapshot.safeToSpend,
      await getPreference(BUDGET_ALERT_PREF),
      monthKeyOf(now),
    );
    if (!alert) return;

    await notifee.displayNotification({
      title: alert.title,
      body: alert.body,
      android: { channelId: CHANNELS.BUDGET, pressAction: { id: 'default' } },
    });
    await setPreference(BUDGET_ALERT_PREF, alert.key);
  } catch (error) {
    console.warn('[budgetAlert] skipped:', error);
  }
};
