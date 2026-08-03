import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MoneyPlanShell } from '../../../src/components/budget/MoneyPlanShell';

const mockExecute = jest.fn();
jest.mock('../../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;

describe('MoneyPlanShell', () => {
  beforeEach(() => mockExecute.mockReset());

  it('shows the income onboarding CTA when there is no income yet', async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const { findByText } = render(<MoneyPlanShell navigation={navigation} />);

    expect(await findByText('Add Income')).toBeTruthy();
  });

  it('shows Safe To Spend once income exists', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (String(sql).includes("type = 'income'")) return Promise.resolve({ rows: [{ total: 5000000 }] });
      return Promise.resolve({ rows: [] });
    });

    const { findAllByText } = render(<MoneyPlanShell navigation={navigation} />);

    // Default 50/30/20 split of ₹50,000 -> Safe to Spend = ₹40,000
    // (rendered in both MoneyPlanHero and MoneyFlowVisualizer, so assert at least one match)
    expect((await findAllByText('₹40,000')).length).toBeGreaterThan(0);
  });
});
