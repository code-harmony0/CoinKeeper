import { computePace } from '../../src/services/budgetPacing';

// 15th of a 30-day month => exactly half elapsed
const midJune = new Date(2026, 5, 15);

describe('computePace', () => {
  it('returns null when there is no plan to pace against', () => {
    expect(computePace(10000, 0, midJune)).toBeNull();
  });

  it('reports on-pace when spend tracks the even draw-down', () => {
    // half the month gone, half the plan spent
    const pace = computePace(50000, 100000, midJune)!;
    expect(pace.status).toBe('on');
    expect(pace.message).toBe('Right on pace');
  });

  it('reports fast when spend outruns the even draw-down', () => {
    const pace = computePace(90000, 100000, midJune)!;
    expect(pace.status).toBe('fast');
  });

  it('reports ahead when spend trails the even draw-down', () => {
    const pace = computePace(10000, 100000, midJune)!;
    expect(pace.status).toBe('ahead');
  });

  it('never reports more than a full month elapsed', () => {
    const lastDay = new Date(2026, 5, 30);
    expect(computePace(1000, 100000, lastDay)!.elapsed).toBe(1);
  });

  it('treats a zero-spend month as ahead, not divide-by-zero', () => {
    const pace = computePace(0, 100000, midJune)!;
    expect(pace.status).toBe('ahead');
    expect(Number.isFinite(pace.ratio)).toBe(true);
  });
});
