/**
 * Round-ups — saving the change, so saving costs no decision.
 *
 * A ₹47 chai becomes ₹50, and ₹3 goes to a goal. The amount is trivial by
 * design: the point is not the ₹3, it is that the user never had to decide to
 * save it. Roughly a rupee a day of invisible saving beats a monthly transfer
 * the user has to remember, resent, and eventually stop making.
 *
 * ## What "saving" means here, precisely
 *
 * CoinKeeper never holds or moves money. A round-up does not touch the user's
 * bank account — it records an earmark in our own ledger, exactly as a manual
 * "add to goal" does, and the user moves the real money themselves whenever
 * they choose. Every string in this module has to survive that reading: we may
 * say a goal grew, never that we transferred anything.
 *
 * ## Why ₹10 and not ₹100
 *
 * At ₹100 a ₹47 chai would earmark ₹53 — more than the purchase, which stops
 * being invisible and starts being a second spending decision. Invisible is
 * the whole mechanic; the moment a user notices the round-up hurting, they
 * turn it off. ₹10 keeps the median round-up near ₹5.
 */

import { getPreference, setPreference } from '../store/database';
import { FinancialLedgerService } from './FinancialLedgerService';

/** Round to the nearest ₹10. See the module note on why not ₹100. */
export const ROUND_TO_PAISE = 1000;

/**
 * What a purchase would earmark, in paise. Zero when the amount already lands
 * on the step — an exact ₹50 lunch rounds up by nothing, and offering a ₹0
 * round-up would be noise on the save bar.
 */
export const roundUpPaise = (
  amountPaise: number,
  stepPaise: number = ROUND_TO_PAISE,
): number => {
  if (amountPaise <= 0 || stepPaise <= 0) return 0;
  const remainder = amountPaise % stepPaise;
  return remainder === 0 ? 0 : stepPaise - remainder;
};

/**
 * The ledger note a round-up carries, so it is legible a month later in a list
 * of goal contributions. Names the merchant when we have one — "Round-up from
 * Swiggy" is a memory, "Round-up" is a mystery.
 */
export const roundUpNote = (merchant?: string): string =>
  merchant && merchant.trim().length > 0
    ? `Round-up from ${merchant.trim()}`
    : 'Round-up';

/**
 * A year of this habit, for the settings "why" copy. Deliberately framed as
 * what it becomes rather than what it costs, and deliberately approximate —
 * this is an illustration, not a projection of the user's own data.
 */
export const annualisedPaise = (typicalRoundUpPaise: number): number =>
  typicalRoundUpPaise * 365;

/**
 * Which goal the change lands in.
 *
 * The emergency fund wins whenever one exists, matching `rankGoalPriority`'s
 * "emergency fund always comes first" rule — a user with a safety net and a
 * holiday fund is not asking for their spare change to buy a holiday. There is
 * deliberately no picker at save time: a round-up the user has to route is a
 * decision, and the entire mechanic is built on there being no decision.
 */
export const pickRoundUpGoal = <T extends { isEmergencyFund?: boolean }>(
  goals: T[],
): T | null =>
  goals.find(g => g.isEmergencyFund) ?? goals[0] ?? null;

const ENABLED_KEY = 'roundups_enabled';

/**
 * Default ON. This is the smart-default rule doing its work: at onboarding the
 * user opted in at peak motivation, and someone who never touched the setting
 * gets the behaviour they were shown rather than silence.
 */
export const isRoundUpEnabled = async (): Promise<boolean> =>
  (await getPreference(ENABLED_KEY)) !== 'false';

export const setRoundUpEnabled = async (enabled: boolean): Promise<void> =>
  setPreference(ENABLED_KEY, enabled ? 'true' : 'false');

/**
 * Earmarks the change from a purchase, returning what was earmarked (paise) or
 * 0 if nothing was.
 *
 * Never throws. A failed round-up must not surface as a failed *transaction* —
 * the expense is the thing the user asked to record, and losing it because a
 * ₹3 bonus write failed would be an absurd trade. Callers save first, then
 * call this.
 */
export const applyRoundUp = async (
  amountPaise: number,
  merchant: string | undefined,
  goals: Array<{ id: string; isEmergencyFund?: boolean }>,
): Promise<number> => {
  try {
    if (!(await isRoundUpEnabled())) return 0;

    const delta = roundUpPaise(amountPaise);
    if (delta === 0) return 0;

    const goal = pickRoundUpGoal(goals);
    if (!goal) return 0;

    await FinancialLedgerService.fundGoal(goal.id, delta, roundUpNote(merchant));
    return delta;
  } catch (e) {
    console.error('[roundUp] could not earmark change', e);
    return 0;
  }
};
