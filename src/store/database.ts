import { open, type DB } from '@op-engineering/op-sqlite';

let db: DB | null = null;

export const getDb = (): DB => {
  if (!db) {
    db = open({ name: 'coinkeeper.db' });
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  try {
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
