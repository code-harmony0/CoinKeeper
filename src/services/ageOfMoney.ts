/**
 * Age of Money — how long a rupee sits in the account before it gets spent.
 *
 * One number that captures what a dozen budget charts imply: money spent the
 * day it arrives means living paycheck to paycheck; money spent a month after
 * it arrives means living on last month's income. Nothing else on the home
 * screen says that, because every other figure is scoped to the current month
 * and this one is deliberately not.
 *
 * The method is FIFO, the same one YNAB popularised: income arrives as a lot,
 * spending draws from the oldest lot first, and an expense's age is the
 * amount-weighted age of the lots that funded it.
 *
 * Two honesty rules, both of which make this return null more often than a
 * naive version would:
 *
 * 1. **Spending we can't trace to recorded income is not aged.** If the lots
 *    run dry, the user is spending money the app never saw arrive; calling
 *    that "0 days old" would report a crisis that is really just a gap in the
 *    ledger. Those expenses are skipped, not scored.
 * 2. **A handful of expenses is not a trend.** Under `MIN_SAMPLES` funded
 *    expenses this returns null and the caller shows nothing, rather than
 *    printing a confident number derived from three transactions.
 */

import type { Transaction } from '../types/transaction';
import type { Tone } from './homeNarrative';

const DAY_MS = 86400000;

/** How many recent expenses the score averages over. */
const WINDOW = 10;

/** Below this many funded expenses there is no trend to report. */
const MIN_SAMPLES = 3;

export interface AgeOfMoney {
  /** Whole days, amount-weighted, over the most recent funded expenses. */
  days: number;
  tone: Tone;
  /** The hero's phrasing — a clause, not a sentence. */
  label: string;
}

interface Lot {
  time: number;
  remaining: number;
}

/**
 * Bands, and why there are only three: the app's `Tone` vocabulary is
 * good/warn/bad, and a fourth intermediate band would need a colour that
 * doesn't exist in the palette. Thirty days is the goal — a full month of
 * buffer — and a week is the line below which a single late payment hurts.
 */
const toneFor = (days: number): Tone =>
  days >= 30 ? 'good' : days >= 7 ? 'warn' : 'bad';

/**
 * The amount-weighted age of one expense, consuming the lots that fund it.
 * Returns null when the lots can't cover it — see honesty rule 1.
 */
const ageExpense = (lots: Lot[], amount: number, time: number): number | null => {
  let outstanding = amount;
  let weightedDays = 0;

  for (const lot of lots) {
    if (outstanding <= 0) break;
    if (lot.remaining <= 0) continue;

    const drawn = Math.min(lot.remaining, outstanding);
    weightedDays += drawn * ((time - lot.time) / DAY_MS);
    lot.remaining -= drawn;
    outstanding -= drawn;
  }

  if (outstanding > 0) return null;
  return weightedDays / amount;
};

/**
 * Null when the ledger can't support a claim — no income on record, too few
 * traceable expenses, or a history short enough that one big purchase would
 * swing the figure.
 *
 * `transfer_to_goal` is neither income nor spending here. Money moved to a
 * goal has not left the household; counting it as spending would make a user
 * who saves diligently look like a user who spends the day they are paid.
 */
export const computeAgeOfMoney = (
  transactions: Transaction[],
  now: Date = new Date(),
): AgeOfMoney | null => {
  const ordered = [...transactions]
    .filter(t => t.type === 'income' || t.type === 'expense')
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const lots: Lot[] = [];
  const ages: number[] = [];
  const nowTime = now.getTime();

  for (const t of ordered) {
    const time = Date.parse(t.date);
    if (Number.isNaN(time) || time > nowTime) continue;

    if (t.type === 'income') {
      lots.push({ time, remaining: t.amountPaise });
      continue;
    }

    if (t.amountPaise <= 0) continue;
    const age = ageExpense(lots, t.amountPaise, time);
    if (age !== null) ages.push(age);
  }

  if (ages.length < MIN_SAMPLES) return null;

  const window = ages.slice(-WINDOW);
  const days = Math.round(window.reduce((a, b) => a + b, 0) / window.length);

  return {
    days,
    tone: toneFor(days),
    label: days === 1 ? 'Money is 1 day old' : `Money is ${days} days old`,
  };
};
