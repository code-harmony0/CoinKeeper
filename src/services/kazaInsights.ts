/**
 * Kaza progress framing, stats, pacing and reflections — pure and tested.
 *
 * Why chapters: with ~18,000 prayers owed a single progress ring stays
 * visually empty for months, and the goal-gradient effect says people keep
 * going when they can see themselves moving. Splitting the backlog into
 * one-year chapters (365 days of prayers) makes today's effort visible.
 */
import { dayKey, PRAYER_ORDER } from './kazaStreak';

export const DAYS_PER_CHAPTER = 365;

export interface ChapterProgress {
  chapters: number;
  /** 1-based chapter the person is working through. */
  current: number;
  /** Days of prayers made up in total (a day = one of each owed prayer). */
  daysDone: number;
  totalDays: number;
  /** Progress inside the current chapter. */
  chapterDone: number;
  chapterSize: number;
}

/** `perDay` is how many prayers make up a day (5, or 6 with Witr). */
export const chapterProgress = (completed: number, total: number, perDay: number): ChapterProgress => {
  const safePerDay = Math.max(1, perDay);
  const totalDays = Math.ceil(total / safePerDay);
  const daysDone = Math.min(totalDays, Math.floor(completed / safePerDay));
  const chapters = Math.max(1, Math.ceil(totalDays / DAYS_PER_CHAPTER));
  const currentIndex = Math.min(chapters - 1, Math.floor(daysDone / DAYS_PER_CHAPTER));
  const chapterStart = currentIndex * DAYS_PER_CHAPTER;
  const chapterSize = Math.min(DAYS_PER_CHAPTER, Math.max(1, totalDays - chapterStart));
  return {
    chapters,
    current: currentIndex + 1,
    daysDone,
    totalDays,
    chapterDone: Math.min(chapterSize, daysDone - chapterStart),
    chapterSize,
  };
};

export interface WeekStats {
  week: number;
  averagePerDay: number;
  bestDay: number;
}

/** Last 7 days (incl. today), the average over them, and the best single day ever. */
export const weekStats = (dailyCounts: Record<string, number>, now: Date = new Date()): WeekStats => {
  let week = 0;
  for (let i = 0; i < 7; i += 1) {
    week += dailyCounts[dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))] ?? 0;
  }
  return {
    week,
    averagePerDay: Math.round((week / 7) * 10) / 10,
    bestDay: Math.max(0, ...Object.values(dailyCounts)),
  };
};

/** "3 days", "5 months", "10.9 years" — how long a number of days really is. */
export const formatDuration = (days: number): string => {
  if (days < 60) return `${days} ${days === 1 ? 'day' : 'days'}`;
  if (days < 730) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
};

/** Rakat of the fard (and Hanafi wajib Witr) prayer made up for each missed prayer. */
export const RAKAT: Record<string, number> = { Fajr: 2, Dhuhr: 4, Asr: 4, Maghrib: 3, Isha: 4, Witr: 3 };

/**
 * No standard minutes-per-prayer figure exists in the sources we checked, so
 * this is our own rough estimate, shown to the user as exactly that.
 */
export const MINUTES_PER_RAKAT = 1.5;

export const totalRakat = (prayers: { name: string; pending: number }[]): number =>
  prayers.reduce((sum, p) => sum + p.pending * (RAKAT[p.name] ?? 0), 0);

export const averageRakat = (names: string[]): number =>
  names.length === 0 ? 0 : names.reduce((sum, n) => sum + (RAKAT[n] ?? 0), 0) / names.length;

/** Rakat and rough minutes for making up `perDay` prayers a day. */
export const dailyEffort = (perDay: number, avgRakat: number): { rakat: number; minutes: number } => {
  const rakat = Math.round(perDay * avgRakat);
  return { rakat, minutes: Math.round(rakat * MINUTES_PER_RAKAT) };
};

export interface TargetPlan {
  label: string;
  days: number;
  /** Prayers a day needed to finish by then. */
  perDay: number;
  finishOn: Date;
}

/** The reverse question: "I want to be done in N years — how many a day?" */
export const targetPlans = (pending: number, now: Date = new Date()): TargetPlan[] =>
  [
    { label: 'In 1 year', months: 12 },
    { label: 'In 3 years', months: 36 },
    { label: 'In 5 years', months: 60 },
    { label: 'In 10 years', months: 120 },
  ].map(({ label, months }) => {
    const days = Math.ceil(months * 30.4375);
    return {
      label,
      days,
      perDay: Math.max(1, Math.ceil(pending / days)),
      finishOn: new Date(now.getFullYear(), now.getMonth(), now.getDate() + days),
    };
  });

/** Where the person actually lands if they keep their recent average. */
export const projectedFinish = (pending: number, averagePerDay: number, now: Date = new Date()): Date | null =>
  pending > 0 && averagePerDay > 0
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.ceil(pending / averagePerDay))
    : null;

const MILESTONE_LADDER = [10, 50, 100, 250, 500, 1000, 2500, 5000];

/** The next round number to aim for — a small finish line inside a huge count. */
export const nextMilestone = (completed: number): { target: number; remaining: number } => {
  const target =
    MILESTONE_LADDER.find(m => m > completed) ?? (Math.floor(completed / 1000) + 1) * 1000;
  return { target, remaining: target - completed };
};

export interface PaceOption {
  perDay: number;
  /** null when there is nothing left to make up. */
  finishOn: Date | null;
}

export const paceOptions = (pending: number, paces: number[], now: Date = new Date()): PaceOption[] =>
  paces.map(perDay => ({
    perDay,
    finishOn:
      pending > 0 && perDay > 0
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.ceil(pending / perDay))
        : null,
  }));

/** Pace choices: a gentle one-a-day start, one after each prayer, then steps up. */
export const paceChoices = (prayersPerDay: number): number[] => [
  1,
  prayersPerDay,
  prayersPerDay * 2,
  prayersPerDay * 3,
  prayersPerDay * 5,
];

export interface ActivityDay {
  key: string;
  date: Date;
  total: number;
  /** Prayer name → count, in daily order. */
  prayers: { name: string; count: number }[];
}

/** Groups recent made-up logs by local day, newest first — the journey timeline. */
export const groupActivity = (rows: { prayer: string; date: string }[]): ActivityDay[] => {
  const byDay = new Map<string, ActivityDay>();
  for (const row of rows) {
    const when = new Date(row.date);
    const key = dayKey(when);
    const day =
      byDay.get(key) ??
      { key, date: new Date(when.getFullYear(), when.getMonth(), when.getDate()), total: 0, prayers: [] };
    day.total += 1;
    const entry = day.prayers.find(p => p.name === row.prayer);
    if (entry) entry.count += 1;
    else day.prayers.push({ name: row.prayer, count: 1 });
    byDay.set(key, day);
  }
  const rank = (name: string) => PRAYER_ORDER.indexOf(name);
  return [...byDay.values()]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(d => ({ ...d, prayers: d.prayers.sort((a, b) => rank(a.name) - rank(b.name)) }));
};

export interface Reflection {
  id: string;
  /** Arabic where the source is the Quran. */
  arabic?: string;
  text: string;
  source: string;
}

/**
 * Wording verified against Quran.com (Dr. Mustafa Khattab, The Clear Quran)
 * and Sahih al-Bukhari via sunnah.com / ihadis.com. A scholar should review
 * this list before release; add to it only from a checked source.
 */
export const REFLECTIONS: Reflection[] = [
  {
    id: 'mercy',
    arabic: 'لَا تَقۡنَطُواْ مِن رَّحۡمَةِ ٱللَّهِ',
    text: 'Do not lose hope in Allah’s mercy, for Allah certainly forgives all sins. He is indeed the All-Forgiving, Most Merciful.',
    source: 'Quran 39:53',
  },
  {
    id: 'capacity',
    arabic: 'لَا يُكَلِّفُ ٱللَّهُ نَفۡسًا إِلَّا وُسۡعَهَا',
    text: 'Allah does not require of any soul more than what it can afford.',
    source: 'Quran 2:286',
  },
  {
    id: 'consistent',
    text: 'The most beloved deed to Allah is the most regular and constant, even if it were little.',
    source: 'Sahih al-Bukhari 6464',
  },
  {
    id: 'repent',
    text: 'Allah extends His hand by night that the wrongdoer of the day may repent, and extends His hand by day that the wrongdoer of the night may repent.',
    source: 'Sahih Muslim · Riyad as-Salihin 16',
  },
  {
    id: 'remember',
    text: 'If anyone forgets a prayer, he should pray that prayer when he remembers it.',
    source: 'Sahih al-Bukhari 597',
  },
];

const dayOfYear = (d: Date): number =>
  Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);

/**
 * The reflection that fits the moment, matched like the best Qaza apps match
 * a verse to how the person is doing: hope on starting, small-and-steady after
 * a break or when a streak needs a nudge, ease when the backlog feels heavy, and a
 * rotation otherwise so the card is not the same every day.
 */
export const pickReflection = (
  ctx: { streakBroken: boolean; streakAtRisk: boolean; pending: number; hasStarted: boolean },
  now: Date = new Date(),
): Reflection => {
  const byId = (id: string) => REFLECTIONS.find(r => r.id === id) as Reflection;
  // A lapsed streak is a habit lapse, not a sin: answer it with small-and-steady.
  if (ctx.streakBroken) return byId('consistent');
  // Someone beginning after long neglect is who 39:53 speaks to.
  if (!ctx.hasStarted) return byId('mercy');
  if (ctx.pending >= 3000) return byId('capacity');
  if (ctx.streakAtRisk) return byId('consistent');
  return REFLECTIONS[dayOfYear(now) % REFLECTIONS.length];
};
