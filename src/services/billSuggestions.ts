import { inferSchedule, type RecurringPayment } from './spendingAnalysis';

export interface BillSuggestion {
  name: string;
  amountPaise: number;
  dueDay: number;
  /** How often it actually falls due — 1, 3, 6 or 12 months. Not every bill is monthly. */
  intervalMonths: number;
  /**
   * The last date this payment actually landed, ISO. A multi-month cadence
   * needs this as its anchor: "19th" alone cannot say which months in a
   * 6-month cycle are real, only the payment's own history can.
   */
  lastSeen: string;
}

/**
 * Repeating payments the user does not yet track as a bill, at whatever
 * cadence the ledger itself shows — a 6-monthly Wi-Fi rental is as real a
 * bill as a monthly one. Once they are bills, the existing reminder system
 * warns before each one lands, with no second alert mechanism to keep in step.
 */
export const suggestBills = (
  recurring: readonly RecurringPayment[],
  existingBills: readonly { name: string; amountPaise: number }[],
): BillSuggestion[] => {
  const tracked = new Set(existingBills.map(b => `${b.name.trim().toLowerCase()}|${b.amountPaise}`));

  return recurring.flatMap(payment => {
    const schedule = inferSchedule(payment.dates);
    const key = `${payment.payee.trim().toLowerCase()}|${payment.amountPaise}`;
    if (!schedule || tracked.has(key)) return [];
    return [{
      name: payment.payee,
      amountPaise: payment.amountPaise,
      dueDay: schedule.dueDay,
      intervalMonths: schedule.intervalMonths,
      lastSeen: payment.lastSeen,
    }];
  });
};
