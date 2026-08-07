import type { DB } from '@op-engineering/op-sqlite';

export const migrate014LedgerTransfers = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    // 1. Rename existing transactions table to a backup
    await tx.execute('ALTER TABLE transactions RENAME TO transactions_v3_backup;');

    // 2. Recreate transactions table with updated CHECK constraint
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer_to_goal')),
        category_id TEXT REFERENCES categories(id),
        account_id TEXT REFERENCES accounts(id),
        description TEXT,
        occurred_at INTEGER NOT NULL,
        payment_method TEXT,
        upi_ref TEXT UNIQUE,
        sms_hash TEXT
      );
    `);

    // 3. Copy all data back
    await tx.execute(`
      INSERT INTO transactions (
        id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash
      )
      SELECT 
        id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash
      FROM transactions_v3_backup;
    `);
  });
};
