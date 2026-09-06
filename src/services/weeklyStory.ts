/**
 * Weekly Money Story — the week, in three sentences the ledger can prove.
 *
 * The home screen answers "can I spend right now?". This answers a different
 * question, once a week: "how did that go?" It is the only surface in the app
 * that looks backward, and it exists because a week is the shortest span over
 * which a spending habit is visible at all — a single day is noise, a month
 * arrives too late to change anything.
 *
 * Structure is fixed so the story is scannable at a glance: a headline figure,
 * a comparison, and one observation. Each line is dropped rather than padded
 * when the data can't support it, so a first-week user gets a short story
 * instead of a fabricated one. `buildStatus` in homeNarrative.ts follows the
 * same rule and for the same reason.
 *
 * The tone rules from the notification spec apply here too: this reports, it
 * never scolds. "You spent more than last week" is a fact. "You overspent" is
 * a verdict, and a verdict the user didn't ask for is how finance apps get
 * deleted.
 */

import type { Transaction } from '../types/transaction';
import type { Tone } from './homeNarrative';

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

export interface WeeklyStory {
  /** Total spend over the last seven days, paise. */
  spendPaise: number;
  /** The lead sentence — always present. */
  headline: string;
  /**
   * Week-on-week comparison, or null when there is no prior week on record.
   * Never phrased as praise or blame, only as direction.
   */
  comparison: string | null;
  /** One observation worth making — the week's biggest category, or a quiet week. */
  observation: string | null;
  /** Colours the card's accent. Neutral whenever there's nothing to compare. */
  tone: Tone;
}

const inr = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

interface Window {
  spendPaise: number;
  byCategory: Map<string, number>;
  count: number;
}

const summarise = (
  transactions: Transaction[],
  from: number,
  to: number,
): Window => {
  const w: Window = { spendPaise: 0, byCategory: new Map(), count: 0 };

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const time = Date.parse(t.date);
    if (Number.isNaN(time) || time < from || time >= to) continue;

    w.spendPaise += t.amountPaise;
    w.count += 1;
    w.byCategory.set(
      t.category,
      (w.byCategory.get(t.category) ?? 0) + t.amountPaise,
    );
  }

  return w;
};

/**
 * Null when the week holds nothing worth telling a story about. An empty week
 * is not a story, and a card that says "you spent ₹0" on a week the user
 * simply didn't log anything is worse than no card.
 */
export const buildWeeklyStory = (
  transactions: Transaction[],
  now: Date = new Date(),
): WeeklyStory | null => {
  const end = now.getTime();
  const thisWeek = summarise(transactions, end - WEEK_MS, end);
  if (thisWeek.count === 0) return null;

  const priorStart = end - 2 * WEEK_MS;
  const prior = summarise(transactions, priorStart, end - WEEK_MS);

  // A prior week with nothing in it is an absence of data, not a week of zero
  // spending — comparing against it would manufacture a dramatic increase out
  // of the user simply having installed the app eight days ago.
  const hasPrior = prior.count > 0;
  const delta = thisWeek.spendPaise - prior.spendPaise;

  let comparison: string | null = null;
  let tone: Tone = 'neutral';

  if (hasPrior) {
    const magnitude = Math.abs(delta);
    // Under a tenth of the prior week is noise. Reporting a 3% drift as news
    // trains the user that the card is not worth reading.
    if (magnitude < prior.spendPaise * 0.1) {
      comparison = 'About the same as the week before.';
      tone = 'neutral';
    } else if (delta < 0) {
      comparison = `${inr(magnitude)} less than the week before.`;
      tone = 'good';
    } else {
      comparison = `${inr(magnitude)} more than the week before.`;
      tone = 'warn';
    }
  }

  let observation: string | null = null;
  const ranked = [...thisWeek.byCategory.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 0) {
    const [name, amount] = ranked[0];
    const share = Math.round((amount / thisWeek.spendPaise) * 100);
    // A single category only deserves a callout when it actually dominates.
    // Below a third it is just the largest of several similar things.
    if (share >= 33) {
      observation = `${name} was ${share}% of it — ${inr(amount)}.`;
    }
  }

  return {
    spendPaise: thisWeek.spendPaise,
    headline: `You spent ${inr(thisWeek.spendPaise)} this week.`,
    comparison,
    observation,
    tone,
  };
};
