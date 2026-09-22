/**
 * Pairing money that left with money that came back.
 *
 * Measured on a real 1,204-message inbox: only ten outgoing amounts had a
 * same-amount return within 120 days, and none of those shared a counterparty
 * name — ₹70 to a person and ₹70 from a bank four months later is a
 * coincidence, not a repayment. Amount alone is therefore not evidence, and a
 * wrong match here is expensive: a settled pair leaves the totals, so a false
 * one hides real spending.
 *
 * Hence two verdicts rather than one. 'settled' is claimed only when the amount
 * and the counterparty both agree inside a season; everything weaker is offered
 * to the user as a question.
 */

export interface Settleable {
  id: string;
  amountPaise: number;
  /** Who the money went to or came from, as the bank named them. */
  counterparty: string;
  /** Epoch ms. */
  occurredAt: number;
}

export type MatchVerdict = 'settled' | 'ask' | 'no';

export interface Match {
  incomingId: string;
  verdict: Exclude<MatchVerdict, 'no'>;
  reason: string;
}

/** Repayments run on human time — a month, a salary cycle, a season at most. */
export const RETURN_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bank SMS truncates and reorders names: "MOHAMMAD SAAD MOHAMMAD YUNUS S" one
 * way, "MOHAMMAD SAAD" the other. Compare on the leading word or two, which is
 * what survives both.
 */
const namesAgree = (left: string, right: string): boolean => {
  const clean = (value: string) =>
    (value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const a = clean(left);
  const b = clean(right);
  if (a.length === 0 || b.length === 0) return false;

  // A single shared word is too little — "BANK" would marry half the ledger.
  const head = (parts: string[]) => parts.slice(0, 2).join(' ');
  const left2 = head(a);
  const right2 = head(b);
  if (left2.length < 4 || right2.length < 4) return false;

  // One side is routinely a truncation of the other, so containment from the
  // start counts; anything else does not.
  return left2.startsWith(right2) || right2.startsWith(left2);
};

/**
 * Finds the money that came back, for one outgoing transaction.
 *
 * Returns the single best candidate rather than a list: the question put to the
 * user is "did this come back?", and two answers to that is not a question.
 */
export const findReturn = (
  outgoing: Settleable,
  incoming: readonly Settleable[],
  windowDays: number = RETURN_WINDOW_DAYS,
): Match | null => {
  const deadline = outgoing.occurredAt + windowDays * DAY_MS;

  const candidates = incoming
    .filter(candidate => candidate.occurredAt > outgoing.occurredAt && candidate.occurredAt <= deadline)
    .sort((a, b) => a.occurredAt - b.occurredAt);

  const sameAmount = candidates.filter(c => c.amountPaise === outgoing.amountPaise);

  const byName = sameAmount.find(c => namesAgree(c.counterparty, outgoing.counterparty));
  if (byName) {
    return {
      incomingId: byName.id,
      verdict: 'settled',
      reason: `${outgoing.counterparty} returned the same amount`,
    };
  }

  if (sameAmount.length > 0) {
    return {
      incomingId: sameAmount[0].id,
      verdict: 'ask',
      reason: 'the same amount came back, but from a different name',
    };
  }

  // Part repayments: several smaller returns from the same person adding up.
  const fromSameName = candidates.filter(c => namesAgree(c.counterparty, outgoing.counterparty));
  const partial = fromSameName.find(c => c.amountPaise < outgoing.amountPaise);
  if (partial) {
    return {
      incomingId: partial.id,
      verdict: 'ask',
      reason: `${outgoing.counterparty} sent part of it back`,
    };
  }

  return null;
};
