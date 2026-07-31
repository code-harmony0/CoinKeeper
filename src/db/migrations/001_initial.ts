import type { DB } from '@op-engineering/op-sqlite';

/**
 * Baseline schema — this is exactly what src/store/database.ts's old
 * initDatabase() created, captured as a versioned migration so 002_finance.ts
 * has a defined v1 to migrate *from*. Real devices already have these tables;
 * this migration is a no-op on them (CREATE TABLE IF NOT EXISTS) and only
 * does real work on a fresh install.
 */
export const migrate001Initial = async (db: DB): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      amount REAL,
      type TEXT,
      category TEXT,
      categoryIcon TEXT,
      description TEXT,
      date TEXT,
      paymentMethod TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS personal_transactions (
      id TEXT PRIMARY KEY,
      amount REAL,
      type TEXT,
      category TEXT,
      merchant TEXT,
      date TEXT,
      isAutoImported INTEGER DEFAULT 0,
      originalSms TEXT,
      notes TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT,
      defaultCategory TEXT,
      transactionCount INTEGER DEFAULT 0,
      lastSeen TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT,
      amount REAL,
      cycle TEXT,
      nextDueDate TEXT,
      isAutoDetected INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 1
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT,
      targetAmount REAL,
      currentAmount REAL,
      deadline TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS kaza_prayers (
      name TEXT PRIMARY KEY,
      arabic TEXT,
      completed INTEGER DEFAULT 0,
      pending INTEGER DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS kaza_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prayer TEXT,
      action TEXT,
      date TEXT
    );
  `);

  const kazaPrayers: Array<[string, string]> = [
    ['Fajr', 'الفجر'],
    ['Dhuhr', 'الظهر'],
    ['Asr', 'العصر'],
    ['Maghrib', 'المغرب'],
    ['Isha', 'العشاء'],
  ];

  for (const [name, arabic] of kazaPrayers) {
    await db.execute(
      'INSERT OR IGNORE INTO kaza_prayers (name, arabic, completed, pending) VALUES (?, ?, 0, 0);',
      [name, arabic],
    );
  }
};
