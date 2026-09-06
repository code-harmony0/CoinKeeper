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

/**
 * When a goal arrives if nothing changes — "March 2027 at this pace".
 *
 * A month the user can picture, not a duration they have to convert. "7
 * months" is an interval; a date is something they can hold a plan against,
 * which is the point of giving a goal a name in the first place.
 *
 * The "at this pace" qualifier is not decoration. This extrapolates from three
 * months of velocity, and a bare date would read as a promise the app has no
 * business making — the same rule `project()` follows in homeNarrative.ts.
 *
 * Lives here as one function because `simulateWhatIf` used to carry its own
 * copy of this construction, which meant the goal card and the AddFunds
 * preview were free to phrase the same projection two different ways.
 */
const paceEtaLabel = (
  remainingPaise: number,
  monthlyVelocityPaise: number,
  nowMs: number,
): string => {
  const monthsToGo = Math.ceil(remainingPaise / monthlyVelocityPaise);
  const arrival = new Date(nowMs);
  arrival.setMonth(arrival.getMonth() + monthsToGo);
  const when = arrival.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  return `${when} at this pace`;
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
    etaLabel = paceEtaLabel(remainingPaise, monthlyVelocityPaise, nowMs);
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

export type GoalTone = 'accent' | 'good' | 'warn' | 'bad';

/**
 * The colour a goal's *progress bar* takes.
 *
 * Deliberately not the same as `goalTone`. Driving the bar from status too
 * turned three of four cards amber the moment a couple of goals drifted, and a
 * screen where everything warns is a screen where nothing does — the exact
 * failure DESIGN.md records for the home plan bar. It also wiped out the
 * accent rotation that makes goals recognisable from one screen to the next.
 *
 * The split that holds: **the status line carries the verdict, the bar carries
 * the quantity.** A bar is a measurement of how full something is, not an
 * opinion about it, so it keeps the goal's own ink — and only surrenders it
 * when the bar itself is the news: finished, or past its deadline.
 */
export const goalBarTone = (state: GoalState): GoalTone => {
  if (state === 'completed') return 'good';
  if (state === 'overdue') return 'bad';
  return 'accent';
};

/**
 * The single place a goal's state becomes a colour.
 *
 * Both goal cards used to paint their progress fill and percentage from the
 * accent rotation regardless of state, so a card could read "Behind pace" in
 * red directly above a confident blue bar — two verdicts on one card, and no
 * way to know which one to believe.
 *
 * `healthy` deliberately stays on the accent rotation rather than turning
 * green: green everywhere would flatten the five-accent identity (DESIGN.md
 * §2) and, worse, spend the success colour on the default case so it means
 * nothing when a goal actually completes. Status colour *overrides* the accent
 * only when there is something to say.
 */
export const goalTone = (state: GoalState): GoalTone => {
  switch (state) {
    case 'completed':
      return 'good';
    case 'overdue':
      return 'bad';
    case 'at_risk':
    case 'stalled':
      return 'warn';
    default:
      return 'accent';
  }
};

/**
 * A goal with nothing in it yet is not a goal that has gone quiet — it is one
 * that hasn't started. The stall rule (`daysSinceLastContribution >= 21`) is
 * satisfied by `Infinity`, so a goal created this morning was being told it
 * had "no contribution in a while". Callers use this to swap the reproach for
 * an invitation.
 */
export const isUnstarted = (health: GoalHealth): boolean =>
  health.progressPercent === 0 && !Number.isFinite(health.daysSinceLastContribution);

/**
 * The status line under a goal, in the app's voice: what is true, then what to
 * do about it, in one line. These used to be bare state read-outs ("Behind
 * pace for its deadline") that described the data without telling anyone what
 * it meant for them.
 */
export const goalStatusCopy = (health: GoalHealth): string => {
  if (health.state === 'completed') return 'Fully funded';
  if (isUnstarted(health)) return 'Nothing in yet — your first ₹500 starts it';

  const daysLabel = Number.isFinite(health.daysSinceLastContribution)
    ? `${health.daysSinceLastContribution} days`
    : 'a while';

  switch (health.state) {
    case 'overdue':
      return 'Deadline passed — move the date or add funds';
    case 'at_risk':
      return "Behind pace — you'll miss the deadline at this rate";
    case 'stalled':
      return `Quiet for ${daysLabel} — one contribution restarts it`;
    default:
      return health.etaLabel ?? `${health.progressPercent}% of the way there`;
  }
};

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
  nowMs: number = Date.now(),
): { etaLabel: string | null } => {
  const hypotheticalVelocity = health.monthlyVelocityPaise + extraMonthlyPaise;
  const remainingPaise = goal.targetAmount - goal.currentAmount;

  if (hypotheticalVelocity <= 0 || remainingPaise <= 0) {
    return { etaLabel: null };
  }

  return {
    etaLabel: paceEtaLabel(remainingPaise, hypotheticalVelocity, nowMs),
  };
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

/**
 * The coach line above the goal cards.
 *
 * Deliberately says something the card below it does not. It used to open with
 * "${name} is on track — ${etaLabel}", which is the card's own status line
 * word for word, one row higher — the same fact twice, and the banner earning
 * none of its space. The coach's job is the number you can act on: what is
 * left, or what per month closes the gap.
 */
export const generateRecommendationCopy = (
  goal: Goal,
  health: GoalHealth,
  _priorityReason: string,
): string => {
  const remainingPaise = Math.max(0, goal.targetAmount - goal.currentAmount);
  const remaining = Money.format(remainingPaise, { zeroDecimals: true });

  if (health.state === 'completed') return `${goal.name} is fully funded. Pick your next one.`;
  if (isUnstarted(health)) return `${goal.name} starts the moment you put ₹500 in. That's the whole trick.`;

  if (health.state === 'overdue') {
    return `${goal.name} is past its deadline. Push the date out, or close the last ${remaining}.`;
  }

  if (health.state === 'at_risk' && goal.deadline) {
    const monthsLeft = monthsBetween(Date.now(), new Date(goal.deadline).getTime());
    const perMonth = Money.format(
      Math.ceil(monthsLeft > 0 ? remainingPaise / monthsLeft : remainingPaise),
      { zeroDecimals: true },
    );
    return `${goal.name} needs ${perMonth} a month to land on time. You're putting in less.`;
  }

  if (health.state === 'at_risk') return `${goal.name} is behind pace — ${remaining} still to go.`;
  if (health.state === 'stalled') return `${goal.name} has ${remaining} to go. Even ₹500 gets it moving again.`;

  return `${goal.name} is your top priority — ${remaining} to go.`;
};
