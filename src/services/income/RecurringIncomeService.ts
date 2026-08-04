import { getDb } from '../../store/database';
import { IncomeEngine } from './IncomeEngine';
import { TransactionDraft } from '../../types/transactionDraft';
import { TransactionDraftService } from '../TransactionDraftService';

export interface RecurringIncomeTemplate {
  id: string;
  label: string;
  amountPaise: number;
  dayOfMonth: number;
  startMonth: string; // 'YYYY-MM'
  endMonth: string | null;
  active: boolean;
}

const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Next month key after `key` ('YYYY-MM'), month arithmetic via Date so year rollover is correct. */
const nextMonthKey = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m, 1); // m is 1-based here, so this already points at next month
  return monthKey(d);
};

const daysInMonth = (year: number, month1based: number): number =>
  new Date(year, month1based, 0).getDate();

/**
 * The date a template's transaction lands on for a given 'YYYY-MM' — clamped
 * to the month's real last day, so a day_of_month of 31 doesn't overflow into
 * the next month for February, April, etc.
 */
const dateForMonth = (key: string, dayOfMonth: number): Date => {
  const [y, m] = key.split('-').map(Number);
  const day = Math.min(dayOfMonth, daysInMonth(y, m));
  return new Date(y, m - 1, day);
};

export const RecurringIncomeService = {
  /**
   * Creates a recurring template. Does NOT itself create any transaction —
   * call syncRecurringIncome() afterward (or rely on the next app boot) to
   * materialize the covered months, so there is exactly one code path that
   * ever creates a recurring income transaction.
   */
  async createTemplate(input: {
    label: string;
    amountPaise: number;
    dayOfMonth: number;
    startMonth: string;
  }): Promise<string> {
    const db = getDb();
    const id = generateId();
    await db.execute(
      `INSERT INTO recurring_income (id, label, amount_paise, day_of_month, start_month, end_month, active)
       VALUES (?, ?, ?, ?, ?, NULL, 1)`,
      [id, input.label, input.amountPaise, input.dayOfMonth, input.startMonth],
    );
    return id;
  },

  /**
   * Generates any transactions missing between each active template's
   * start_month and the current month (inclusive), using deterministic ids so
   * re-running — e.g. on every app boot — is a no-op for months already
   * generated. Never generates ahead of the current month.
   */
  async syncRecurringIncome(): Promise<void> {
    const db = getDb();
    const result = await db.execute(
      'SELECT * FROM recurring_income WHERE active = 1;',
    );
    const templates = (result.rows ?? []) as any[];
    if (templates.length === 0) return;

    const currentMonth = monthKey(new Date());

    for (const row of templates) {
      const endMonth: string | null = row.end_month;
      let cursor: string = row.start_month;

      // start_month > currentMonth would loop forever without this guard.
      while (cursor <= currentMonth && (!endMonth || cursor <= endMonth)) {
        const occurredAt = dateForMonth(cursor, row.day_of_month);
        const transactionId = `rec_${row.id}_${cursor}`;

        const draft: TransactionDraft = {
          ...TransactionDraftService.createDraft('manual'),
          type: 'income',
          amount_paise: row.amount_paise,
          merchant_name: row.label,
          date: occurredAt.toISOString(),
          income_type: 'salary',
        };

        // Idempotent: IncomeEngine INSERT OR IGNOREs on this id, so a month
        // already generated is a harmless no-op, not a duplicate deposit.
        await IncomeEngine.processConfirmedIncome(draft, { id: transactionId });

        cursor = nextMonthKey(cursor);
      }
    }
  },
};
