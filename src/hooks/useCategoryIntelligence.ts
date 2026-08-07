import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../store/database';
import { financialEventBus } from '../services/EventBus';
import { CategoryData, MergeSuggestion } from '../types/category';
import { findMergeCandidates } from '../utils/categorySimilarity';

const ATTENTION_FALLBACK_IDS = new Set(['unknown', 'others']);
const OVER_BUDGET_MULTIPLIER = 1.3;
const LOW_USAGE_THRESHOLD = 2;
const MERGE_THRESHOLD = 0.6;

const classifyHealth = (
  id: string,
  usageCount: number,
  monthlySpend: number,
  trailingAverageSpend: number,
): CategoryData['health'] => {
  if (usageCount === 0) return 'unused';
  if (trailingAverageSpend > 0 && monthlySpend > trailingAverageSpend * OVER_BUDGET_MULTIPLIER) {
    return 'over_budget';
  }
  if (usageCount <= LOW_USAGE_THRESHOLD || ATTENTION_FALLBACK_IDS.has(id)) {
    return 'attention';
  }
  return 'healthy';
};

export const useCategoryIntelligence = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const db = getDb();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const result = await db.execute(
      `
      SELECT
        c.id,
        c.name,
        c.icon,
        c.color,
        c.budget_bucket,
        COUNT(t.id) as usageCount,
        SUM(CASE WHEN t.type = 'expense' AND t.occurred_at >= ? THEN t.amount_paise ELSE 0 END) as currentMonthSpendPaise
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name;
    `,
      [monthStart],
    );
    const rawRows = (result?.rows ?? []) as any[];

    const enriched = await Promise.all(
      rawRows.map(async (row): Promise<CategoryData> => {
        const [topMerchantsRes, monthlyRes, trailingRes] = await Promise.all([
          db.execute(
            `SELECT description, COUNT(*) as c
             FROM transactions
             WHERE category_id = ? AND description IS NOT NULL AND description != ''
             GROUP BY description
             ORDER BY c DESC
             LIMIT 3`,
            [row.id],
          ),
          db.execute(
            `SELECT strftime('%Y-%m', datetime(occurred_at / 1000, 'unixepoch')) as ym,
                    SUM(amount_paise) as spendPaise
             FROM transactions
             WHERE category_id = ? AND type = 'expense'
               AND occurred_at >= ?
             GROUP BY ym
             ORDER BY ym ASC`,
            [row.id, Date.now() - 1000 * 60 * 60 * 24 * 30 * 6],
          ),
          db.execute(
            `SELECT AVG(monthTotal) as avgSpendPaise FROM (
               SELECT strftime('%Y-%m', datetime(occurred_at / 1000, 'unixepoch')) as ym,
                      SUM(amount_paise) as monthTotal
               FROM transactions
               WHERE category_id = ? AND type = 'expense'
                 AND occurred_at >= ? AND occurred_at < ?
               GROUP BY ym
             )`,
            [row.id, Date.now() - 1000 * 60 * 60 * 24 * 30 * 3, Date.now()],
          ),
        ]);

        const merchants = ((topMerchantsRes?.rows ?? []) as any[]).map(m => m.description);
        const monthlyRows = (monthlyRes?.rows ?? []) as any[];
        const trend = monthlyRows.map(r => (r.spendPaise || 0) / 100);
        const monthlySpend = (row.currentMonthSpendPaise || 0) / 100;
        const trailingAverageSpend = ((trailingRes?.rows?.[0] as any)?.avgSpendPaise || 0) / 100;
        const usageCount = row.usageCount || 0;

        return {
          id: row.id,
          name: row.name,
          icon: row.icon || 'MoreHorizontal',
          color: row.color ?? undefined,
          budgetBucket: row.budget_bucket ?? undefined,
          usageCount,
          monthlySpend,
          trailingAverageSpend,
          topMerchants: merchants,
          trend,
          health: classifyHealth(row.id, usageCount, monthlySpend, trailingAverageSpend),
          isUnused: usageCount === 0,
        };
      }),
    );

    setCategories(enriched);
    setMergeSuggestions(
      findMergeCandidates(enriched, MERGE_THRESHOLD).flatMap(({ a, b, score }) => {
        const catA = enriched.find(c => c.id === a);
        const catB = enriched.find(c => c.id === b);
        if (!catA || !catB) return [];
        return [{ categoryId: a, suggestedWithId: b, suggestedWithName: catB.name, score }];
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = financialEventBus.subscribe(() => {
      load();
    });
    return unsubscribe;
  }, [load]);

  return { categories, mergeSuggestions, loading, reload: load };
};
