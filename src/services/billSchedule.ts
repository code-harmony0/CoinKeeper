/**
 * When a bill is actually due, and whether it still needs paying.
 *
 * Bills were being reasoned about as bare `dueDay` integers compared against
 * `new Date().getDate()`. That is not a date calculation, and it produced four
 * distinct wrong answers:
 *
 * 1. **A bill due on the 31st vanished in a 30-day month.** `31 < 30` is false
 *    so it was never overdue, and `31 >= 30 && 31 <= 32` put it in a month that
 *    has no 31st. Rent silently stopped being tracked in April, June, September
 *    and November.
 * 2. **Month-end went blind.** "Due soon" was `dueDay >= today && dueDay <=
 *    today + 2`. On the 30th that window is 30–32, so a bill due on the 1st —
 *    genuinely two days away — was never flagged. The warning disappeared
 *    exactly when rent was about to land.
 * 3. **Overdue never rolled over.** `dueDay < today` treats the day number as
 *    an ordinal within one month, so the concept of "last month's unpaid bill"
 *    could not be expressed.
 * 4. **"Paid" meant "paid in this calendar month"**, so paying next month's
 *    rent on the 31st marked the wrong cycle settled.
 *
 * Everything here works in whole local days, matching the rest of the app
 * (see `groupTransactionsByDate` for the same lesson learned the hard way).
 */
import type { Bill } from '../store/billStore';

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysInMonth = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * The bill's occurrence in a given month, clamped to that month's length so a
 * 31st-of-the-month bill lands on the 30th in a 30-day month rather than
 * silently rolling into the next one.
 */
const occurrenceIn = (dueDay: number, year: number, month: number): Date => {
  const probe = new Date(year, month, 1);
  return new Date(year, month, Math.min(dueDay, daysInMonth(probe)));
};

/** The next time this bill falls due, today included. */
export const nextDueDate = (dueDay: number, now: Date = new Date()): Date => {
  const today = startOfDay(now);
  const thisMonth = occurrenceIn(dueDay, now.getFullYear(), now.getMonth());
  if (thisMonth.getTime() >= today.getTime()) return thisMonth;
  return occurrenceIn(dueDay, now.getFullYear(), now.getMonth() + 1);
};

/** The most recent time this bill fell due, today included. */
export const currentCycleStart = (
  dueDay: number,
  now: Date = new Date(),
): Date => {
  const today = startOfDay(now);
  const thisMonth = occurrenceIn(dueDay, now.getFullYear(), now.getMonth());
  if (thisMonth.getTime() <= today.getTime()) return thisMonth;
  return occurrenceIn(dueDay, now.getFullYear(), now.getMonth() - 1);
};

/** Whole days from today until the next due date; 0 means today. */
export const daysUntilDue = (dueDay: number, now: Date = new Date()): number =>
  Math.round(
    (nextDueDate(dueDay, now).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );

/**
 * Settled for the cycle that is currently running — not merely "paid sometime
 * this calendar month". Paying next month's rent on the 31st settles the next
 * cycle, not this one.
 */
export const isPaidForCycle = (bill: Bill, now: Date = new Date()): boolean => {
  if (!bill.lastPaidAt) return false;
  return bill.lastPaidAt >= currentCycleStart(bill.dueDay, now).getTime();
};

export type BillStatus = 'paid' | 'overdue' | 'due-soon' | 'upcoming';

/** How many days ahead counts as "due soon". */
export const DUE_SOON_DAYS = 2;

export const billStatus = (bill: Bill, now: Date = new Date()): BillStatus => {
  if (isPaidForCycle(bill, now)) return 'paid';

  // Overdue is judged against *this month's* occurrence, not the current
  // cycle. Keying it to the cycle made every unpaid bill overdue — there is
  // always a previous cycle, so a bill due on the 12th read as overdue on the
  // 10th, which is two days before it is due at all.
  const thisMonth = occurrenceIn(bill.dueDay, now.getFullYear(), now.getMonth());
  if (thisMonth.getTime() < startOfDay(now).getTime()) return 'overdue';

  return daysUntilDue(bill.dueDay, now) <= DUE_SOON_DAYS
    ? 'due-soon'
    : 'upcoming';
};

/** Anything the user should act on now, soonest first. */
export const urgentBills = (bills: Bill[], now: Date = new Date()): Bill[] =>
  bills
    .filter(b => {
      const s = billStatus(b, now);
      return s === 'overdue' || s === 'due-soon';
    })
    .sort((a, b) => daysUntilDue(a.dueDay, now) - daysUntilDue(b.dueDay, now));

export interface DueBill {
  name: string;
  amountPaise: number;
  /** Whole days from today; 0 is today. */
  daysAway: number;
}

/**
 * Bills falling due within a window, soonest first. Used by the home hero's
 * status line as well as the bills screen, so both agree about what "due
 * soon" means.
 */
export const upcomingBills = (
  bills: Bill[],
  now: Date = new Date(),
  withinDays = 30,
): DueBill[] =>
  bills
    .map(bill => ({
      name: bill.name,
      amountPaise: bill.amountPaise,
      daysAway: daysUntilDue(bill.dueDay, now),
    }))
    .filter(b => b.daysAway <= withinDays)
    .sort((a, b) => a.daysAway - b.daysAway);

export interface BillsSummary {
  /** Still owed this cycle, paise. */
  unpaidPaise: number;
  overduePaise: number;
  dueTodayPaise: number;
  paidPaise: number;
  /** Worst state present, for colouring the hero. */
  tone: 'good' | 'warn' | 'bad';
  /** One line, in the user's terms — what is owed and what is late. */
  headline: string;
}

const inr = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

/**
 * What the bills screen must answer in three seconds: how much is still owed,
 * and is any of it late.
 *
 * The screen used to lead with the month's *budget* — a number that belongs to
 * the Money Plan and is already the "Monthly Plan" tile on Home. The largest
 * figure on a bills screen should be the bills.
 */
export const billsSummary = (
  bills: Bill[],
  now: Date = new Date(),
): BillsSummary => {
  let unpaidPaise = 0;
  let overduePaise = 0;
  let dueTodayPaise = 0;
  let paidPaise = 0;

  for (const b of bills) {
    const status = billStatus(b, now);
    if (status === 'paid') {
      paidPaise += b.amountPaise;
      continue;
    }
    unpaidPaise += b.amountPaise;
    if (status === 'overdue') overduePaise += b.amountPaise;
    else if (daysUntilDue(b.dueDay, now) === 0) dueTodayPaise += b.amountPaise;
  }

  const tone: BillsSummary['tone'] =
    overduePaise > 0 ? 'bad' : dueTodayPaise > 0 ? 'warn' : 'good';

  let headline: string;
  if (bills.length === 0) {
    headline = 'No bills tracked yet.';
  } else if (unpaidPaise === 0) {
    headline = 'Every bill is paid. Nothing owing.';
  } else if (overduePaise > 0 && dueTodayPaise > 0) {
    headline = `${inr(overduePaise)} overdue, ${inr(dueTodayPaise)} due today.`;
  } else if (overduePaise > 0) {
    headline = `${inr(overduePaise)} of it is overdue.`;
  } else if (dueTodayPaise > 0) {
    headline = `${inr(dueTodayPaise)} of it is due today.`;
  } else {
    headline = `Nothing late. ${inr(paidPaise)} already paid this month.`;
  }

  return { unpaidPaise, overduePaise, dueTodayPaise, paidPaise, tone, headline };
};
