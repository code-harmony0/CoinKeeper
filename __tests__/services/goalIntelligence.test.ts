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

  it('projects a velocity-based ETA in months when there is no deadline', () => {
    // ₹10,000/month average over the trailing 3 months, ₹60,000 remaining -> 6 months
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 10 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 40 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 70 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.etaLabel).toBe('~6 months at current pace');
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
});
