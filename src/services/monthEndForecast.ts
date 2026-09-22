import type { AnalysableTransaction } from './spendingAnalysis';

const MIN_DAYS_ELAPSED = 3;

export interface MonthEndForecast {
  projectedSpendPaise: number;
  planPaise: number;
  diffPaise: number;
  status: 'under' | 'over';
  daysRemaining: number;
}

/**
 * Where the month is headed, not just where it stands — the one thing every
 * 2026 comparison of finance apps names as the gap between a ledger and a
 * mentor. Framed against the plan, never a bank balance: CoinKeeper can see
 * 15 of 1,204 real bank SMS ever quoting one, so a balance prediction would
 * be a guess dressed as a fact.
 *
 * `spendPace` is the same idea `computePace` already uses for "today",
 * carried to month-end: today's daily average, held flat for the rest of the
 * month. `unpaidBillsPaise` is additive, not a substitute for it — a bill due
 * later this month has not yet shown up in the days already spent, so it
 * cannot already be inside that average.
 */
export const projectMonthEnd = (
  transactions: readonly AnalysableTransaction[],
  planPaise: number,
  unpaidBillsPaise: number,
  now: Date = new Date(),
): MonthEndForecast | null => {
  if (planPaise <= 0) return null;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  if (daysElapsed < MIN_DAYS_ELAPSED) return null;

  const monthPrefix = now.toISOString().slice(0, 7);
  const spentSoFarPaise = transactions
    .filter(t => t.type === 'expense' && t.date.slice(0, 7) === monthPrefix)
    .reduce((sum, t) => sum + t.amountPaise, 0);

  const daysRemaining = daysInMonth - daysElapsed;
  const dailyPace = spentSoFarPaise / daysElapsed;
  const projectedSpendPaise = Math.round(spentSoFarPaise + dailyPace * daysRemaining + unpaidBillsPaise);

  const diffPaise = planPaise - projectedSpendPaise;
  return {
    projectedSpendPaise,
    planPaise,
    diffPaise: Math.abs(diffPaise),
    status: diffPaise >= 0 ? 'under' : 'over',
    daysRemaining,
  };
};
