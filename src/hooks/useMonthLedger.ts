/**
 * useMonthLedger — one pass over the transaction list, everything home needs.
 *
 * The month's spend used to be summed inside the hero component while the
 * narrative around it was summed on the screen, which meant two places could
 * disagree about the same month. This derives all of it once, so the ring, the
 * status line, the plan bar and the insight pills are guaranteed to be talking
 * about the same numbers.
 */
import { useMemo } from 'react';
import type { Transaction } from '../types/transaction';

export interface CategoryTotal {
  name: string;
  amountPaise: number;
}

export interface MonthLedger {
  /**
   * Kept for the transit map's hub label only.
   *
   * Do NOT use this as *the* income figure. FinancialIntelligenceEngine owns
   * income — it derives the plan, the buckets and safe-to-spend from it — and
   * a second computation here put ₹1,00,000 on Home next to ₹85,000 on Money
   * Plan for the same month.
   */
  incomePaise: number;
  spendPaise: number;
  todaySpendPaise: number;
  /** This month's expense categories, largest first. */
  byCategory: CategoryTotal[];
  /** The last 7 days' expense categories, largest first. */
  weekByCategory: CategoryTotal[];
  /** This month's expenses, for the map's station detail. */
  expenses: Transaction[];
  /**
   * The previous month's spend over the same span of days (1st through
   * today's date), or null when there is no previous month on record. Compared
   * like-for-like so a partial month is never held against a whole one.
   */
  priorSpendSameSpanPaise: number | null;
}

const rank = (totals: Map<string, number>): CategoryTotal[] =>
  [...totals.entries()]
    .map(([name, amountPaise]) => ({ name, amountPaise }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

export const useMonthLedger = (
  transactions: Transaction[],
  now: Date = new Date(),
): MonthLedger => {
  // `now` defaults to a fresh Date on every render, so the memo keys off its
  // day rather than its identity — otherwise this recomputes every render.
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  return useMemo(() => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const weekStart = dayStart - 6 * 24 * 60 * 60 * 1000;

    const priorMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).getTime();
    // Same span: day 1 through the same date last month, exclusive of the day
    // after — so on the 9th we compare nine days against nine days.
    const priorSpanEnd = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate() + 1,
    ).getTime();

    let incomePaise = 0;
    let spendPaise = 0;
    let todaySpendPaise = 0;
    let priorSpend = 0;
    let sawPriorMonth = false;

    const byCategory = new Map<string, number>();
    const weekByCategory = new Map<string, number>();
    const expenses: Transaction[] = [];

    for (const t of transactions) {
      const at = new Date(t.date).getTime();

      if (at >= priorMonthStart && at < monthStart) {
        sawPriorMonth = true;
        if (t.type === 'expense' && at < priorSpanEnd) priorSpend += t.amountPaise;
      }

      if (at < monthStart) continue;

      if (t.type === 'income') {
        incomePaise += t.amountPaise;
      } else if (t.type === 'expense') {
        spendPaise += t.amountPaise;
        expenses.push(t);
        byCategory.set(
          t.category,
          (byCategory.get(t.category) ?? 0) + t.amountPaise,
        );
        if (at >= dayStart) todaySpendPaise += t.amountPaise;
        if (at >= weekStart) {
          weekByCategory.set(
            t.category,
            (weekByCategory.get(t.category) ?? 0) + t.amountPaise,
          );
        }
      }
    }

    return {
      incomePaise,
      spendPaise,
      todaySpendPaise,
      byCategory: rank(byCategory),
      weekByCategory: rank(weekByCategory),
      expenses,
      priorSpendSameSpanPaise: sawPriorMonth ? priorSpend : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, dayKey]);
};
