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

export interface RankedGoal {
  goal: Goal;
  health: GoalHealth;
  priorityRank: number; // 1-based
  priorityReason: string;
}

const priorityReasonFor = (goal: Goal, health: GoalHealth): string => {
  if (health.state === 'completed') return 'Already complete';
  if (goal.isEmergencyFund) return 'Emergency fund always comes first';
  if (health.state === 'overdue') return 'Past its deadline';
  if (health.state === 'at_risk') return 'Behind pace for its deadline';
  if (health.state === 'stalled') {
    const daysLabel = Number.isFinite(health.daysSinceLastContribution)
      ? `${health.daysSinceLastContribution} days`
      : 'a while';
    return `No contribution in ${daysLabel}`;
  }
  return health.progressPercent >= 50 ? 'Closest to completion' : 'On track';
};

const URGENCY_WEIGHT: Record<GoalState, number> = {
  overdue: 300,
  at_risk: 200,
  stalled: 100,
  healthy: 0,
  completed: -1000, // sinks below every active goal
};

export const rankGoalPriority = (
  entries: { goal: Goal; health: GoalHealth }[],
): RankedGoal[] => {
  const scored = entries.map(entry => {
    const emergencyBonus = entry.goal.isEmergencyFund ? 1000 : 0;
    const urgencyScore = URGENCY_WEIGHT[entry.health.state];
    // Small tiebreak toward closer-to-completion within the same urgency tier.
    const priorityScore = emergencyBonus + urgencyScore + entry.health.progressPercent;
    return { ...entry, priorityScore };
  });

  scored.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.goal.id.localeCompare(b.goal.id); // deterministic tiebreak
  });

  return scored.map((entry, index) => ({
    goal: entry.goal,
    health: entry.health,
    priorityRank: index + 1,
    priorityReason: priorityReasonFor(entry.goal, entry.health),
  }));
};

export interface AffordabilityCheck {
  affordable: boolean;
  remainingPaise: number;
  message: string;
}

export const checkAffordability = (
  amountPaise: number,
  monthlyContributedSoFarPaise: number,
  savingsBudgetPaise: number,
): AffordabilityCheck => {
  if (savingsBudgetPaise <= 0) {
    return {
      affordable: true,
      remainingPaise: 0,
      message: 'Set your income in Money Plan to see how this fits your monthly budget.',
    };
  }

  const remainingPaise = Math.max(0, savingsBudgetPaise - monthlyContributedSoFarPaise);
  const affordable = amountPaise <= remainingPaise;

  return {
    affordable,
    remainingPaise,
    message: affordable
      ? `Within your ${Money.format(remainingPaise, { zeroDecimals: true })} remaining savings budget this month.`
      : `This is ${Money.format(amountPaise - remainingPaise, { zeroDecimals: true })} more than your remaining savings budget this month.`,
  };
};

export const simulateWhatIf = (
  goal: Goal,
  health: GoalHealth,
  extraMonthlyPaise: number,
): { etaLabel: string | null } => {
  const hypotheticalVelocity = health.monthlyVelocityPaise + extraMonthlyPaise;
  const remainingPaise = goal.targetAmount - goal.currentAmount;

  if (hypotheticalVelocity <= 0 || remainingPaise <= 0) {
    return { etaLabel: null };
  }

  const monthsToGo = Math.ceil(remainingPaise / hypotheticalVelocity);
  return { etaLabel: `~${monthsToGo} month${monthsToGo === 1 ? '' : 's'} at current pace` };
};

/**
 * Deadline-driven amount when a deadline exists (what closes the pace gap),
 * otherwise 10% of the remaining gap as a reasonable default nudge — either
 * way capped by what's actually affordable this month, never a number the
 * user can't act on.
 */
export const recommendContribution = (
  goal: Goal,
  health: GoalHealth,
  remainingAffordablePaise: number,
): number => {
  const remainingGapPaise = Math.max(0, goal.targetAmount - goal.currentAmount);
  if (remainingGapPaise === 0) return 0;

  let idealPaise: number;
  if (goal.deadline) {
    const monthsUntilDeadline = monthsBetween(Date.now(), new Date(goal.deadline).getTime());
    idealPaise = monthsUntilDeadline > 0 ? Math.ceil(remainingGapPaise / monthsUntilDeadline) : remainingGapPaise;
  } else {
    idealPaise = Math.ceil(remainingGapPaise * 0.1);
  }

  return Math.max(0, Math.min(idealPaise, remainingAffordablePaise, remainingGapPaise));
};

export const generateRecommendationCopy = (
  goal: Goal,
  health: GoalHealth,
  priorityReason: string,
): string => {
  if (health.state === 'completed') return `${goal.name} is fully funded — nice work.`;
  if (health.state === 'overdue') return `${goal.name} passed its deadline. Update the date or add funds to get back on track.`;
  if (health.state === 'at_risk') return `${goal.name} is behind pace — ${priorityReason.toLowerCase()}.`;
  if (health.state === 'stalled') {
    const daysLabel = Number.isFinite(health.daysSinceLastContribution)
      ? `${health.daysSinceLastContribution} days`
      : 'a while';
    return `${goal.name} hasn't moved in ${daysLabel}.`;
  }
  return health.etaLabel
    ? `${goal.name} is on track — ${health.etaLabel}.`
    : `${goal.name} is on track.`;
};
