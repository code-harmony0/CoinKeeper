import type { DB } from '@op-engineering/op-sqlite';

/**
 * Not every bill is monthly — an advance-rental Wi-Fi plan can be paid every
 * six months, a car policy every year. `due_day` alone cannot say which
 * months in the cycle apply, so reminders defaulted every bill to monthly and
 * missed the ones that were not. `interval_months` records the real cadence;
 * absent (NULL) means monthly, so every existing bill keeps behaving exactly
 * as it did before this column existed.
 */
export const migrate020BillIntervalMonths = async (db: DB): Promise<void> => {
  const result = await db.execute("PRAGMA table_info('bills');");
  const existingColumns = (result.rows || []).map((col: any) => col.name);
  if (!existingColumns.includes('interval_months')) {
    await db.execute('ALTER TABLE bills ADD COLUMN interval_months INTEGER;');
  }
};
