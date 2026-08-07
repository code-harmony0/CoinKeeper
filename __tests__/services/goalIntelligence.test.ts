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
