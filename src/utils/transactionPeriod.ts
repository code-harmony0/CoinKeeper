export type PeriodFilter = 'week' | 'month' | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "week" is a trailing 7-day window ending now (not calendar-week), so it
 * reads the same regardless of which day of the week it is opened.
 */
export const isWithinPeriod = (dateIso: string, period: PeriodFilter, now: Date = new Date()): boolean => {
  if (period === 'all') return true;

  const d = new Date(dateIso);

  if (period === 'month') {
    // UTC getters so this is deterministic regardless of the host machine's
    // timezone — the ISO strings we receive (and the tests) are UTC, and
    // local getters would shift dates near local midnight across a month
    // boundary depending on the runner's TZ offset.
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }

  const diffMs = now.getTime() - d.getTime();
  return diffMs >= 0 && diffMs < 7 * DAY_MS;
};
