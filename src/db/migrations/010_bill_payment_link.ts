import type { DB } from '@op-engineering/op-sqlite';

/**
 * Links a paid bill to the expense transaction it generated, so markPaid/unpay
 * can find and remove exactly that row instead of guessing by name+amount.
 * Same guarded ALTER TABLE pattern as 004_bills_advanced.ts.
 */
export const migrate010BillPaymentLink = async (db: DB): Promise<void> => {
  const result = await db.execute("PRAGMA table_info('bills');");
  const existingColumns = (result.rows || []).map((col: any) => col.name);

  if (!existingColumns.includes('last_paid_transaction_id')) {
    await db.execute('ALTER TABLE bills ADD COLUMN last_paid_transaction_id TEXT;');
  }
};
