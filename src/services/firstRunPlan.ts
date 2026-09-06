/**
 * First-run plan — the arithmetic behind the setup flow, in one pure place.
 *
 * Onboarding's job is to leave the user with a real plan before they have any
 * transaction history: a declared salary, a savings share, and a first goal.
 * Every number the setup screen shows comes from here, so the copy on screen
 * and the rows written to the ledger can never drift apart.
 *
 * Nothing here invents money. The income figure is what the user tells us they
 * earn; the goal target and the payday share are both derived from it.
 */

/** ₹25,000 — the pre-filled figure the income step opens on. */
export const DEFAULT_MONTHLY_INCOME_PAISE = 2500000;

/** Pre-checked share of income earmarked for saving. */
export const DEFAULT_SAVINGS_PERCENT = 10;

/** One-tap income choices, so the common case never opens a keyboard. */
export const INCOME_PRESETS_PAISE = [1500000, 2500000, 4000000, 6000000];

/** How many months of income the starter safety net aims to cover. */
const SAFETY_NET_MONTHS = 2;

const roundTo = (paise: number, step: number): number =>
  Math.round(paise / step) * step;

/**
 * The starter Safety Net target: two months of income, rounded to a figure a
 * person would actually say out loud. At the default ₹25,000 income this lands
 * on ₹50,000, which is where the target sat when it was a hardcoded constant —
 * it is now derived, so a user on ₹60,000 gets a target that fits their life
 * instead of everyone else's.
 */
export const safetyNetTargetPaise = (incomePaise: number): number =>
  Math.max(1000000, roundTo(incomePaise * SAFETY_NET_MONTHS, 500000));

/** What the savings share works out to each month, to the nearest ₹100. */
export const savingsSharePaise = (
  incomePaise: number,
  percent: number,
): number => roundTo((incomePaise * percent) / 100, 10000);

/**
 * The month a salary template should start generating from, 'YYYY-MM'.
 *
 * If this month's payday has already passed, the user has been paid and the
 * template covers this month. If it hasn't, it starts next month — recording
 * income that has not arrived yet would be inventing a deposit, and
 * `syncRecurringIncome` never generates ahead of the current month anyway.
 */
export const salaryStartMonth = (dayOfMonth: number, now: Date): string => {
  const start =
    now.getDate() >= dayOfMonth
      ? now
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
};
