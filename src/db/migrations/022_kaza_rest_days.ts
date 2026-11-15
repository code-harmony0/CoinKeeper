import type { DB } from '@op-engineering/op-sqlite';

/**
 * Days the person paused their Kaza streak — period, travel, illness. One row
 * per local calendar day ("YYYY-MM-DD"); the streak engine skips these days
 * instead of counting them as misses.
 */
export const migrate022KazaRestDays = async (db: DB): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS kaza_rest_days (
      date TEXT PRIMARY KEY
    );
  `);
};
