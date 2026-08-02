import { getDb } from '../store/database';

/**
 * Merges sourceId into targetId: reassigns every transaction and every
 * merchant-learning table row (merchant_learning, favorite_merchants,
 * recent_merchants, merchant_category_map) from source to target, then
 * deletes the now-empty source category. Runs in one DB transaction so a
 * mid-merge failure doesn't leave transactions half-reassigned.
 */
export const mergeCategories = async (sourceId: string, targetId: string): Promise<void> => {
  const db = getDb();

  await db.transaction(async tx => {
    await tx.execute('UPDATE transactions SET category_id = ? WHERE category_id = ?;', [targetId, sourceId]);
    await tx.execute('UPDATE merchant_learning SET category_id = ? WHERE category_id = ?;', [targetId, sourceId]);
    await tx.execute('UPDATE favorite_merchants SET category_id = ? WHERE category_id = ?;', [targetId, sourceId]);
    await tx.execute('UPDATE recent_merchants SET category_id = ? WHERE category_id = ?;', [targetId, sourceId]);
    await tx.execute('UPDATE merchant_category_map SET category_id = ? WHERE category_id = ?;', [targetId, sourceId]);
    await tx.execute('DELETE FROM categories WHERE id = ?;', [sourceId]);
  });
};
