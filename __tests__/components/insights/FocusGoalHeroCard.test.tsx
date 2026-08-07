import React from 'react';
import { render } from '@testing-library/react-native';
import { FocusGoalHeroCard } from '../../../src/components/insights/FocusGoalHeroCard';
import { GoalHealth } from '../../../src/services/goalIntelligence';

const baseProps = {
  name: 'Laptop',
  targetAmount: 100000,
  currentAmount: 50000,
  tint: '#D8E2FA',
  deep: '#1565C0',
  onAddFunds: jest.fn(),
  onPress: jest.fn(),
};

const healthOf = (overrides: Partial<GoalHealth>): GoalHealth => ({
  state: 'healthy',
  score: 50,
  progressPercent: 50,
  monthlyVelocityPaise: 1000,
  etaLabel: '~4 months at current pace',
  daysSinceLastContribution: 2,
  isPaceBehindDeadline: false,
  ...overrides,
});

describe('FocusGoalHeroCard', () => {
  it('shows the ETA label when healthy', () => {
    const { getByText } = render(<FocusGoalHeroCard {...baseProps} health={healthOf({})} priorityRank={1} />);
    expect(getByText('~4 months at current pace')).toBeTruthy();
  });

  it('shows a stalled message instead of the percentage line when stalled', () => {
    const { getByText } = render(
      <FocusGoalHeroCard {...baseProps} health={healthOf({ state: 'stalled', daysSinceLastContribution: 34, etaLabel: null })} priorityRank={1} />,
    );
    expect(getByText(/No contribution in 34 days/)).toBeTruthy();
  });

  it('shows an at-risk indicator when pace is behind the deadline', () => {
    const { getByText } = render(
      <FocusGoalHeroCard {...baseProps} health={healthOf({ state: 'at_risk', isPaceBehindDeadline: true })} priorityRank={1} />,
    );
    expect(getByText(/Behind pace/)).toBeTruthy();
  });

  it('shows the priority badge only when priorityRank is 1', () => {
    const { queryByText, rerender } = render(<FocusGoalHeroCard {...baseProps} health={healthOf({})} priorityRank={1} />);
    expect(queryByText('#1 Priority')).toBeTruthy();

    rerender(<FocusGoalHeroCard {...baseProps} health={healthOf({})} priorityRank={2} />);
    expect(queryByText('#1 Priority')).toBeNull();
  });

  it('shows "a while" instead of the literal word Infinity for a stalled goal that never received a contribution', () => {
    const { getByText, queryByText } = render(
      <FocusGoalHeroCard {...baseProps} health={healthOf({ state: 'stalled', daysSinceLastContribution: Infinity, etaLabel: null })} priorityRank={1} />,
    );
    expect(getByText(/No contribution in a while/)).toBeTruthy();
    expect(queryByText(/Infinity/)).toBeNull();
  });
});
