/**
 * Collection Utils Unit Tests
 */

import {
  computeNextDueDate,
  computeCycleNumber,
  generatePaymentSchedule,
  isPaymentOverdue,
  calculateDaysOverdue,
  detectOverduePayments,
  calculateLateFee,
  generateIdempotencyKey,
  generatePaymentReference,
  matchPaymentToWebhook,
  calculateRetryDelay,
  processTemplate,
  isValidAmount,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from '../../src/lib/collectionUtils';

describe('computeNextDueDate', () => {
  const startDate = new Date('2025-01-01');

  it('computes weekly next due date', () => {
    const ref = new Date('2025-01-05');
    const result = computeNextDueDate('weekly', startDate, ref);
    expect(result).toEqual(new Date('2025-01-08'));
  });

  it('computes biweekly next due date', () => {
    const ref = new Date('2025-01-10');
    const result = computeNextDueDate('biweekly', startDate, ref);
    expect(result).toEqual(new Date('2025-01-15'));
  });

  it('computes monthly next due date', () => {
    const ref = new Date('2025-01-15');
    const result = computeNextDueDate('monthly', startDate, ref);
    expect(result).toEqual(new Date('2025-02-01'));
  });

  it('returns start date if ref is before start', () => {
    const ref = new Date('2024-12-25');
    const result = computeNextDueDate('weekly', startDate, ref);
    expect(result).toEqual(new Date('2025-01-01'));
  });
});

describe('computeCycleNumber', () => {
  const startDate = new Date('2025-01-01');

  it('computes weekly cycle number', () => {
    expect(computeCycleNumber('weekly', startDate, new Date('2025-01-01'))).toBe(1);
    expect(computeCycleNumber('weekly', startDate, new Date('2025-01-08'))).toBe(2);
    expect(computeCycleNumber('weekly', startDate, new Date('2025-01-15'))).toBe(3);
  });

  it('computes monthly cycle number', () => {
    expect(computeCycleNumber('monthly', startDate, new Date('2025-01-15'))).toBe(1);
    expect(computeCycleNumber('monthly', startDate, new Date('2025-02-01'))).toBe(2);
    expect(computeCycleNumber('monthly', startDate, new Date('2025-03-15'))).toBe(3);
  });
});

describe('generatePaymentSchedule', () => {
  it('generates monthly schedule', () => {
    const input = {
      groupId: 'g1',
      groupName: 'Test Group',
      memberId: 'm1',
      memberName: 'John Doe',
      memberPhone: '9876543210',
      amount: 5000,
      startDate: new Date('2025-01-01'),
      cycle: 'monthly' as const,
      autoDebitEnabled: true,
    };

    const schedule = generatePaymentSchedule(input, 3);
    expect(schedule.length).toBeGreaterThanOrEqual(1);
    expect(schedule[0].amount).toBe(5000);
    expect(schedule[0].autoDebitEnabled).toBe(true);
  });
});

describe('isPaymentOverdue', () => {
  it('returns false for future payment', () => {
    const dueDate = new Date('2025-12-31');
    const now = new Date('2025-01-01');
    expect(isPaymentOverdue(dueDate, now)).toBe(false);
  });

  it('returns true for past payment', () => {
    const dueDate = new Date('2025-01-01');
    const now = new Date('2025-01-05');
    expect(isPaymentOverdue(dueDate, now)).toBe(true);
  });

  it('respects grace period', () => {
    const dueDate = new Date('2025-01-01');
    const now = new Date('2025-01-03');
    expect(isPaymentOverdue(dueDate, now, 5)).toBe(false);
    expect(isPaymentOverdue(dueDate, now, 1)).toBe(true);
  });
});

describe('calculateDaysOverdue', () => {
  it('returns 0 for future payments', () => {
    const dueDate = new Date('2025-12-31');
    const now = new Date('2025-01-01');
    expect(calculateDaysOverdue(dueDate, now)).toBe(0);
  });

  it('calculates days correctly', () => {
    const dueDate = new Date('2025-01-01');
    const now = new Date('2025-01-06');
    expect(calculateDaysOverdue(dueDate, now)).toBe(5);
  });
});

describe('detectOverduePayments', () => {
  it('filters and enhances overdue payments', () => {
    const payments = [
      { id: '1', dueDate: new Date('2025-01-01'), status: 'pending', amount: 1000 },
      { id: '2', dueDate: new Date('2025-12-31'), status: 'pending', amount: 2000 },
      { id: '3', dueDate: new Date('2025-01-05'), status: 'paid', amount: 3000 },
    ];

    const now = new Date('2025-06-01');
    const result = detectOverduePayments(payments, now);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
    expect(result[0].isOverdue).toBe(true);
    expect(result[0].daysOverdue).toBeGreaterThan(0);
  });
});

describe('calculateLateFee', () => {
  it('returns 0 when disabled', () => {
    const rules = { enabled: false, type: 'flat' as const, amount: 100 };
    expect(calculateLateFee(5000, 5, rules)).toBe(0);
  });

  it('calculates flat fee', () => {
    const rules = { enabled: true, type: 'flat' as const, amount: 100 };
    expect(calculateLateFee(5000, 5, rules)).toBe(100);
  });

  it('calculates percentage fee', () => {
    const rules = { enabled: true, type: 'percentage' as const, amount: 5 };
    expect(calculateLateFee(1000, 5, rules)).toBe(50);
  });

  it('respects max cap', () => {
    const rules = { enabled: true, type: 'percentage' as const, amount: 10, maxCap: 200 };
    expect(calculateLateFee(5000, 5, rules)).toBe(200);
  });
});

describe('generateIdempotencyKey', () => {
  it('generates deterministic key', () => {
    const key1 = generateIdempotencyKey('m1', 'g1', new Date('2025-01-01'));
    const key2 = generateIdempotencyKey('m1', 'g1', new Date('2025-01-01'));
    expect(key1).toBe(key2);
    expect(key1).toBe('m1_g1_2025-01-01');
  });

  it('generates different keys for different dates', () => {
    const key1 = generateIdempotencyKey('m1', 'g1', new Date('2025-01-01'));
    const key2 = generateIdempotencyKey('m1', 'g1', new Date('2025-01-02'));
    expect(key1).not.toBe(key2);
  });
});

describe('generatePaymentReference', () => {
  it('generates unique references', () => {
    const ref1 = generatePaymentReference();
    const ref2 = generatePaymentReference();
    expect(ref1).not.toBe(ref2);
  });

  it('uses prefix', () => {
    const ref = generatePaymentReference('TEST');
    expect(ref.startsWith('TEST_')).toBe(true);
  });
});

describe('matchPaymentToWebhook', () => {
  it('matches exactly', () => {
    const result = matchPaymentToWebhook({
      paymentReference: 'REF123',
      paymentAmount: 1000,
      webhookReference: 'REF123',
      webhookAmount: 1000,
    });

    expect(result.isMatch).toBe(true);
    expect(result.referenceMatch).toBe(true);
    expect(result.amountMatch).toBe(true);
  });

  it('detects amount mismatch', () => {
    const result = matchPaymentToWebhook({
      paymentReference: 'REF123',
      paymentAmount: 1000,
      webhookReference: 'REF123',
      webhookAmount: 900,
    });

    expect(result.isMatch).toBe(false);
    expect(result.referenceMatch).toBe(true);
    expect(result.amountMatch).toBe(false);
    expect(result.amountDifference).toBe(100);
  });

  it('allows tolerance', () => {
    const result = matchPaymentToWebhook({
      paymentReference: 'REF123',
      paymentAmount: 1000,
      webhookReference: 'REF123',
      webhookAmount: 995,
      tolerancePercent: 1,
    });

    expect(result.isMatch).toBe(true);
    expect(result.amountMatch).toBe(true);
  });
});

describe('calculateRetryDelay', () => {
  it('returns 0 for attempt 0', () => {
    expect(calculateRetryDelay(0)).toBe(0);
  });

  it('returns -1 when max attempts exceeded', () => {
    expect(calculateRetryDelay(5, { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 })).toBe(-1);
  });

  it('increases delay exponentially', () => {
    const config = { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 };
    const delay1 = calculateRetryDelay(1, config);
    const delay2 = calculateRetryDelay(2, config);

    // Delay should roughly double (with jitter)
    expect(delay2).toBeGreaterThan(delay1);
  });
});

describe('processTemplate', () => {
  it('replaces variables', () => {
    const template = 'Hello {{name}}, your payment of ₦{{amount}} is due.';
    const result = processTemplate(template, { name: 'John', amount: 5000 });
    expect(result).toBe('Hello John, your payment of ₦5000 is due.');
  });

  it('handles missing variables', () => {
    const template = 'Hello {{name}}, your payment is due.';
    const result = processTemplate(template, {});
    expect(result).toBe('Hello {{name}}, your payment is due.');
  });
});

describe('isValidAmount', () => {
  it('accepts positive numbers', () => {
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(0.01)).toBe(true);
  });

  it('rejects invalid amounts', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-100)).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
    expect(isValidAmount(Infinity)).toBe(false);
  });
});

describe('isValidPhoneNumber', () => {
  it('validates Indian phone numbers', () => {
    expect(isValidPhoneNumber('9876543210')).toBe(true);
    expect(isValidPhoneNumber('919876543210')).toBe(true);
    expect(isValidPhoneNumber('+919876543210')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(isValidPhoneNumber('1234567890')).toBe(false);
    expect(isValidPhoneNumber('123')).toBe(false);
  });
});

describe('normalizePhoneNumber', () => {
  it('normalizes 10-digit numbers', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
  });

  it('normalizes 12-digit numbers with country code', () => {
    expect(normalizePhoneNumber('919876543210')).toBe('+919876543210');
  });
});
