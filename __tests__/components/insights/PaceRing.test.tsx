import React from 'react';
import { render } from '@testing-library/react-native';
import { PaceRing } from '../../../src/components/insights/PaceRing';

const base = {
  safeTodayPaise: 53600,
  spendPaise: 21000,
  planPaise: 1200000,
  now: new Date(2026, 5, 15),
};

describe('PaceRing', () => {
  it('shows the safe-to-spend-today figure as the centre number', () => {
    const { getByText } = render(<PaceRing {...base} />);
    expect(getByText('₹536')).toBeTruthy();
  });

  it('labels what the centre number means', () => {
    const { getByText } = render(<PaceRing {...base} />);
    expect(getByText('Safe to spend today')).toBeTruthy();
  });

  it('states the pace verdict in words', () => {
    const { getByText } = render(<PaceRing {...base} />);
    expect(getByText('Under pace — you have room')).toBeTruthy();
  });

  it('prompts for income instead of showing ₹0 when there is no plan', () => {
    const { getByText, queryByText } = render(
      <PaceRing {...base} planPaise={0} safeTodayPaise={0} />,
    );
    expect(getByText('Add income to set a plan')).toBeTruthy();
    expect(queryByText('₹0')).toBeNull();
  });
});
