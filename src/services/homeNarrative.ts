/**
 * Home narrative — every sentence the home hero says, derived from real ledger
 * numbers in one pure place.
 *
 * The hero used to state a bare pacing verdict ("Under pace"). A verdict is a
 * label; what the user actually needs is the consequence — how much room is
 * left, what lands next, and where the month ends if nothing changes. All of
 * that is arithmetic over data the app already has, so it lives here as pure
 * functions rather than as strings assembled inside a component.
 *
 * Nothing in this file invents a number. Every figure traces to a transaction,
 * a bill, or the month plan; where the data can't support a claim the narrative
 * says less rather than guessing.
 */

import type { Bill } from '../store/billStore';
import { upcomingBills as nextBills, daysInMonth as monthLength } from './billSchedule';

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export interface HomeStatus {
  tone: Tone;
  /**
   * The compact form shown under the ring — a glanceable clause, not a
   * sentence. A wrapping two-line paragraph in a status slot stops reading as
   * a nudge and starts reading as an error banner.
   */
  headline: string;
  /**
   * The full sentence, including the consequence. Carries the accessibility
   * label and is available where there is room for it.
   */
  message: string;
}

export interface Projection {
  /** Spend for the whole month if the current daily rate holds. */
  projectedSpendPaise: number;
  /** plan − projected, floored at 0. */
  projectedSavingsPaise: number;
}

export interface NarrativeInput {
  /** Month-to-date expense total, paise. */
  spendPaise: number;
  /** The month's spending plan, paise. 0 means no plan is set. */
  planPaise: number;
  /** Today's share of what's left, paise. */
  safeTodayPaise: number;
  /** Expenses logged today, paise. */
  todaySpendPaise: number;
  bills: Bill[];
  now?: Date;
}

// Bill scheduling — including month-end clamping and roll-forward — lives in
// services/billSchedule.ts. It was implemented here first and then again, less
// correctly, in BillsScreen; one copy now serves both.
export { upcomingBills, daysInMonth } from './billSchedule';
export type { DueBill } from './billSchedule';

/**
 * Where the month lands if today's average daily spend continues. Straight-line
 * extrapolation, which is honest about being a projection and never presented
 * as a commitment.
 */
export const project = (
  spendPaise: number,
  planPaise: number,
  now: Date = new Date(),
): Projection | null => {
  if (planPaise <= 0) return null;

  const dim = monthLength(now);
  const elapsedDays = now.getDate();
  // Day 1 has no rate to extrapolate from — one lunch would project a
  // catastrophe. Wait until there are two days of evidence.
  if (elapsedDays < 2) return null;

  const projectedSpendPaise = Math.round((spendPaise / elapsedDays) * dim);
  return {
    projectedSpendPaise,
    projectedSavingsPaise: Math.max(0, planPaise - projectedSpendPaise),
  };
};

const inr = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

const dueIn = (days: number): string =>
  days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;

/**
 * The status line under the ring, picked by what is most actionable right now.
 *
 * Order is deliberate: a problem the user can still act on today outranks a
 * commitment landing later, which outranks a summary of how the month is
 * going. Reassurance is last because it is the only one that costs nothing to
 * miss.
 */
export const buildStatus = ({
  spendPaise,
  planPaise,
  safeTodayPaise,
  todaySpendPaise,
  bills,
  now = new Date(),
}: NarrativeInput): HomeStatus => {
  if (planPaise <= 0) {
    return {
      tone: 'neutral',
      headline: 'No spending plan yet',
      message: 'Add income to set this month’s spending plan.',
    };
  }

  const remaining = planPaise - spendPaise;

  // 1. Over the month's plan outright — nothing else matters yet.
  if (remaining < 0) {
    const left = monthLength(now) - now.getDate();
    return {
      tone: 'bad',
      headline: `${inr(-remaining)} over plan`,
      message: `You’re ${inr(-remaining)} over plan with ${left} ${
        left === 1 ? 'day' : 'days'
      } to go.`,
    };
  }

  // 2. Today's allowance is spent or nearly spent — still actionable today.
  if (safeTodayPaise > 0) {
    const usedToday = todaySpendPaise / safeTodayPaise;
    if (usedToday >= 1) {
      return {
        tone: 'bad',
        headline: 'Today’s budget is spent',
        message: `Today’s ${inr(
          safeTodayPaise,
        )} is spent. Anything more comes out of the rest of the month.`,
      };
    }
    if (usedToday >= 0.6) {
      const pct = Math.round(usedToday * 100);
      return {
        tone: 'warn',
        headline: `${pct}% of today’s budget used`,
        message: `You’ve spent ${pct}% of today’s budget. ${inr(
          safeTodayPaise - todaySpendPaise,
        )} left for the rest of today.`,
      };
    }
  }

  // 3. A commitment lands soon and needs room reserved for it.
  const soon = nextBills(bills, now, 7);
  if (soon.length > 0) {
    const next = soon[0];
    return {
      tone: next.daysAway <= 1 ? 'warn' : 'neutral',
      headline: `${next.name} due ${dueIn(next.daysAway)}`,
      message: `${next.name} (${inr(next.amountPaise)}) due ${dueIn(
        next.daysAway,
      )}.`,
    };
  }

  // 4. The month is going well — say where it ends, not just that it's fine.
  const projection = project(spendPaise, planPaise, now);
  if (projection && projection.projectedSavingsPaise > 0) {
    return {
      tone: 'good',
      headline: `On track to save ${inr(projection.projectedSavingsPaise)}`,
      message: `You’re ${inr(
        remaining,
      )} under budget. At this pace you’ll finish the month with ${inr(
        projection.projectedSavingsPaise,
      )} unspent.`,
    };
  }

  return {
    tone: 'good',
    headline: bills.length === 0 ? 'No bills due' : 'Nothing due this week',
    message:
      bills.length === 0
        ? 'No bills due. You’re all set.'
        : `Nothing due this week. ${inr(remaining)} left in the plan.`,
  };
};

/* ------------------------------------------------------------------ pills */

export type PillTarget = 'transactions' | 'bills' | 'reports';

export interface InsightPill {
  id: string;
  /** lucide-react-native icon name. */
  icon: 'Wallet' | 'CalendarClock' | 'TrendingDown' | 'TrendingUp';
  label: string;
  tone: Tone;
  target: PillTarget;
}

export interface PillInput {
  /** This week's spend per category, paise, any order. */
  weekByCategory: Array<{ name: string; amountPaise: number }>;
  bills: Bill[];
  /** Month-to-date spend, paise. */
  spendPaise: number;
  /**
   * Same span of the previous month, paise — day 1 through today's date, so
   * the comparison is like-for-like rather than a partial month against a
   * whole one. Null when there is no prior month to compare against.
   */
  priorSpendSameSpanPaise: number | null;
  now?: Date;
}

const titleCase = (s: string): string =>
  s === 'unknown' ? 'Uncategorized' : s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The scrollable chips under the hero. Each is a fact the ledger can prove;
 * there is no filler chip and no chip that restates the hero's own numbers.
 */
export const buildInsightPills = ({
  weekByCategory,
  bills,
  spendPaise,
  priorSpendSameSpanPaise,
  now = new Date(),
}: PillInput): InsightPill[] => {
  const pills: InsightPill[] = [];

  const soon = nextBills(bills, now, 7);
  if (soon.length === 1) {
    pills.push({
      id: 'bill-next',
      icon: 'CalendarClock',
      label: `${soon[0].name} due ${dueIn(soon[0].daysAway)}`,
      tone: soon[0].daysAway <= 1 ? 'warn' : 'neutral',
      target: 'bills',
    });
  } else if (soon.length > 1) {
    pills.push({
      id: 'bills-upcoming',
      icon: 'CalendarClock',
      label: `${soon.length} bills due this week`,
      tone: 'neutral',
      target: 'bills',
    });
  }

  if (priorSpendSameSpanPaise !== null && priorSpendSameSpanPaise > 0) {
    const delta = spendPaise - priorSpendSameSpanPaise;
    // A swing under 5% of last month's pace is noise, not news.
    if (Math.abs(delta) / priorSpendSameSpanPaise >= 0.05) {
      pills.push(
        delta < 0
          ? {
              id: 'vs-last-month',
              icon: 'TrendingDown',
              label: `${inr(-delta)} less than last month`,
              tone: 'good',
              target: 'reports',
            }
          : {
              id: 'vs-last-month',
              icon: 'TrendingUp',
              label: `${inr(delta)} more than last month`,
              tone: 'warn',
              target: 'reports',
            },
      );
    }
  }

  for (const cat of [...weekByCategory]
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, 3)) {
    pills.push({
      id: `cat-${cat.name}`,
      icon: 'Wallet',
      label: `${titleCase(cat.name)} ${inr(cat.amountPaise)} this week`,
      tone: 'neutral',
      target: 'transactions',
    });
  }

  return pills;
};
