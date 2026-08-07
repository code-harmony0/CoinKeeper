import { Goal } from '../store/goalStore';
import { Money } from '../utils/money';

export const computeProgress = (currentAmountPaise: number, targetAmountPaise: number): number => {
  if (targetAmountPaise <= 0) return 0;
  return Math.min(100, Math.round((currentAmountPaise / targetAmountPaise) * 100));
};

export interface GoalContribution {
  amountPaise: number;
  occurredAtMs: number;
}

export type GoalState = 'healthy' | 'stalled' | 'at_risk' | 'overdue' | 'completed';

export interface GoalHealth {
  state: GoalState;
  score: number; // 0-100
  progressPercent: number; // 0-100
  monthlyVelocityPaise: number; // trailing 3-month average contribution, paise/month
  etaLabel: string | null;
  daysSinceLastContribution: number; // Infinity if never contributed
  isPaceBehindDeadline: boolean;
}

const STALL_DAYS_THRESHOLD = 21;
const VELOCITY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // trailing 3 months
const DAY_MS = 24 * 60 * 60 * 1000;

const monthsBetween = (fromMs: number, toMs: number): number =>
  Math.max(0, (toMs - fromMs) / (30 * DAY_MS));

/**
 * Averages over a fixed 3-month window (not "however many months of history
 * exist") so a goal funded once 2 years ago doesn't look like it still has
 * live momentum today — dividing by 3 always, not by however many
 * contributions fall in the window.
 */
const computeMonthlyVelocity = (contributions: GoalContribution[], nowMs: number): number => {
  const windowStart = nowMs - VELOCITY_WINDOW_MS;
  const recentTotal = contributions
    .filter(c => c.occurredAtMs >= windowStart)
    .reduce((sum, c) => sum + c.amountPaise, 0);
  return Math.round(recentTotal / 3);
};

export const computeGoalHealth = (
  goal: Goal,
  contributions: GoalContribution[],
  nowMs: number,
): GoalHealth => {
  const progressPercent = computeProgress(goal.currentAmount, goal.targetAmount);
  const completed = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;

  const lastContributionMs = contributions.length
    ? Math.max(...contributions.map(c => c.occurredAtMs))
    : null;
  const daysSinceLastContribution = lastContributionMs === null
    ? Infinity
    : Math.floor((nowMs - lastContributionMs) / DAY_MS);

  if (completed) {
    return {
      state: 'completed',
      score: 100,
      progressPercent: 100,
      monthlyVelocityPaise: computeMonthlyVelocity(contributions, nowMs),
      etaLabel: null,
      daysSinceLastContribution,
      isPaceBehindDeadline: false,
    };
  }

  const monthlyVelocityPaise = computeMonthlyVelocity(contributions, nowMs);
  const remainingPaise = goal.targetAmount - goal.currentAmount;
  const deadlineMs = goal.deadline ? new Date(goal.deadline).getTime() : null;
  const isOverdue = deadlineMs !== null && deadlineMs < nowMs;

  let etaLabel: string | null = null;
  let isPaceBehindDeadline = false;

  if (deadlineMs !== null && !isOverdue) {
    const monthsUntilDeadline = monthsBetween(nowMs, deadlineMs);
    const requiredMonthlyPaise = monthsUntilDeadline > 0 ? remainingPaise / monthsUntilDeadline : remainingPaise;
    isPaceBehindDeadline = monthlyVelocityPaise < requiredMonthlyPaise;
    const deadlineDate = new Date(deadlineMs);
    etaLabel = `by ${deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else if (deadlineMs === null && monthlyVelocityPaise > 0) {
    const monthsToGo = Math.ceil(remainingPaise / monthlyVelocityPaise);
    etaLabel = `~${monthsToGo} month${monthsToGo === 1 ? '' : 's'} at current pace`;
  }

  const isStalled = daysSinceLastContribution >= STALL_DAYS_THRESHOLD;

  let state: GoalState;
  if (isOverdue) state = 'overdue';
  else if (isPaceBehindDeadline) state = 'at_risk';
  else if (isStalled) state = 'stalled';
  else state = 'healthy';

  let score = progressPercent;
  if (state === 'overdue') score = Math.max(0, score - 40);
  else if (state === 'at_risk') score = Math.max(0, score - 30);
  else if (state === 'stalled') score = Math.max(0, score - 20);

  return {
    state,
    score,
    progressPercent,
    monthlyVelocityPaise,
    etaLabel,
    daysSinceLastContribution,
    isPaceBehindDeadline,
  };
};
