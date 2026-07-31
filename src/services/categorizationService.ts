import { getDb } from '../store/database';

export interface SuggestedCategory {
  id: string;
  name: string;
  icon: string;
}

export const suggestCategoryForMerchant = async (
  merchant: string,
): Promise<SuggestedCategory | null> => {
  const key = merchant.trim().toLowerCase();
  if (!key) return null;

  const db = getDb();
  const result = await db.execute(
    `SELECT c.id, c.name, c.icon
     FROM merchant_category_map m
     JOIN categories c ON c.id = m.category_id
     WHERE m.merchant = ? LIMIT 1;`,
    [key],
  );
  const row = result.rows?.[0] as unknown as SuggestedCategory | undefined;
  return row ?? null;
};

export const recordMerchantCategory = async (
  merchant: string,
  categoryId: string,
): Promise<void> => {
  const key = merchant.trim().toLowerCase();
  if (!key) return;

  const db = getDb();
  await db.execute(
    `INSERT INTO merchant_category_map (merchant, category_id, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(merchant) DO UPDATE SET category_id = excluded.category_id, updated_at = excluded.updated_at;`,
    [key, categoryId, Date.now()],
  );
};
