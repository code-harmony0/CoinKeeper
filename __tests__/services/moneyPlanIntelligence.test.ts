import { computeMoneyPlanScore } from '../../src/services/moneyPlanIntelligence';

describe('computeMoneyPlanScore', () => {
  it('returns 0 with a single recommendation when no income is set', () => {
    const result = computeMoneyPlanScore({
      income: 0, needsPercent: 50, wantsPercent: 30, savingsPercent: 20, emergencyFundStarted: false,
    });
    expect(result.hasIncome).toBe(false);
    expect(result.score).toBe(0);
    expect(result.recommendations).toEqual(['Add your monthly income to calculate your Money Plan Score.']);
  });

  it('returns 100 with no recommendations when every criterion is met', () => {
    const result = computeMoneyPlanScore({
      income: 50000, needsPercent: 55, wantsPercent: 25, savingsPercent: 20, emergencyFundStarted: true,
    });
    expect(result.hasIncome).toBe(true);
    expect(result.score).toBe(100);
    expect(result.recommendations).toEqual([]);
  });

  it('deducts and recommends for each unmet criterion', () => {
    const result = computeMoneyPlanScore({
      income: 50000, needsPercent: 70, wantsPercent: 20, savingsPercent: 10, emergencyFundStarted: false,
    });
    // unbalanced total is fine here (100), but needs too high, savings too low, no fund progress = 3 of 5 applicable criteria met
    expect(result.score).toBe(40);
    expect(result.recommendations.length).toBe(3);
  });

  it('skips the emergency fund criterion when no goal exists', () => {
    const result = computeMoneyPlanScore({
      income: 50000, needsPercent: 55, wantsPercent: 25, savingsPercent: 20, emergencyFundStarted: null,
    });
    expect(result.score).toBe(100);
    expect(result.recommendations).toEqual([]);
  });
});
