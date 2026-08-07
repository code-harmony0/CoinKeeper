import React from 'react';
import { render } from '@testing-library/react-native';
import { GoalsHeroDashboard } from '../../../src/components/insights/GoalsHeroDashboard';
import { RankedGoal } from '../../../src/services/goalIntelligence';

const rankedGoal = (overrides: Partial<RankedGoal> = {}): RankedGoal => ({
  goal: { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 50000 },
  health: {
    state: 'healthy', score: 50, progressPercent: 50, monthlyVelocityPaise: 1000,
    etaLabel: '~4 months at current pace', daysSinceLastContribution: 2, isPaceBehindDeadline: false,
  },
  priorityRank: 1,
  priorityReason: 'On track',
  ...overrides,
});

describe('GoalsHeroDashboard', () => {
  it('shows the top-ranked goal\'s recommendation in the coach banner', () => {
    const { getByText } = render(
      <GoalsHeroDashboard rankedGoals={[rankedGoal()]} contributedThisMonthPaise={20000} contributedLastMonthPaise={10000} />,
    );
    expect(getByText(/Laptop is on track/)).toBeTruthy();
  });

  it('shows an improving trend when this month exceeds last month', () => {
    const { getByText } = render(
      <GoalsHeroDashboard rankedGoals={[rankedGoal()]} contributedThisMonthPaise={20000} contributedLastMonthPaise={10000} />,
    );
    expect(getByText(/more than last month/i)).toBeTruthy();
  });
});
