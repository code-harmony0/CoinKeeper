/**
 * Transaction insight — the one sentence a single purchase can be told about
 * itself.
 *
 * Simply seeing spending reduces it; the effect comes from noticing a pattern,
 * not from reading a total. "₹350" tells the user nothing they didn't know
 * when they paid. "Your 4th Swiggy order this week, ₹1,240 altogether" is the
 * same data arranged so the habit is visible, which is the only part they can
 * act on.
 *
 * ## The line this must not cross
 *
 * Every string here reports arithmetic. None of them judges. "Your 4th Swiggy
 * order this week" is a fact the user can take or leave; "You're spending too
 * much on Swiggy" is a verdict nobody asked this app for, and it is how a
 * finance app gets deleted. The same rule governs `homeNarrative.buildStatus`
 * and the weekly story, and it is the reason this file has no thresholds like
 * "too many" or "excessive" anywhere in it.
 *
 * Returns null far more often than not. An insight on every row is wallpaper —
 * the user stops reading them, and the one row that mattered goes unnoticed
 * with the rest.
 */

import type { Transaction } from '../types/transaction';

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

/** Below this, "your 2nd time" is a coincidence rather than a pattern. */
const MIN_REPEAT = 3;

const inr = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

const ordinal = (n: number): string => {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : n % 10 === 1
      ? 'st'
      : n % 10 === 2
      ? 'nd'
      : n % 10 === 3
      ? 'rd'
      : 'th';
  return `${n}${suffix}`;
};

/**
 * The insight for one transaction, given the full ledger it sits in.
 *
 * `subject` is the merchant when we have one and the category otherwise —
 * "your 4th Swiggy order" beats "your 4th Food expense", but the category
 * version still surfaces a real pattern for cash spending with no merchant.
 */
export const transactionInsight = (
  tx: Transaction,
  all: Transaction[],
): string | null => {
  if (tx.type !== 'expense') return null;

  const txTime = Date.parse(tx.date);
  if (Number.isNaN(txTime)) return null;

  const merchant = tx.description?.trim();
  const useMerchant = !!merchant && merchant.toLowerCase() !== 'unknown';
  const subject = useMerchant ? merchant! : tx.category;
  if (!subject) return null;

  // The week the transaction itself falls in, not the week containing today —
  // opening an old transaction should describe the week it happened in, not
  // silently report zero because that week has scrolled out of range.
  const windowStart = txTime - WEEK_MS;

  const peers = all.filter(t => {
    if (t.type !== 'expense') return false;
    const time = Date.parse(t.date);
    if (Number.isNaN(time) || time < windowStart || time > txTime) return false;
    return useMerchant
      ? t.description?.trim().toLowerCase() === merchant!.toLowerCase()
      : t.category === tx.category;
  });

  if (peers.length < MIN_REPEAT) return null;

  const total = peers.reduce((sum, t) => sum + t.amountPaise, 0);
  return `Your ${ordinal(peers.length)} ${subject} ${
    useMerchant ? 'order' : 'expense'
  } this week — ${inr(total)} altogether.`;
};
