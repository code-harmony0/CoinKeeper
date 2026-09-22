/**
 * What the ledger knows about a person's habits, worked out rather than asked.
 *
 * Written against a real 532-transaction ledger where 94% of spending carried
 * no usable category and the biggest payees were people, not shops. Category
 * pies and merchant keywords say nothing about money like that. Repetition,
 * fees and sudden months do.
 *
 * Pure functions over rows: no database, no model, no network. Every figure
 * traces back to a transaction the user can open.
 */

export interface AnalysableTransaction {
  id: string;
  amountPaise: number;
  type: 'income' | 'expense' | 'transfer_to_goal';
  description?: string;
  category?: string;
  date: string;
}

export interface RecurringPayment {
  payee: string;
  amountPaise: number;
  times: number;
  lastSeen: string;
  /** Total handed over so far — the number that changes minds. */
  totalPaise: number;
  /** Every date this payment landed, oldest first. */
  dates: string[];
}

export interface FeeSummary {
  totalPaise: number;
  count: number;
  /** Largest first: people act on the biggest one. */
  examples: { description: string; amountPaise: number; date: string }[];
}

export interface MonthSpend {
  month: string;
  spentPaise: number;
}

export interface PayeeSummary {
  payee: string;
  paidPaise: number;
  receivedPaise: number;
  times: number;
}

/** Three occurrences is where coincidence stops and a habit starts. */
const RECURRING_MIN_TIMES = 3;

/**
 * Bank charges hide in the description because no bank sends them as a
 * category. These are the words Indian banks actually use.
 */
const FEE_WORDS =
  /\b(fee|fees|charge|charges|charged|penalty|penalties|gst|min(?:imum)?\s*bal|low\s*balance|non[- ]maintenance|amc|annual\s*maintenance)\b/i;

/**
 * Billers round differently month to month — Airtel's Wi-Fi plan arrived as
 * both ₹3,003 and ₹3,004 and was reported as two separate habits. Grouping to
 * the nearest ₹10 keeps one bill one bill.
 */
const amountBucket = (paise: number): number => Math.round(paise / 1000);

const monthOf = (iso: string): string => iso.slice(0, 7);

const nameOf = (tx: AnalysableTransaction): string => (tx.description ?? '').trim();

const spends = (list: readonly AnalysableTransaction[]) =>
  list.filter(t => t.type === 'expense');

/**
 * Payments that repeat at the same amount to the same payee.
 *
 * Deliberately not restricted to things the user called a subscription: a
 * ₹708 bank fee charged six times is a subscription in all but name, and it is
 * the one they would most want to see.
 */
export const findRecurring = (
  transactions: readonly AnalysableTransaction[],
): RecurringPayment[] => {
  const groups = new Map<string, AnalysableTransaction[]>();

  for (const tx of spends(transactions)) {
    const payee = nameOf(tx);
    if (!payee) continue;
    const key = `${payee.toLowerCase()}|${amountBucket(tx.amountPaise)}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(tx);
    else groups.set(key, [tx]);
  }

  const found: RecurringPayment[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length < RECURRING_MIN_TIMES) continue;
    const sorted = [...bucket].sort((a, b) => a.date.localeCompare(b.date));
    // Show the amount actually charged most often, not whichever came first.
    const counts = new Map<number, number>();
    sorted.forEach(tx => counts.set(tx.amountPaise, (counts.get(tx.amountPaise) ?? 0) + 1));
    const usual = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    found.push({
      payee: nameOf(sorted[0]),
      amountPaise: usual,
      times: sorted.length,
      lastSeen: sorted[sorted.length - 1].date,
      totalPaise: sorted.reduce((sum, tx) => sum + tx.amountPaise, 0),
      dates: sorted.map(tx => tx.date),
    });
  }

  return found.sort((a, b) => b.totalPaise - a.totalPaise);
};

/**
 * Money the bank took, rather than money the user spent.
 *
 * On the ledger this was written against, six ₹708 charges for not holding a
 * minimum balance had passed unnoticed — ₹4,248 the user never chose to spend.
 */
export const findFees = (transactions: readonly AnalysableTransaction[]): FeeSummary => {
  const fees = spends(transactions).filter(tx => FEE_WORDS.test(nameOf(tx)));

  return {
    totalPaise: fees.reduce((sum, tx) => sum + tx.amountPaise, 0),
    count: fees.length,
    examples: [...fees]
      .sort((a, b) => b.amountPaise - a.amountPaise)
      .slice(0, 3)
      .map(tx => ({ description: nameOf(tx), amountPaise: tx.amountPaise, date: tx.date })),
  };
};

/** Spending per calendar month, oldest first. */
export const spendByMonth = (transactions: readonly AnalysableTransaction[]): MonthSpend[] => {
  const totals = new Map<string, number>();
  for (const tx of spends(transactions)) {
    const month = monthOf(tx.date);
    totals.set(month, (totals.get(month) ?? 0) + tx.amountPaise);
  }
  return [...totals.entries()]
    .map(([month, spentPaise]) => ({ month, spentPaise }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * A month that stands out against the user's own history.
 *
 * Compared to the median rather than the mean, because one ₹1.47L month drags
 * an average up until nothing ever looks unusual again.
 */
export const findSpendingSpike = (
  transactions: readonly AnalysableTransaction[],
  multiple = 2,
): { month: MonthSpend; medianPaise: number } | null => {
  const months = spendByMonth(transactions);
  if (months.length < 3) return null;

  const latest = months[months.length - 1];
  const previous = months.slice(0, -1).map(m => m.spentPaise).sort((a, b) => a - b);
  const median = previous[Math.floor(previous.length / 2)];
  if (median <= 0 || latest.spentPaise < median * multiple) return null;

  return { month: latest, medianPaise: median };
};

/** Who the money actually goes to, both directions, biggest first. */
export const summarisePayees = (
  transactions: readonly AnalysableTransaction[],
): PayeeSummary[] => {
  const totals = new Map<string, PayeeSummary>();

  for (const tx of transactions) {
    const payee = nameOf(tx);
    if (!payee || tx.type === 'transfer_to_goal') continue;

    const entry = totals.get(payee) ?? { payee, paidPaise: 0, receivedPaise: 0, times: 0 };
    if (tx.type === 'expense') entry.paidPaise += tx.amountPaise;
    else entry.receivedPaise += tx.amountPaise;
    entry.times += 1;
    totals.set(payee, entry);
  }

  return [...totals.values()].sort((a, b) => b.paidPaise - a.paidPaise);
};

/**
 * How much of the ledger the app can actually explain.
 *
 * Reported honestly because the alternative is a category chart built on a
 * tenth of the money, which looks authoritative and is wrong.
 */
export const categoryCoverage = (
  transactions: readonly AnalysableTransaction[],
): { namedPaise: number; unnamedPaise: number; unnamedShare: number } => {
  const expenses = spends(transactions);
  const total = expenses.reduce((sum, tx) => sum + tx.amountPaise, 0);

  const unnamed = expenses
    .filter(tx => {
      const category = (tx.category ?? '').trim().toLowerCase();
      return !category || category === 'other' || category === 'others' || category === 'unknown';
    })
    .reduce((sum, tx) => sum + tx.amountPaise, 0);

  return {
    namedPaise: total - unnamed,
    unnamedPaise: unnamed,
    unnamedShare: total > 0 ? unnamed / total : 0,
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The day of the month a repeating payment usually lands, or null when the
 * repetition is not monthly. Gaps must mostly sit between 25 and 35 days:
 * billing dates drift by a day or two, but a weekly top-up is not a bill.
 */
export const inferMonthlyDueDay = (dates: readonly string[]): number | null => {
  if (dates.length < 3) return null;

  const sorted = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((t, i) => (t - sorted[i]) / DAY_MS);
  const monthly = gaps.filter(g => g >= 25 && g <= 35).length;
  if (monthly < Math.ceil(gaps.length * 0.6)) return null;

  const days = sorted.map(t => new Date(t).getDate()).sort((a, b) => a - b);
  return days[Math.floor(days.length / 2)];
};

export interface PaymentSchedule {
  /** How many months between payments — 1, 3, 6 or 12. */
  intervalMonths: number;
  dueDay: number;
}

/**
 * A day-of-month tolerance band per cadence: billing dates drift by a day or
 * two around the real interval, but a weekly top-up must never be read as
 * "roughly monthly". Checked smallest first, so a genuinely monthly bill is
 * never mistaken for a loose quarterly one.
 */
const SCHEDULE_BANDS: { intervalMonths: number; minDays: number; maxDays: number }[] = [
  { intervalMonths: 1, minDays: 25, maxDays: 35 },
  { intervalMonths: 3, minDays: 80, maxDays: 100 },
  { intervalMonths: 6, minDays: 165, maxDays: 200 },
  { intervalMonths: 12, minDays: 350, maxDays: 380 },
];

/**
 * Works out how often a repeating payment actually falls due — monthly,
 * quarterly, half-yearly or yearly — instead of assuming every bill is
 * monthly. Written after a 6-monthly Wi-Fi advance rental went unrecognised
 * as a bill because `inferMonthlyDueDay` only ever looked for a ~30-day gap.
 */
export const inferSchedule = (dates: readonly string[]): PaymentSchedule | null => {
  if (dates.length < 3) return null;

  const sorted = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((t, i) => (t - sorted[i]) / DAY_MS);
  const threshold = Math.ceil(gaps.length * 0.6);

  const band = SCHEDULE_BANDS.find(
    b => gaps.filter(g => g >= b.minDays && g <= b.maxDays).length >= threshold,
  );
  if (!band) return null;

  const days = sorted.map(t => new Date(t).getDate()).sort((a, b) => a - b);
  return { intervalMonths: band.intervalMonths, dueDay: days[Math.floor(days.length / 2)] };
};
