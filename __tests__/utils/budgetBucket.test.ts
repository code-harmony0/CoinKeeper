import { classifyBudgetBucket } from '../../src/utils/budgetBucket';

describe('classifyBudgetBucket', () => {
  it('classifies essential-sounding names as needs', () => {
    expect(classifyBudgetBucket('Rent')).toBe('needs');
    expect(classifyBudgetBucket('Groceries')).toBe('needs');
    expect(classifyBudgetBucket('Health Insurance')).toBe('needs');
  });

  it('classifies investment/goal names as savings', () => {
    expect(classifyBudgetBucket('SIP Investment')).toBe('savings');
    expect(classifyBudgetBucket('Emergency Fund Goal')).toBe('savings');
  });

  it('defaults unmatched or lifestyle names to wants', () => {
    expect(classifyBudgetBucket('Dining Out')).toBe('wants');
    expect(classifyBudgetBucket('Random Custom Category')).toBe('wants');
  });

  it('is case-insensitive', () => {
    expect(classifyBudgetBucket('RENT')).toBe('needs');
  });

  it('does not misclassify "Coffee" as needs via the "fee" substring', () => {
    expect(classifyBudgetBucket('Coffee')).toBe('wants');
  });

  it('defaults empty input to wants', () => {
    expect(classifyBudgetBucket('')).toBe('wants');
  });
});
