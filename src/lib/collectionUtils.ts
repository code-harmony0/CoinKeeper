/**
 * Collection Business Logic Utilities
 * Pure, unit-testable functions for payment scheduling, overdue detection, and fee calculation
 */

import type { GroupCycleTime } from '../types/group';

// ==================== DATE COMPUTATION ====================

/**
 * Compute next due date based on cycle configuration and reference date
 */
export const computeNextDueDate = (
  cycle: GroupCycleTime,
  startDate: Date,
  referenceDate: Date = new Date()
): Date => {
  const start = new Date(startDate);
  const ref = new Date(referenceDate);
  
  // Normalize to start of day
  start.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  let nextDue = new Date(start);

  switch (cycle) {
    case 'weekly':
      while (nextDue <= ref) {
        nextDue.setDate(nextDue.getDate() + 7);
      }
      break;

    case 'biweekly':
      while (nextDue <= ref) {
        nextDue.setDate(nextDue.getDate() + 14);
      }
      break;

    case 'monthly':
      while (nextDue <= ref) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      break;

    default:
      throw new Error(`Unknown cycle type: ${cycle}`);
  }

  return nextDue;
};

/**
 * Compute cycle number for a given date
 */
export const computeCycleNumber = (
  cycle: GroupCycleTime,
  startDate: Date,
  targetDate: Date
): number => {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 0;

  switch (cycle) {
    case 'weekly':
      return Math.floor(diffDays / 7) + 1;
    case 'biweekly':
      return Math.floor(diffDays / 14) + 1;
    case 'monthly':
      const months =
        (target.getFullYear() - start.getFullYear()) * 12 +
        (target.getMonth() - start.getMonth());
      return Math.max(1, months + 1);
    default:
      return 1;
  }
};

/**
 * Generate payment schedule for N months ahead
 */
export interface ScheduledPaymentInput {
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  amount: number;
  startDate: Date;
  cycle: GroupCycleTime;
  autoDebitEnabled: boolean;
}

export interface GeneratedScheduledPayment {
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  amount: number;
  dueDate: Date;
  cycleNumber: number;
  autoDebitEnabled: boolean;
}

export const generatePaymentSchedule = (
  input: ScheduledPaymentInput,
  monthsAhead: number = 1
): GeneratedScheduledPayment[] => {
  const schedule: GeneratedScheduledPayment[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + monthsAhead);

  let currentDue = computeNextDueDate(input.cycle, input.startDate, now);

  while (currentDue <= endDate) {
    const cycleNumber = computeCycleNumber(input.cycle, input.startDate, currentDue);

    schedule.push({
      groupId: input.groupId,
      groupName: input.groupName,
      memberId: input.memberId,
      memberName: input.memberName,
      memberPhone: input.memberPhone,
      amount: input.amount,
      dueDate: new Date(currentDue),
      cycleNumber,
      autoDebitEnabled: input.autoDebitEnabled,
    });

    // Move to next cycle
    switch (input.cycle) {
      case 'weekly':
        currentDue.setDate(currentDue.getDate() + 7);
        break;
      case 'biweekly':
        currentDue.setDate(currentDue.getDate() + 14);
        break;
      case 'monthly':
        currentDue.setMonth(currentDue.getMonth() + 1);
        break;
    }
  }

  return schedule;
};

// ==================== OVERDUE DETECTION ====================

/**
 * Check if a payment is overdue considering grace period
 */
export const isPaymentOverdue = (
  dueDate: Date,
  now: Date = new Date(),
  gracePeriodDays: number = 0
): boolean => {
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  due.setDate(due.getDate() + gracePeriodDays);

  return now > due;
};

/**
 * Calculate days overdue
 */
export const calculateDaysOverdue = (
  dueDate: Date,
  now: Date = new Date()
): number => {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);

  const diffMs = current.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Filter and enhance payments to detect overdue
 */
export interface PaymentForOverdueCheck {
  id: string;
  dueDate: Date;
  status: string;
  amount: number;
}

export interface OverduePaymentResult extends PaymentForOverdueCheck {
  daysOverdue: number;
  isOverdue: boolean;
}

export const detectOverduePayments = (
  payments: PaymentForOverdueCheck[],
  now: Date = new Date(),
  gracePeriodDays: number = 0
): OverduePaymentResult[] => {
  return payments
    .filter(p => p.status !== 'paid' && p.status !== 'skipped')
    .map(payment => ({
      ...payment,
      daysOverdue: calculateDaysOverdue(payment.dueDate, now),
      isOverdue: isPaymentOverdue(payment.dueDate, now, gracePeriodDays),
    }))
    .filter(p => p.isOverdue);
};

// ==================== FEE CALCULATION ====================

export interface LateFeeRules {
  enabled: boolean;
  type: 'flat' | 'percentage';
  amount: number;
  maxCap?: number;
  perDayPenalty?: number;
}

/**
 * Calculate late fee based on rules
 */
export const calculateLateFee = (
  principalAmount: number,
  daysOverdue: number,
  rules: LateFeeRules
): number => {
  if (!rules.enabled || daysOverdue <= 0) {
    return 0;
  }

  let fee = 0;

  if (rules.type === 'flat') {
    fee = rules.amount;
  } else if (rules.type === 'percentage') {
    fee = (principalAmount * rules.amount) / 100;
  }

  // Add per-day penalty if configured
  if (rules.perDayPenalty && daysOverdue > 1) {
    fee += rules.perDayPenalty * (daysOverdue - 1);
  }

  // Apply max cap if set
  if (rules.maxCap && fee > rules.maxCap) {
    fee = rules.maxCap;
  }

  return Math.round(fee * 100) / 100;
};

// ==================== IDEMPOTENCY ====================

/**
 * Generate idempotency key for auto-debit jobs
 */
export const generateIdempotencyKey = (
  memberId: string,
  groupId: string,
  dueDate: Date
): string => {
  const dateStr = dueDate.toISOString().split('T')[0];
  return `${memberId}_${groupId}_${dateStr}`;
};

/**
 * Generate unique payment reference
 */
export const generatePaymentReference = (
  prefix: string = 'PAY'
): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

// ==================== RECONCILIATION ====================

export interface ReconciliationMatchInput {
  paymentReference: string;
  paymentAmount: number;
  webhookReference: string;
  webhookAmount: number;
  tolerancePercent?: number;
}

export interface ReconciliationMatchResult {
  isMatch: boolean;
  referenceMatch: boolean;
  amountMatch: boolean;
  amountDifference: number;
  matchReason: string;
}

/**
 * Match payment to webhook for reconciliation
 */
export const matchPaymentToWebhook = (
  input: ReconciliationMatchInput
): ReconciliationMatchResult => {
  const { paymentReference, paymentAmount, webhookReference, webhookAmount } = input;
  const tolerancePercent = input.tolerancePercent ?? 0;

  const referenceMatch = paymentReference === webhookReference;
  const amountDifference = Math.abs(paymentAmount - webhookAmount);
  const toleranceAmount = (paymentAmount * tolerancePercent) / 100;
  const amountMatch = amountDifference <= toleranceAmount;

  let matchReason = '';
  if (referenceMatch && amountMatch) {
    matchReason = 'Exact match';
  } else if (referenceMatch && !amountMatch) {
    matchReason = `Reference match, amount mismatch (diff: ${amountDifference})`;
  } else if (!referenceMatch && amountMatch) {
    matchReason = 'Amount match, reference mismatch';
  } else {
    matchReason = 'No match';
  }

  return {
    isMatch: referenceMatch && amountMatch,
    referenceMatch,
    amountMatch,
    amountDifference,
    matchReason,
  };
};

// ==================== RETRY POLICY ====================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Calculate next retry delay with exponential backoff
 */
export const calculateRetryDelay = (
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number => {
  if (attemptNumber <= 0) return 0;
  if (attemptNumber >= config.maxAttempts) return -1;

  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  const jitter = Math.random() * 0.1 * delay;

  return Math.min(delay + jitter, config.maxDelayMs);
};

/**
 * Calculate next retry timestamp
 */
export const calculateNextRetryAt = (
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Date | null => {
  const delay = calculateRetryDelay(attemptNumber, config);
  if (delay < 0) return null;

  return new Date(Date.now() + delay);
};

// ==================== TEMPLATE PROCESSING ====================

/**
 * Process template with variables
 */
export const processTemplate = (
  template: string,
  variables: Record<string, string | number>
): string => {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, String(value));
  }

  return result;
};

/**
 * Default reminder template variables
 */
export const buildReminderVariables = (data: {
  memberName: string;
  groupName: string;
  amount: number;
  dueDate: Date;
  paymentLink?: string;
}): Record<string, string> => {
  return {
    memberName: data.memberName,
    groupName: data.groupName,
    amount: data.amount.toLocaleString(),
    dueDate: data.dueDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    paymentLink: data.paymentLink ?? '',
  };
};

// ==================== VALIDATION ====================

/**
 * Validate payment amount
 */
export const isValidAmount = (amount: number): boolean => {
  return typeof amount === 'number' && amount > 0 && isFinite(amount);
};

/**
 * Validate phone number (Indian format)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(cleaned) || /^91[6-9]\d{9}$/.test(cleaned);
};

/**
 * Normalize phone number to E.164 format
 */
export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  return phone;
};
