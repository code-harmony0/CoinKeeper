import type { DB } from '@op-engineering/op-sqlite';
import { classifyBudgetBucket } from '../../utils/budgetBucket';

/**
 * Categories previously had no needs/wants/savings classification, so the
 * Money Plan screen couldn't show real bucket totals or top-spending
 * categories — only the three raw budget_settings percentages. This adds a
 * user-editable column and backfills every existing category with a default
 * guess (see classifyBudgetBucket) so nothing is left NULL after upgrade.
 */
export const migrate009BudgetBucket = async (db: DB): Promise<void> => {
  await db.execute('ALTER TABLE categories ADD COLUMN budget_bucket TEXT DEFAULT NULL;');

  const result = await db.execute('SELECT id, name FROM categories;');
  const rows = (result.rows ?? []) as { id: string; name: string }[];
  for (const row of rows) {
    await db.execute('UPDATE categories SET budget_bucket = ? WHERE id = ?;', [
      classifyBudgetBucket(row.name),
      row.id,
    ]);
  }
};
