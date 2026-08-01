import type { DB } from '@op-engineering/op-sqlite';

export const migrate003Intelligence = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    // --- New tables -------------------------------------------------------

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
        category_id TEXT REFERENCES categories(id),
        due_day INTEGER NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 1,
        last_paid_at INTEGER,
        notification_id TEXT
      );
    `);

    // Drop and recreate subscriptions with amount_paise instead of amount REAL
    // Since it's fully auto-populated, dropping it is safe.
    await tx.execute(`DROP TABLE IF EXISTS subscriptions;`);
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT,
        amount_paise INTEGER,
        cycle TEXT,
        nextDueDate TEXT,
        isAutoDetected INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1
      );
    `);
  });
};
