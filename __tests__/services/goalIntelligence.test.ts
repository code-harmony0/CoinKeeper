import { computeProgress } from '../../src/services/goalIntelligence';

describe('computeProgress', () => {
  it('returns a rounded percentage, capped at 100', () => {
    expect(computeProgress(25000, 100000)).toBe(25);
    expect(computeProgress(150000, 100000)).toBe(100);
  });

  it('returns 0 when target is zero or negative instead of dividing by zero', () => {
    expect(computeProgress(5000, 0)).toBe(0);
    expect(computeProgress(5000, -100)).toBe(0);
  });

  it('returns 0 for a brand-new goal with no contributions', () => {
    expect(computeProgress(0, 100000)).toBe(0);
  });
});

import { computeGoalHealth, GoalContribution } from '../../src/services/goalIntelligence';
import { Goal } from '../../src/store/goalStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-07T00:00:00Z').getTime();

const baseGoal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 40000 };

describe('computeGoalHealth', () => {
  it('marks a fully-funded goal as completed regardless of pace', () => {
    const health = computeGoalHealth({ ...baseGoal, currentAmount: 100000 }, [], NOW);
    expect(health.state).toBe('completed');
    expect(health.score).toBe(100);
    expect(health.etaLabel).toBeNull();
  });

  it('marks a goal with no contributions in 21+ days as stalled', () => {
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 30 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.state).toBe('stalled');
    expect(health.daysSinceLastContribution).toBe(30);
  });

  it('marks a goal with a recent contribution and no deadline as healthy', () => {
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 5 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.state).toBe('healthy');
    expect(health.daysSinceLastContribution).toBe(5);
  });

  it('projects a velocity-based arrival month when there is no deadline', () => {
    // ₹10,000/month average over the trailing 3 months, ₹60,000 remaining -> 6
    // months, which from August 2026 lands in February 2027.
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 10 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 40 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 70 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.etaLabel).toBe('February 2027 at this pace');
  });

  it('keeps the pace qualifier, so a projection never reads as a promise', () => {
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 10 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 40 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 70 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.etaLabel).toMatch(/at this pace$/);
  });

  it('flags at_risk when pace is behind a set deadline', () => {
    const goalWithDeadline: Goal = {
      ...baseGoal,
      deadline: new Date(NOW + 30 * DAY_MS).toISOString(), // 1 month away
    };
    // Only ₹5,000 saved this trailing period against a ₹60,000 gap in 1 month — way behind.
    const contributions: GoalContribution[] = [
      { amountPaise: 5000, occurredAtMs: NOW - 10 * DAY_MS },
    ];
    const health = computeGoalHealth(goalWithDeadline, contributions, NOW);
    expect(health.state).toBe('at_risk');
    expect(health.isPaceBehindDeadline).toBe(true);
  });

  it('flags overdue when the deadline has already passed and the goal is incomplete', () => {
    const goalWithPastDeadline: Goal = {
      ...baseGoal,
      deadline: new Date(NOW - 5 * DAY_MS).toISOString(),
    };
    const health = computeGoalHealth(goalWithPastDeadline, [], NOW);
    expect(health.state).toBe('overdue');
  });

  it('never contributed yet reports Infinity days since last contribution', () => {
    const health = computeGoalHealth(baseGoal, [], NOW);
    expect(health.daysSinceLastContribution).toBe(Infinity);
    expect(health.state).toBe('stalled');
  });
});

import { rankGoalPriority } from '../../src/services/goalIntelligence';

describe('rankGoalPriority', () => {
  const health = (overrides: Partial<import('../../src/services/goalIntelligence').GoalHealth> = {}) => ({
    state: 'healthy' as const,
    score: 50,
    progressPercent: 50,
    monthlyVelocityPaise: 1000,
    etaLabel: null,
    daysSinceLastContribution: 1,
    isPaceBehindDeadline: false,
    ...overrides,
  });

  it('always ranks the emergency fund first regardless of other goals\' urgency', () => {
    const entries = [
      { goal: { id: 'a', name: 'Car', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'overdue', score: 10 }) },
      { goal: { id: 'ef', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 10000, isEmergencyFund: true }, health: health({ score: 30 }) },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked[0].goal.id).toBe('ef');
  });

  it('ranks overdue and at_risk goals above merely stalled or healthy ones', () => {
    const entries = [
      { goal: { id: 'healthy', name: 'A', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'healthy' }) },
      { goal: { id: 'atrisk', name: 'B', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'at_risk' }) },
      { goal: { id: 'stalled', name: 'C', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'stalled' }) },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked.map(r => r.goal.id)).toEqual(['atrisk', 'stalled', 'healthy']);
  });

  it('sinks completed goals to the bottom', () => {
    const entries = [
      { goal: { id: 'done', name: 'Done', targetAmount: 100000, currentAmount: 100000 }, health: health({ state: 'completed', score: 100 }) },
      { goal: { id: 'active', name: 'Active', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'stalled' }) },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked[ranked.length - 1].goal.id).toBe('done');
  });

  it('assigns 1-based priorityRank and a human-readable priorityReason', () => {
    const entries = [
      { goal: { id: 'ef', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 0, isEmergencyFund: true }, health: health() },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked[0].priorityRank).toBe(1);
    expect(typeof ranked[0].priorityReason).toBe('string');
    expect(ranked[0].priorityReason.length).toBeGreaterThan(0);
  });

  it('reports "Already complete" for a completed emergency fund that is outranked by an overdue goal', () => {
    const entries = [
      { goal: { id: 'ef', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 100000, isEmergencyFund: true }, health: health({ state: 'completed', score: 100, progressPercent: 100 }) },
      { goal: { id: 'overdue', name: 'Car', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'overdue', score: 10, progressPercent: 0 }) },
    ];
    const ranked = rankGoalPriority(entries);
    const ef = ranked.find(r => r.goal.id === 'ef')!;
    expect(ranked[0].goal.id).toBe('overdue');
    expect(ef.priorityReason).toBe('Already complete');
  });
});

import { checkAffordability, simulateWhatIf, recommendContribution, generateRecommendationCopy } from '../../src/services/goalIntelligence';

describe('checkAffordability', () => {
  it('is affordable when the amount fits within remaining savings budget this month', () => {
    const result = checkAffordability(20000, 30000, 100000); // want ₹200, already put in ₹300 of a ₹1000 budget
    expect(result.affordable).toBe(true);
    expect(result.remainingPaise).toBe(70000);
  });

  it('warns (not blocks) when the amount exceeds remaining budget', () => {
    const result = checkAffordability(90000, 30000, 100000); // want ₹900, only ₹700 left
    expect(result.affordable).toBe(false);
    expect(result.remainingPaise).toBe(70000);
    expect(result.message).toMatch(/more than/i);
  });

  it('treats a zero or unknown savings budget as "can\'t evaluate" rather than always-unaffordable', () => {
    const result = checkAffordability(10000, 0, 0);
    expect(result.affordable).toBe(true);
    expect(result.message).toMatch(/set your income/i);
  });
});

describe('simulateWhatIf', () => {
  it('recomputes ETA with extra monthly velocity added', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 120000, currentAmount: 0 };
    const health = computeGoalHealth(goal, [], NOW); // 0 velocity, no ETA
    const result = simulateWhatIf(goal, health, 20000, NOW); // +₹200/month
    expect(result.etaLabel).toBe('February 2027 at this pace');
  });

  it('phrases its projection exactly like the goal card does', () => {
    // These were two independent copies of the same sentence, free to drift.
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 120000, currentAmount: 0 };
    const contributions: GoalContribution[] = [
      { amountPaise: 20000, occurredAtMs: NOW - 10 * DAY_MS },
      { amountPaise: 20000, occurredAtMs: NOW - 40 * DAY_MS },
      { amountPaise: 20000, occurredAtMs: NOW - 70 * DAY_MS },
    ];
    const health = computeGoalHealth(goal, contributions, NOW);
    const preview = simulateWhatIf(goal, health, 0, NOW);
    expect(preview.etaLabel).toBe(health.etaLabel);
  });

  it('returns null ETA when even the hypothetical velocity is zero', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 120000, currentAmount: 0 };
    const health = computeGoalHealth(goal, [], NOW);
    const result = simulateWhatIf(goal, health, 0);
    expect(result.etaLabel).toBeNull();
  });
});

describe('recommendContribution', () => {
  it('suggests the amount needed to hit a set deadline, capped by what is affordable', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 120000, currentAmount: 0, deadline: new Date(NOW + 60 * DAY_MS).toISOString() };
    const health = computeGoalHealth(goal, [], NOW);
    const suggestion = recommendContribution(goal, health, 30000); // only ₹300 affordable this month
    expect(suggestion).toBe(30000); // capped, even though ₹60,000 would be needed for the deadline
  });

  it('suggests a fraction of the remaining gap when there is no deadline', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 0 };
    const health = computeGoalHealth(goal, [], NOW);
    const suggestion = recommendContribution(goal, health, 1000000); // affordability isn't the constraint here
    expect(suggestion).toBe(10000); // 10% of the ₹1,00,000 gap
  });
});

describe('generateRecommendationCopy', () => {
  it('produces a sentence that mentions the priority reason for the top-ranked goal', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 50000 };
    const health = computeGoalHealth(goal, [{ amountPaise: 5000, occurredAtMs: NOW - 40 * DAY_MS }], NOW);
    const copy = generateRecommendationCopy(goal, health, 'No contribution in 40 days');
    expect(copy).toContain('Laptop');
    expect(copy.length).toBeGreaterThan(0);
  });
});
