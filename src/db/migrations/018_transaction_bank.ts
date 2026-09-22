import { DB } from '@op-engineering/op-sqlite';

/**
 * Which bank a transaction came from.
 *
 * People routinely hold several accounts, and an SMS import mixes them all
 * together. Without this the app can show "everything" and nothing else —
 * there is no way to look at one bank alone. Nullable because manually
 * entered and CSV-imported transactions have no bank of origin.
 */
export const migrate018TransactionBank = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    await tx.execute('ALTER TABLE transactions ADD COLUMN bank_id TEXT;');
    await tx.execute(
      'CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions (bank_id);',
    );
  });
};
