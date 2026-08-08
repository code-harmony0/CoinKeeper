/**
 * Budget pacing — actual spend against the spend you would expect by today if
 * the month's plan were drawn down evenly. This is the home hero's game loop:
 * the ring races the pace marker, and that comparison (not the raw total) is
 * what tells the user whether they are winning.
 */

export type PaceStatus = 'ahead' | 'on' | 'fast';

export interface Pace {
  /** 0..1 fraction of the month elapsed */
  elapsed: number;
  /** paise the plan expects to be spent by today */
  expectedPaise: number;
  /** actual ÷ expected; 1 is exactly on plan */
  ratio: number;
  status: PaceStatus;
  message: string;
}

const MESSAGES: Record<PaceStatus, string> = {
  fast: 'Spending faster than plan',
  ahead: 'Under pace — you have room',
  on: 'Right on pace',
};

export const computePace = (
  spendPaise: number,
  planPaise: number,
  now: Date = new Date(),
): Pace | null => {
  if (planPaise <= 0) return null;

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const elapsed = Math.min(1, now.getDate() / daysInMonth);
  const expectedPaise = planPaise * elapsed;
  const ratio = expectedPaise > 0 ? spendPaise / expectedPaise : 0;

  const status: PaceStatus =
    ratio > 1.05 ? 'fast' : ratio < 0.85 ? 'ahead' : 'on';

  return { elapsed, expectedPaise, ratio, status, message: MESSAGES[status] };
};
