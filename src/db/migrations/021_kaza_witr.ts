import type { DB } from '@op-engineering/op-sqlite';

/**
 * Witr is wajib in the Hanafi school, so many users owe it as a sixth daily
 * prayer. Added as a row now; the Kaza screen only shows it when the user
 * switches it on, so everyone else's counts and totals are unchanged.
 */
export const migrate021KazaWitr = async (db: DB): Promise<void> => {
  await db.execute(
    "INSERT OR IGNORE INTO kaza_prayers (name, arabic, completed, pending) VALUES ('Witr', 'الوتر', 0, 0);",
  );
};
