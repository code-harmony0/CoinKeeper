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

/**
 * The next time this bill falls due, today included.
 *
 * `intervalMonths` and `anchor` generalise this beyond monthly bills: a
 * half-yearly or yearly one only falls due in specific months (the ones the
 * anchor — normally the bill's own last due date — actually landed on), not
 * every month whose day-of-month happens to match. Both default to plain
 * monthly behaviour, identical to before either parameter existed.
 */
export const nextDueDate = (
  dueDay: number,
  now: Date = new Date(),
  intervalMonths = 1,
  anchor: Date = now,
): Date => {
  const today = startOfDay(now);
  const year = anchor.getFullYear();
  let month = anchor.getMonth();
  let date = occurrenceIn(dueDay, year, month);

  // JS Date normalises a month past 11 into the following year, so stepping
  // needs no manual carry — `occurrenceIn(dueDay, year, 14)` is already March
  // of `year + 1`.
  while (date.getTime() < today.getTime()) {
    month += intervalMonths;
    date = occurrenceIn(dueDay, year, month);
  }
  return date;
};

/**
 * The occurrence that belongs to whichever cycle today falls inside —
 * regardless of whether that occurrence's day-of-month has actually passed
 * yet. For a monthly bill this is always "this month's due day", exactly as
 * before either parameter existed: a bill due on the 25th is judged against
 * the 25th all month, whether today is the 1st or the 26th.
 *
 * `intervalMonths` and `anchor` place that same idea on a longer cycle: a
 * half-yearly bill anchored to April is "inside" the April cycle every month
 * from April through September, not just in April itself.
 */
export const currentCycleStart = (
  dueDay: number,
  now: Date = new Date(),
  intervalMonths = 1,
  anchor: Date = now,
): Date => {
  const elapsedMonths =
    (now.getFullYear() - anchor.getFullYear()) * 12 + (now.getMonth() - anchor.getMonth());
  const windowIndex = Math.floor(elapsedMonths / intervalMonths);
  return occurrenceIn(dueDay, anchor.getFullYear(), anchor.getMonth() + windowIndex * intervalMonths);
};

/** Whole days from today until the next due date; 0 means today. */
export const daysUntilDue = (
  dueDay: number,
  now: Date = new Date(),
  intervalMonths = 1,
  anchor: Date = now,
): number =>
  Math.round(
    (nextDueDate(dueDay, now, intervalMonths, anchor).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );

/**
 * A bill's own cadence and anchor, pulled from the record itself. Absent
 * `intervalMonths` means monthly; a bill with no payment history yet anchors
 * to today, exactly as every bill behaved before either field existed.
 */
const cadenceOf = (bill: Bill, now: Date): { intervalMonths: number; anchor: Date } => ({
  intervalMonths: bill.intervalMonths ?? 1,
  anchor: bill.lastPaidAt ? new Date(bill.lastPaidAt) : now,
});

/**
 * Settled for the cycle that is currently running — not merely "paid sometime
 * this calendar month". Paying next month's rent on the 31st settles the next
 * cycle, not this one. For a half-yearly bill, the payment that last covered
 * it settles every month in between too: it is not "due" again until the
 * cycle actually comes back around.
 */
export const isPaidForCycle = (bill: Bill, now: Date = new Date()): boolean => {
  if (!bill.lastPaidAt) return false;
  const { intervalMonths, anchor } = cadenceOf(bill, now);
  return bill.lastPaidAt >= currentCycleStart(bill.dueDay, now, intervalMonths, anchor).getTime();
};

export type BillStatus = 'paid' | 'overdue' | 'due-soon' | 'upcoming';

/** How many days ahead counts as "due soon". */
export const DUE_SOON_DAYS = 2;

export const billStatus = (bill: Bill, now: Date = new Date()): BillStatus => {
  if (isPaidForCycle(bill, now)) return 'paid';

  const { intervalMonths, anchor } = cadenceOf(bill, now);

  // Overdue is judged against the *current cycle's* occurrence, not simply
  // "this calendar month" — a half-yearly bill is not due every month its
  // day-of-month matches. Keying this to a raw previous cycle made every
  // unpaid bill overdue, since there is always one; this only fires once the
  // bill's own cycle has actually started.
  const cycleStart = currentCycleStart(bill.dueDay, now, intervalMonths, anchor);
  if (cycleStart.getTime() < startOfDay(now).getTime()) return 'overdue';

  return daysUntilDue(bill.dueDay, now, intervalMonths, anchor) <= DUE_SOON_DAYS
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
    .sort((a, b) => {
      const ca = cadenceOf(a, now);
      const cb = cadenceOf(b, now);
      return (
        daysUntilDue(a.dueDay, now, ca.intervalMonths, ca.anchor) -
        daysUntilDue(b.dueDay, now, cb.intervalMonths, cb.anchor)
      );
    });

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
    .map(bill => {
      const { intervalMonths, anchor } = cadenceOf(bill, now);
      return {
        name: bill.name,
        amountPaise: bill.amountPaise,
        daysAway: daysUntilDue(bill.dueDay, now, intervalMonths, anchor),
      };
    })
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
    else {
      const { intervalMonths, anchor } = cadenceOf(b, now);
      if (daysUntilDue(b.dueDay, now, intervalMonths, anchor) === 0) dueTodayPaise += b.amountPaise;
    }
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
