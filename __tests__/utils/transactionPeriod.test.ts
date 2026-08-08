import { isWithinPeriod } from '../../src/utils/transactionPeriod';

describe('isWithinPeriod', () => {
  const now = new Date('2026-08-08T12:00:00.000Z');

  it('"all" always matches', () => {
    expect(isWithinPeriod('2020-01-01T00:00:00.000Z', 'all', now)).toBe(true);
  });

  it('"month" matches same calendar month and year, rejects other months', () => {
    expect(isWithinPeriod('2026-08-01T00:00:00.000Z', 'month', now)).toBe(true);
    expect(isWithinPeriod('2026-07-31T23:59:59.000Z', 'month', now)).toBe(false);
    expect(isWithinPeriod('2025-08-08T00:00:00.000Z', 'month', now)).toBe(false);
  });

  it('"week" matches the trailing 7 days including today, rejects older or future dates', () => {
    expect(isWithinPeriod('2026-08-08T00:00:00.000Z', 'week', now)).toBe(true);
    expect(isWithinPeriod('2026-08-02T12:00:00.000Z', 'week', now)).toBe(true);
    expect(isWithinPeriod('2026-08-01T00:00:00.000Z', 'week', now)).toBe(false);
    expect(isWithinPeriod('2026-08-09T00:00:00.000Z', 'week', now)).toBe(false);
  });
});
