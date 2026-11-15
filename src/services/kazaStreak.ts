/**
 * Kaza streak, history and milestones — pure, so every rule is testable.
 *
 * Design (from how Qaza trackers and habit research treat streaks):
 *  - A day counts when at least one prayer is made up. The daily goal is a
 *    separate target; the streak asks for the smallest real step.
 *  - Forgiving by default: one missed day in any 7 is bridged, and "rest
 *    days" (period, travel, illness) pause the streak without penalty.
 *    Strict zero-on-miss streaks are the top reason people abandon trackers.
 *  - Today being empty is never a miss — the day is not over.
 */

import { daysToFinish } from './kazaPlan';

export const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Witr'];

const MAX_WALK_DAYS = 3660;

export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export interface StreakInfo {
  current: number;
  longest: number;
  loggedToday: boolean;
  /** Streak is alive but today has nothing yet — one prayer keeps it. */
  atRisk: boolean;
  /** Yesterday was a missed day bridged by the weekly grace. */
  graceUsedYesterday: boolean;
  /** Had a streak before and lost it: show the comeback state. */
  broken: boolean;
}

const runEndingAt = (
  end: Date,
  active: Set<string>,
  rest: Set<string>,
  endIsToday: boolean,
): { length: number; graceYesterday: boolean } => {
  let length = 0;
  let lastBridged: number | null = null;
  let graceYesterday = false;

  for (let i = 0; i < MAX_WALK_DAYS; i += 1) {
    const day = addDays(end, -i);
    const key = dayKey(day);
    if (active.has(key)) {
      length += 1;
    } else if (rest.has(key) || (endIsToday && i === 0)) {
      // Paused, or today still in progress — neither counts nor breaks.
    } else if (lastBridged === null || i - lastBridged >= 7) {
      lastBridged = i;
      if (endIsToday && i === 1) graceYesterday = true;
    } else {
      break;
    }
  }
  return { length, graceYesterday };
};

export const computeStreaks = (
  madeUpDates: string[],
  restDays: string[] = [],
  now: Date = new Date(),
): StreakInfo => {
  const active = new Set(madeUpDates.map(iso => dayKey(new Date(iso))));
  const rest = new Set(restDays);
  const today = startOfDay(now);

  const run = runEndingAt(today, active, rest, true);
  const loggedToday = active.has(dayKey(today));

  let longest = run.length;
  active.forEach(key => {
    const [y, m, d] = key.split('-').map(Number);
    // A run ending the day before another active day is never longer than that day's run.
    if (active.has(dayKey(new Date(y, m - 1, d + 1)))) return;
    longest = Math.max(longest, runEndingAt(new Date(y, m - 1, d), active, rest, false).length);
  });

  return {
    current: run.length,
    longest,
    loggedToday,
    atRisk: run.length > 0 && !loggedToday && !rest.has(dayKey(today)),
    graceUsedYesterday: run.length > 0 && run.graceYesterday && !loggedToday,
    broken: run.length === 0 && longest > 0,
  };
};

export interface HeatCell {
  key: string;
  count: number;
  /** 0 nothing, 1 some, 2 goal met */
  level: 0 | 1 | 2;
  isRest: boolean;
  isFuture: boolean;
  isToday: boolean;
}

/** `weeks` columns of 7 days (Monday first), ending with the current week. */
export const buildHeatmap = (
  dailyCounts: Record<string, number>,
  restDays: string[],
  goal: number,
  weeks = 5,
  now: Date = new Date(),
): HeatCell[][] => {
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const firstMonday = addDays(today, -mondayOffset - (weeks - 1) * 7);
  const rest = new Set(restDays);

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_day, d) => {
      const day = addDays(firstMonday, w * 7 + d);
      const key = dayKey(day);
      const count = dailyCounts[key] ?? 0;
      return {
        key,
        count,
        level: (count === 0 ? 0 : count >= goal ? 2 : 1) as 0 | 1 | 2,
        isRest: rest.has(key),
        isFuture: day.getTime() > today.getTime(),
        isToday: key === dayKey(today),
      };
    }),
  );
};

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  achieved: boolean;
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];
export const COUNT_MILESTONES = [1, 10, 50, 100, 500, 1000];

export const buildMilestones = (input: {
  longestStreak: number;
  totalMadeUp: number;
  prayers: { name: string; completed: number; pending: number }[];
}): Milestone[] => {
  const { longestStreak, totalMadeUp, prayers } = input;
  const totalPending = prayers.reduce((s, p) => s + p.pending, 0);
  return [
    ...COUNT_MILESTONES.map(n => ({
      id: `count-${n}`,
      title: n === 1 ? 'First prayer' : `${n} made up`,
      detail: n === 1 ? 'The hardest step is done' : `${n} prayers made up in total`,
      achieved: totalMadeUp >= n,
    })),
    ...STREAK_MILESTONES.map(n => ({
      id: `streak-${n}`,
      title: `${n}-day streak`,
      detail: `Made up a prayer ${n} days in a row`,
      achieved: longestStreak >= n,
    })),
    ...prayers.map(p => ({
      id: `clear-${p.name}`,
      title: `${p.name} cleared`,
      detail: `No ${p.name} left to make up`,
      achieved: p.completed > 0 && p.pending === 0,
    })),
    {
      id: 'all-clear',
      title: 'All made up',
      detail: 'Every missed prayer made up',
      achieved: totalMadeUp > 0 && totalPending === 0,
    },
  ];
};

/**
 * The prayer to make up next if the person wants to keep to the daily order
 * (Fajr → Isha → Witr). Order matters for a Hanafi with fewer than six
 * owed; for a larger backlog it is a convenience, not a requirement.
 */
export const nextPrayerInOrder = (
  lastLogged: string | null,
  prayers: { name: string; pending: number }[],
): string | null => {
  const owed = new Set(prayers.filter(p => p.pending > 0).map(p => p.name));
  if (owed.size === 0) return null;
  const start = lastLogged ? PRAYER_ORDER.indexOf(lastLogged) + 1 : 0;
  for (let i = 0; i < PRAYER_ORDER.length; i += 1) {
    const name = PRAYER_ORDER[(start + i) % PRAYER_ORDER.length];
    if (owed.has(name)) return name;
  }
  return null;
};

/**
 * When the "streak at risk" nudge should next fire: 8:30 pm today if nothing
 * is logged yet, otherwise tomorrow. Keeping exactly one pending nudge, and
 * re-aiming it after every log, means it only ever fires on a day with no log.
 * Rest days are skipped.
 */
export const nextNudgeAt = (
  loggedToday: boolean,
  now: Date = new Date(),
  restDays: string[] = [],
): Date => {
  const rest = new Set(restDays);
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30);
  const startOffset = !loggedToday && first.getTime() > now.getTime() ? 0 : 1;
  for (let i = startOffset; i < startOffset + 60; i += 1) {
    const at = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i, 20, 30);
    if (!rest.has(dayKey(at))) return at;
  }
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() + startOffset, 20, 30);
};

export const finishDate = (pending: number, perDay: number, now: Date = new Date()): Date | null => {
  const days = daysToFinish(pending, perDay);
  return days === null ? null : addDays(startOfDay(now), days);
};
