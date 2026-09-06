import {
  DEFAULT_MONTHLY_INCOME_PAISE,
  safetyNetTargetPaise,
  savingsSharePaise,
  salaryStartMonth,
} from '../../src/services/firstRunPlan';

describe('safetyNetTargetPaise', () => {
  it('lands on ₹50,000 for the default ₹25,000 income', () => {
    expect(safetyNetTargetPaise(DEFAULT_MONTHLY_INCOME_PAISE)).toBe(5000000);
  });

  it('scales with income, rounded to a figure a person would say', () => {
    expect(safetyNetTargetPaise(4000000)).toBe(8000000);
    expect(safetyNetTargetPaise(3300000)).toBe(6500000);
  });

  it('never proposes a target too small to be a safety net', () => {
    expect(safetyNetTargetPaise(100000)).toBe(1000000);
    expect(safetyNetTargetPaise(0)).toBe(1000000);
  });
});

describe('savingsSharePaise', () => {
  it('is the percentage of income, to the nearest ₹100', () => {
    expect(savingsSharePaise(2500000, 10)).toBe(250000);
    expect(savingsSharePaise(3333300, 10)).toBe(330000);
  });

  it('is zero when nothing is set aside', () => {
    expect(savingsSharePaise(2500000, 0)).toBe(0);
  });
});

describe('salaryStartMonth', () => {
  it('covers this month once payday has passed', () => {
    expect(salaryStartMonth(1, new Date(2026, 7, 13))).toBe('2026-08');
    expect(salaryStartMonth(13, new Date(2026, 7, 13))).toBe('2026-08');
  });

  it('waits for next month when payday has not arrived', () => {
    expect(salaryStartMonth(25, new Date(2026, 7, 13))).toBe('2026-09');
  });

  it('rolls the year over correctly', () => {
    expect(salaryStartMonth(25, new Date(2026, 11, 13))).toBe('2027-01');
  });
});
