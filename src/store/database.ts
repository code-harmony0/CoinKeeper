import { initEncryptedDb, getDb } from '../db';

export { getDb };

export const initDatabase = async (): Promise<void> => {
  try {
    await initEncryptedDb();
    const database = getDb();

    await database.execute(`
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

    // Privacy-First Local AI Tables
    await database.execute(`
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

    await database.execute(`
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        name TEXT,
        defaultCategory TEXT,
        transactionCount INTEGER DEFAULT 0,
        lastSeen TEXT
      );
    `);

    await database.execute(`
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

    await database.execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT,
        targetAmount REAL,
        currentAmount REAL,
        deadline TEXT
      );
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS kaza_prayers (
        name TEXT PRIMARY KEY,
        arabic TEXT,
        completed INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0
      );
    `);

    await database.execute(`
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
      await database.execute(
        'INSERT OR IGNORE INTO kaza_prayers (name, arabic, completed, pending) VALUES (?, ?, 0, 0);',
        [name, arabic],
      );
    }
  } catch (error) {
    console.error('[database] initDatabase error:', error);
  }
};

export const getPreference = async (key: string): Promise<string | null> => {
  try {
    const database = getDb();
    const result = await database.execute(
      'SELECT value FROM preferences WHERE key = ?;',
      [key],
    );
    const row = result.rows?.[0] as { value?: string } | undefined;
    return row?.value ?? null;
  } catch (error) {
    console.error('[database] getPreference error:', error);
    return null;
  }
};

export const setPreference = async (
  key: string,
  value: string,
): Promise<void> => {
  try {
    const database = getDb();
    await database.execute(
      'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?);',
      [key, value],
    );
  } catch (error) {
    console.error('[database] setPreference error:', error);
  }
};
