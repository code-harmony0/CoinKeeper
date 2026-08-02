import { computeMoneyPlanScore, computePresetOutcome, computeProjection, computeBucketTrend, predictBucketPace } from '../../src/services/moneyPlanIntelligence';

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

describe('computePresetOutcome', () => {
  it('computes real rupee outcomes for a preset at a given income', () => {
    const outcome = computePresetOutcome({ income: 100000, needsPercent: 50, wantsPercent: 30, savingsPercent: 20 });
    expect(outcome.safeToSpend).toBe(80000);
    expect(outcome.monthlySavings).toBe(20000);
    expect(outcome.emergencyFundMonths).toBe(5); // ceil(100000 / 20000)
  });

  it('returns null emergencyFundMonths when savings is zero', () => {
    const outcome = computePresetOutcome({ income: 100000, needsPercent: 70, wantsPercent: 30, savingsPercent: 0 });
    expect(outcome.emergencyFundMonths).toBeNull();
  });
});

describe('computeProjection', () => {
  it('projects cumulative savings across the given horizons', () => {
    const points = computeProjection({ income: 50000, savingsPercent: 20, months: [3, 6, 12] });
    expect(points).toEqual([
      { months: 3, cumulativeSavings: 30000 },
      { months: 6, cumulativeSavings: 60000 },
      { months: 12, cumulativeSavings: 120000 },
    ]);
  });
});

describe('computeBucketTrend', () => {
  it('flags an increase over 2%', () => {
    expect(computeBucketTrend(11000, 10000).direction).toBe('up');
  });
  it('flags a decrease over 2%', () => {
    expect(computeBucketTrend(9000, 10000).direction).toBe('down');
  });
  it('treats small changes as flat', () => {
    expect(computeBucketTrend(10100, 10000).direction).toBe('flat');
  });
  it('is flat when there is no prior spend to compare against', () => {
    expect(computeBucketTrend(500, 0)).toEqual({ direction: 'flat', pct: 0 });
  });
});

describe('predictBucketPace', () => {
  it('projects month-end total from spend-so-far pace', () => {
    const result = predictBucketPace({ spendSoFar: 10000, daysElapsed: 10, daysInMonth: 30, budget: 30000 });
    expect(result.projectedTotal).toBe(30000);
    expect(result.onTrack).toBe(true);
  });
  it('flags off-track when projected total exceeds budget', () => {
    const result = predictBucketPace({ spendSoFar: 15000, daysElapsed: 10, daysInMonth: 30, budget: 30000 });
    expect(result.onTrack).toBe(false);
  });
});
