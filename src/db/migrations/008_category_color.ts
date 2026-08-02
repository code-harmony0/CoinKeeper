import type { DB } from '@op-engineering/op-sqlite';

/**
 * AddCategorySheet has always built a color picker but never persisted the
 * result — categories only ever stored id/name/icon. This closes that gap so
 * user-picked colors survive.
 */
export const migrate008CategoryColor = async (db: DB): Promise<void> => {
  await db.execute('ALTER TABLE categories ADD COLUMN color TEXT;');
};
