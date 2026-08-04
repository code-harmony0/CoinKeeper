import type { DB } from '@op-engineering/op-sqlite';

/**
 * Templates for income that repeats every month (salary, retainer, etc).
 * RecurringIncomeService materializes one `transactions` row per covered
 * month with a deterministic id (`rec_<templateId>_<YYYY-MM>`), so a template
 * itself never appears in the transaction list or the Money Plan — only the
 * rows it generates do.
 */
export const migrate011RecurringIncome = async (db: DB): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS recurring_income (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
      day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
      start_month TEXT NOT NULL,   -- 'YYYY-MM', first month this template covers
      end_month TEXT,              -- 'YYYY-MM', last covered month; NULL = open-ended
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
};
