import React from 'react';
import { render } from '@testing-library/react-native';
import { SecondaryGoalCard } from '../../../src/components/insights/SecondaryGoalCard';
import { GoalHealth } from '../../../src/services/goalIntelligence';

const baseProps = {
  name: 'Vacation',
  targetAmount: 100000,
  currentAmount: 50000,
  themeColor: '#AD1457',
  onPress: jest.fn(),
};

const healthOf = (overrides: Partial<GoalHealth>): GoalHealth => ({
  state: 'healthy',
  score: 50,
  progressPercent: 50,
  monthlyVelocityPaise: 1000,
  etaLabel: null,
  daysSinceLastContribution: 2,
  isPaceBehindDeadline: false,
  ...overrides,
});

describe('SecondaryGoalCard', () => {
  it('shows a completed badge when the goal is fully funded', () => {
    const { getByText } = render(
      <SecondaryGoalCard {...baseProps} currentAmount={100000} health={healthOf({ state: 'completed', progressPercent: 100 })} />,
    );
    expect(getByText('Complete')).toBeTruthy();
  });

  it('shows a stalled note when stalled', () => {
    const { getByText } = render(
      <SecondaryGoalCard {...baseProps} health={healthOf({ state: 'stalled', daysSinceLastContribution: 40 })} />,
    );
    expect(getByText(/40 days/)).toBeTruthy();
  });

  it('shows "a while" instead of the literal word Infinity for a stalled goal that never received a contribution', () => {
    const { getByText, queryByText } = render(
      <SecondaryGoalCard {...baseProps} health={healthOf({ state: 'stalled', daysSinceLastContribution: Infinity })} />,
    );
    expect(getByText(/Quiet for a while/)).toBeTruthy();
    expect(queryByText(/Infinity/)).toBeNull();
  });
});
