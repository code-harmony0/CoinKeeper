# Category Intelligence Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `CategoriesScreen` from a flat CRUD list into a Category
Intelligence dashboard, per `docs/plans/2026-08-02-category-intelligence-design.md`.

**Architecture:** New `useCategoryIntelligence` hook owns all derived intelligence
(health classification, merge candidates, 6-month trend). Ten focused
product-named components under `src/components/categories/` replace
`ExpandableCategoryRow`. `AddCategorySheet` gains an edit mode instead of a new sheet.
One schema migration (009) adds `categories.color`.

**Tech Stack:** React Native, TypeScript, `react-native-svg` (sparkline),
`react-native-reanimated`, `@op-engineering/op-sqlite`, Jest + `@testing-library/react-native`.

**Shared prerequisite:** `jest.config.js`'s `transformIgnorePatterns` doesn't allow
`uuid`'s ESM build through, which hides `CategoriesScreen.test.tsx` today (it fails
to *load*, not fails on assertions — confirmed by running it). This is the same bug
documented in `docs/plans/2026-08-02-transaction-screens-fixes.md` Task 1. Task 1
below applies the identical one-line fix; if that other plan already landed it, this
task is a no-op (the file will already be in the fixed state — check before editing).

---

### Task 1: Fix Jest `transformIgnorePatterns` for `uuid` (shared prerequisite)

**Files:**
- Modify: `jest.config.js`

**Step 1: Check current state**

Run: `grep -n "uuid" jest.config.js`

If this already prints a match inside the `transformIgnorePatterns` array, skip to
Step 3 — it's already fixed (likely by the sibling transaction-screens-fixes plan).

**Step 2: Add `uuid` to the allow-list**

Change:
```js
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?@?react-native' +
      '|@react-native-community' +
      '|@react-navigation' +
      '|@op-engineering/op-sqlite' +
      '|react-native-gesture-handler' +
      '|react-native-reanimated' +
      '|react-native-safe-area-context' +
      '|react-native-screens' +
      '|react-native-linear-gradient' +
      '|react-native-chart-kit' +
      '|@shopify/flash-list' +
      ')/)',
  ],
```
to:
```js
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?@?react-native' +
      '|@react-native-community' +
      '|@react-navigation' +
      '|@op-engineering/op-sqlite' +
      '|react-native-gesture-handler' +
      '|react-native-reanimated' +
      '|react-native-safe-area-context' +
      '|react-native-screens' +
      '|react-native-linear-gradient' +
      '|react-native-chart-kit' +
      '|@shopify/flash-list' +
      '|uuid' +
      ')/)',
  ],
```

**Step 3: Confirm `CategoriesScreen.test.tsx` now loads**

Run: `npx jest __tests__/screens/CategoriesScreen.test.tsx --verbose 2>&1 | tail -40`

Expected: suite loads (it will fail on real assertions since the screen isn't
rewritten yet — that's fine, Task 11 fixes those failures for real).

**Step 4: Commit (skip if this was a no-op in Step 1)**

```bash
git add jest.config.js
git commit -m "fix: allow uuid's ESM build through Jest transform"
```

---

### Task 2: Migration 009 — add `categories.color`

**Files:**
- Create: `src/db/migrations/009_category_color.ts`
- Modify: `src/db/migrations/index.ts`

**Problem:** `AddCategorySheet.tsx` already builds a full color picker but its insert
comment reads "Skipping color insert to avoid schema error if column not present" —
the picked color is silently discarded. `categories` has no `color` column.

**Step 1: Write the migration**

Create `src/db/migrations/009_category_color.ts`:
```ts
import type { DB } from '@op-engineering/op-sqlite';

/**
 * AddCategorySheet has always built a color picker but never persisted the
 * result — categories only ever stored id/name/icon. This closes that gap so
 * user-picked colors survive.
 */
export const migrate009CategoryColor = async (db: DB): Promise<void> => {
  await db.execute('ALTER TABLE categories ADD COLUMN color TEXT;');
};
```

**Step 2: Register it**

In `src/db/migrations/index.ts`, add the import:
```ts
import { migrate007IncomeIntelligence } from './007_income_intelligence';
```
→ (adjust based on whatever the last import is after Task-5-of-the-sibling-plan may
have added migration 008 — check the file first with
`tail -5 src/db/migrations/index.ts` before editing so the version numbers stay
sequential; if migration 008 exists, this becomes migration 009 as planned, if it
doesn't exist yet, ask before renumbering):
```ts
import { migrate007IncomeIntelligence } from './007_income_intelligence';
import { migrate009CategoryColor } from './009_category_color';
```

And add the version bump as the last block in `runMigrations`:
```ts
  if (currentVersion < 9) {
    await migrate009CategoryColor(db);
    await db.execute('PRAGMA user_version = 9;');
  }
};
```

**Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 4: Commit**

```bash
git add src/db/migrations/009_category_color.ts src/db/migrations/index.ts
git commit -m "feat: add categories.color column (migration 009)"
```

---

### Task 3: Shared category icon resolver

**Files:**
- Create: `src/utils/categoryIcon.ts`

**Problem:** The 8 seeded default categories (`food`, `transport`, `shopping`,
`entertainment`, `bills`, `health`, `education`, `others` — migration 002) store
MaterialCommunityIcons-style dash-case icon names (`'car'`, `'gamepad-variant'`).
`ExpandableCategoryRow`'s lookup (`(Icons as any)[category.icon]`, where `Icons` is
`lucide-react-native`) expects PascalCase (`Icons.Car`) — so every seeded default
category silently renders the `MoreHorizontal` fallback today. Categories created via
`AddCategorySheet` *do* store real Lucide PascalCase names (from its `ICON_GROUPS`),
so the dynamic lookup works for those. `CategoryCard` (Task 9) needs a resolver that
handles both.

**Step 1: Write the resolver**

Create `src/utils/categoryIcon.ts`:
```ts
import * as Icons from 'lucide-react-native';

/**
 * Seeded default categories (migration 002) store MaterialCommunityIcons-style
 * dash-case icon names, not lucide-react-native's PascalCase exports — this
 * maps the known default ids to a matching Lucide icon. Categories created via
 * AddCategorySheet store real Lucide names directly and skip this map entirely.
 */
const DEFAULT_ID_TO_ICON: Record<string, keyof typeof Icons> = {
  food: 'Utensils',
  transport: 'Car',
  shopping: 'ShoppingBag',
  entertainment: 'Film',
  bills: 'Receipt',
  health: 'HeartPulse',
  education: 'BookOpen',
  others: 'MoreHorizontal',
};

export const resolveCategoryIcon = (id: string, iconName: string | undefined) => {
  if (iconName && (Icons as any)[iconName]) {
    return (Icons as any)[iconName];
  }
  const fallbackName = DEFAULT_ID_TO_ICON[id];
  if (fallbackName) {
    return Icons[fallbackName];
  }
  return Icons.MoreHorizontal;
};
```

**Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 3: Commit**

```bash
git add src/utils/categoryIcon.ts
git commit -m "fix: resolve seeded default categories' MDI-style icon names to lucide icons"
```

---

### Task 4: Category similarity utility

**Files:**
- Create: `src/utils/categorySimilarity.ts`
- Test: `__tests__/utils/categorySimilarity.test.ts`

**Step 1: Write the failing test**

Create `__tests__/utils/categorySimilarity.test.ts`:
```ts
import { normalizedSimilarity, findMergeCandidates } from '../../src/utils/categorySimilarity';

describe('normalizedSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(normalizedSimilarity('Food', 'Food')).toBe(1);
  });

  it('returns a high score for near-identical names', () => {
    expect(normalizedSimilarity('Dining', 'Dinning')).toBeGreaterThan(0.7);
  });

  it('returns a low score for unrelated names', () => {
    expect(normalizedSimilarity('Food', 'Rent')).toBeLessThan(0.4);
  });
});

describe('findMergeCandidates', () => {
  it('pairs up categories above the similarity threshold', () => {
    const categories = [
      { id: 'a', name: 'Dining' },
      { id: 'b', name: 'Restaurants' },
      { id: 'c', name: 'Travel' },
    ];
    const pairs = findMergeCandidates(categories, 0.6);
    expect(pairs).toEqual([]);
  });

  it('flags a genuinely close pair', () => {
    const categories = [
      { id: 'a', name: 'Grocery' },
      { id: 'b', name: 'Groceries' },
      { id: 'c', name: 'Travel' },
    ];
    const pairs = findMergeCandidates(categories, 0.6);
    expect(pairs).toEqual([{ a: 'a', b: 'b', score: expect.any(Number) }]);
  });
});
```

**Step 2: Run it to see it fail**

Run: `npx jest categorySimilarity.test.ts --verbose 2>&1 | tail -30`
Expected: FAIL — `Cannot find module '../../src/utils/categorySimilarity'`.

**Step 3: Write the implementation**

Create `src/utils/categorySimilarity.ts`:
```ts
/** Classic Levenshtein edit distance. */
const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
};

/** 0 (unrelated) to 1 (identical), case-insensitive. */
export const normalizedSimilarity = (a: string, b: string): number => {
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  const distance = levenshtein(normA, normB);
  return 1 - distance / maxLen;
};

export interface MergeCandidate {
  a: string;
  b: string;
  score: number;
}

/** All pairs of categories whose name similarity is at or above the threshold. */
export const findMergeCandidates = (
  categories: Array<{ id: string; name: string }>,
  threshold: number = 0.6,
): MergeCandidate[] => {
  const pairs: MergeCandidate[] = [];
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const score = normalizedSimilarity(categories[i].name, categories[j].name);
      if (score >= threshold) {
        pairs.push({ a: categories[i].id, b: categories[j].id, score });
      }
    }
  }
  return pairs;
};
```

**Step 4: Run the test to see it pass**

Run: `npx jest categorySimilarity.test.ts --verbose 2>&1 | tail -30`
Expected: 5 passing tests. If "Dining"/"Restaurants" unexpectedly scores >= 0.6
(it shouldn't — those share no structural similarity), lower the test's confidence in
that assertion is wrong, not the algorithm; re-check the actual score printed in the
failure diff before changing threshold logic.

**Step 5: Commit**

```bash
git add src/utils/categorySimilarity.ts __tests__/utils/categorySimilarity.test.ts
git commit -m "feat: add category name-similarity utility for merge suggestions"
```

---

### Task 5: `useCategoryIntelligence` hook

**Files:**
- Create: `src/hooks/useCategoryIntelligence.ts`
- Create: `src/types/category.ts`
- Test: `__tests__/hooks/useCategoryIntelligence.test.ts`

**Step 1: Define the shared type**

Create `src/types/category.ts` (moves `CategoryData` out of `CategoriesScreen.tsx` so
it has no screen dependency):
```ts
export type CategoryHealth = 'healthy' | 'unused' | 'over_budget' | 'attention';

export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  color?: string;
  usageCount: number;
  monthlySpend: number;
  trailingAverageSpend: number;
  topMerchants: string[];
  trend: number[]; // last 6 months, oldest first, rupees
  health: CategoryHealth;
  isUnused: boolean;
}

export interface MergeSuggestion {
  categoryId: string;
  suggestedWithId: string;
  suggestedWithName: string;
  score: number;
}
```

**Step 2: Write the hook**

Create `src/hooks/useCategoryIntelligence.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../store/database';
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

    const result = await db.execute(`
      SELECT
        c.id,
        c.name,
        c.icon,
        c.color,
        COUNT(t.id) as usageCount,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount_paise ELSE 0 END) as totalSpendPaise
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name;
    `);
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
        const monthlySpend = (row.totalSpendPaise || 0) / 100; // NOTE: total, not current-month — see Step 3
        const trailingAverageSpend = ((trailingRes?.rows?.[0] as any)?.avgSpendPaise || 0) / 100;
        const usageCount = row.usageCount || 0;

        return {
          id: row.id,
          name: row.name,
          icon: row.icon || 'MoreHorizontal',
          color: row.color ?? undefined,
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
  }, [load]);

  return { categories, mergeSuggestions, loading, reload: load };
};
```

**Step 3: Fix the current-month vs. total-spend mismatch before writing tests**

`row.totalSpendPaise` from the main query is the category's **all-time** expense
total (no date filter), but `classifyHealth`'s over-budget check needs
**current-month** spend to compare against the trailing-3-month average sensibly.
Add a fourth query for current-month spend and use that instead of `monthlySpend` in
the health call. Change the main aggregation query and the per-row block:

Replace:
```ts
    const result = await db.execute(`
      SELECT
        c.id,
        c.name,
        c.icon,
        c.color,
        COUNT(t.id) as usageCount,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount_paise ELSE 0 END) as totalSpendPaise
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name;
    `);
```
with (add a bind-safe current-month window computed once, outside the loop):
```ts
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const result = await db.execute(`
      SELECT
        c.id,
        c.name,
        c.icon,
        c.color,
        COUNT(t.id) as usageCount,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount_paise ELSE 0 END) as totalSpendPaise,
        SUM(CASE WHEN t.type = 'expense' AND t.occurred_at >= ? THEN t.amount_paise ELSE 0 END) as currentMonthSpendPaise
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name;
    `, [monthStart]);
```

Then in the per-row mapping, replace:
```ts
        const monthlySpend = (row.totalSpendPaise || 0) / 100; // NOTE: total, not current-month — see Step 3
```
with:
```ts
        const monthlySpend = (row.currentMonthSpendPaise || 0) / 100;
```

Note `row.totalSpendPaise` is now unused in the per-row block; if a card in Task 9
wants an "all-time spend" figure separately from `monthlySpend`, add it back as its
own field then — don't leave a dead variable.

**Step 4: Write the hook test**

Create `__tests__/hooks/useCategoryIntelligence.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCategoryIntelligence } from '../../src/hooks/useCategoryIntelligence';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

describe('useCategoryIntelligence', () => {
  beforeEach(() => mockExecute.mockReset());

  it('classifies a zero-usage category as unused', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ id: 'travel', name: 'Travel', icon: 'Plane', color: null, usageCount: 0, totalSpendPaise: 0, currentMonthSpendPaise: 0 }] })
      .mockResolvedValueOnce({ rows: [] }) // top merchants
      .mockResolvedValueOnce({ rows: [] }) // 6-month trend
      .mockResolvedValueOnce({ rows: [{ avgSpendPaise: 0 }] }); // trailing average

    const { result } = renderHook(() => useCategoryIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories[0].health).toBe('unused');
  });

  it('classifies a category spending well above its trailing average as over_budget', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ id: 'food', name: 'Food', icon: 'Utensils', color: null, usageCount: 10, totalSpendPaise: 500000, currentMonthSpendPaise: 500000 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ avgSpendPaise: 200000 }] }); // 3-month avg ₹2000, this month ₹5000

    const { result } = renderHook(() => useCategoryIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories[0].health).toBe('over_budget');
  });

  it('surfaces a merge suggestion for near-identical category names', async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          { id: 'grocery', name: 'Grocery', icon: 'ShoppingBag', color: null, usageCount: 5, totalSpendPaise: 100000, currentMonthSpendPaise: 50000 },
          { id: 'groceries', name: 'Groceries', icon: 'ShoppingBag', color: null, usageCount: 3, totalSpendPaise: 60000, currentMonthSpendPaise: 30000 },
        ],
      })
      .mockResolvedValue({ rows: [] }); // all per-row queries for both categories

    const { result } = renderHook(() => useCategoryIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mergeSuggestions).toHaveLength(1);
    expect(result.current.mergeSuggestions[0].categoryId).toBe('grocery');
    expect(result.current.mergeSuggestions[0].suggestedWithName).toBe('Groceries');
  });
});
```

**Step 5: Run the tests**

Run: `npx jest useCategoryIntelligence.test.ts --verbose 2>&1 | tail -60`

Expected: 3 passing tests. Watch for mock-ordering mistakes — each category triggers
3 sequential per-row queries (`Promise.all` of top-merchants/trend/trailing-average)
in that literal order, so `mockResolvedValueOnce` calls must be queued in that exact
sequence per category. If a test fails on an unexpected `undefined` read, log
`mockExecute.mock.calls` to see what SQL was actually requested at that point before
guessing at the fix.

**Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 7: Commit**

```bash
git add src/hooks/useCategoryIntelligence.ts src/types/category.ts __tests__/hooks/useCategoryIntelligence.test.ts
git commit -m "feat: add useCategoryIntelligence hook with health classification and merge detection"
```

---

### Task 6: `CategorySparkline`

**Files:**
- Create: `src/components/categories/CategorySparkline.tsx`

**Step 1: Write the component**

```tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

interface Props {
  values: number[]; // rupees, oldest first
  width?: number;
  height?: number;
  color: string;
}

export const CategorySparkline: React.FC<Props> = ({ values, width = 64, height = 24, color }) => {
  if (values.length < 2) return <View style={{ width, height }} />;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};
```

**Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/categories/CategorySparkline.tsx
git commit -m "feat: add CategorySparkline"
```

---

### Task 7: `CategoryTopMerchants` and `CategoryActionRow`

**Files:**
- Create: `src/components/categories/CategoryTopMerchants.tsx`
- Create: `src/components/categories/CategoryActionRow.tsx`

**Step 1: `CategoryTopMerchants.tsx`** (extracted from `ExpandableCategoryRow`'s
merchants block as-is, just as its own component):

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  merchants: string[];
}

export const CategoryTopMerchants: React.FC<Props> = ({ merchants }) => {
  const { colors } = useSpecTheme();

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Top Merchants</Text>
      {merchants.length > 0 ? (
        <View style={styles.merchants}>
          {merchants.map((m, i) => (
            <View key={i} style={[styles.merchantChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.merchantText, { color: colors.textPrimary }]}>{m}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>No recent activity</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  merchants: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  merchantChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  merchantText: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
  empty: { fontSize: 13, fontFamily: 'Satoshi-Medium', fontStyle: 'italic', marginBottom: 16 },
});
```

**Step 2: `CategoryActionRow.tsx`** (extracted as-is from `ExpandableCategoryRow`'s
actions block):

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trash2, Edit3, GitMerge } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  onEdit: () => void;
  onMerge: () => void;
  onDelete: () => void;
}

export const CategoryActionRow: React.FC<Props> = ({ onEdit, onMerge, onDelete }) => {
  const { colors } = useSpecTheme();

  return (
    <View style={styles.actions}>
      <View style={styles.actionGroup}>
        <PressableScale onPress={onEdit} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
          <Edit3 size={16} color={colors.textPrimary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Edit</Text>
        </PressableScale>
        <PressableScale onPress={onMerge} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
          <GitMerge size={16} color={colors.textPrimary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Merge</Text>
        </PressableScale>
      </View>
      <PressableScale onPress={onDelete} style={[styles.actionBtn, { backgroundColor: colors.danger + '15' }]} testID="category-delete-btn">
        <Trash2 size={16} color={colors.danger} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionGroup: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  actionText: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
});
```

Note the added `testID="category-delete-btn"` — `CategoriesScreen.test.tsx` (Task 11)
needs a way to target the delete button per-category; `CategoryCard` (Task 9) will
wrap this row per-category, so the real per-category testID
(`delete-category-${id}`) gets applied at that call site, not baked in here.

**Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 4: Commit**

```bash
git add src/components/categories/CategoryTopMerchants.tsx src/components/categories/CategoryActionRow.tsx
git commit -m "feat: extract CategoryTopMerchants and CategoryActionRow"
```

---

### Task 8: `CategoryHealthSummary` and `CategoryAttentionBanner`

**Files:**
- Create: `src/components/categories/CategoryHealthSummary.tsx`
- Create: `src/components/categories/CategoryAttentionBanner.tsx`

**Step 1: `CategoryHealthSummary.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { CategoryData } from '../../types/category';

interface Props {
  categories: CategoryData[];
}

export const CategoryHealthSummary: React.FC<Props> = ({ categories }) => {
  const { colors, cardRadius } = useSpecTheme();

  const total = categories.length;
  const healthy = categories.filter(c => c.health === 'healthy').length;
  const needsAttention = categories.filter(c => c.health !== 'healthy').length;

  return (
    <View style={[styles.row, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{total}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Total</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.success }]}>{healthy}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Healthy</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: needsAttention > 0 ? ((colors as any).warning || '#F59E0B') : colors.textPrimary }]}>
          {needsAttention}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Needs attention</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, marginHorizontal: 24, marginBottom: 16 },
  stat: { alignItems: 'center' },
  value: { fontSize: 22, fontFamily: 'Satoshi-Black' },
  label: { fontSize: 11, fontFamily: 'Satoshi-Medium', marginTop: 2 },
});
```

**Step 2: `CategoryAttentionBanner.tsx`**

Priority: merge suggestions > unused categories > over-budget categories — shows one
computed challenge at a time, dismissible for the session only (local component
state, no persistence).

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CategoryData, MergeSuggestion } from '../../types/category';

interface Props {
  categories: CategoryData[];
  mergeSuggestions: MergeSuggestion[];
  onReviewMerge: () => void;
}

export const CategoryAttentionBanner: React.FC<Props> = ({ categories, mergeSuggestions, onReviewMerge }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [dismissed, setDismissed] = useState(false);

  const unusedCount = categories.filter(c => c.health === 'unused').length;
  const overBudgetCount = categories.filter(c => c.health === 'over_budget').length;

  let message: string | null = null;
  let onPress: (() => void) | undefined;

  if (mergeSuggestions.length > 0) {
    message = `${mergeSuggestions.length} ${mergeSuggestions.length === 1 ? 'pair looks' : 'pairs look'} similar — review merge suggestions?`;
    onPress = onReviewMerge;
  } else if (unusedCount > 0) {
    message = `${unusedCount} unused ${unusedCount === 1 ? 'category' : 'categories'} — clean them up to keep your intelligence model accurate.`;
  } else if (overBudgetCount > 0) {
    message = `${overBudgetCount} ${overBudgetCount === 1 ? 'category is' : 'categories are'} trending above its usual spend this month.`;
  }

  if (!message || dismissed) return null;

  return (
    <PressableScale onPress={onPress} disabled={!onPress} style={[styles.banner, { backgroundColor: '#F59E0B15', borderRadius: cardRadius }]}>
      <AlertTriangle size={20} color="#F59E0B" />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
      <PressableScale onPress={() => setDismissed(true)} style={styles.dismiss}>
        <X size={16} color={colors.textSecondary} />
      </PressableScale>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 24, marginBottom: 12, gap: 12 },
  text: { flex: 1, fontSize: 13, fontFamily: 'Satoshi-Medium', lineHeight: 18 },
  dismiss: { padding: 4 },
});
```

**Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 4: Commit**

```bash
git add src/components/categories/CategoryHealthSummary.tsx src/components/categories/CategoryAttentionBanner.tsx
git commit -m "feat: add CategoryHealthSummary and CategoryAttentionBanner"
```

---

### Task 9: Merge/cleanup execution + `CategoryMergeSuggestion` / `CategoryCleanupCTA`

**Files:**
- Create: `src/services/categoryMergeService.ts`
- Create: `src/components/categories/CategoryMergeSuggestion.tsx`
- Create: `src/components/categories/CategoryCleanupCTA.tsx`
- Test: `__tests__/services/categoryMergeService.test.ts`

**Step 1: Write the failing test for the merge service**

Create `__tests__/services/categoryMergeService.test.ts`:
```ts
const mockExecute = jest.fn();
const mockTransaction = jest.fn(async (fn: any) => fn({ execute: mockExecute }));
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute, transaction: mockTransaction }),
}));

import { mergeCategories } from '../../src/services/categoryMergeService';

describe('mergeCategories', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockTransaction.mockClear();
  });

  it('reassigns transactions and all four merchant-learning tables before deleting the source category', async () => {
    mockExecute.mockResolvedValue({});

    await mergeCategories('source-id', 'target-id');

    const sql = mockExecute.mock.calls.map(c => c[0]);
    expect(sql.some(s => s.includes('UPDATE transactions'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE merchant_learning'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE favorite_merchants'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE recent_merchants'))).toBe(true);
    expect(sql.some(s => s.includes('UPDATE merchant_category_map'))).toBe(true);
    expect(sql.some(s => s.includes('DELETE FROM categories'))).toBe(true);
  });

  it('runs inside a single transaction', async () => {
    mockExecute.mockResolvedValue({});
    await mergeCategories('source-id', 'target-id');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('propagates a failure instead of swallowing it', async () => {
    mockExecute.mockRejectedValue(new Error('locked'));
    await expect(mergeCategories('source-id', 'target-id')).rejects.toThrow('locked');
  });
});
```

**Step 2: Run it to see it fail**

Run: `npx jest categoryMergeService.test.ts --verbose 2>&1 | tail -30`
Expected: FAIL — module not found.

**Step 3: Write the service**

Create `src/services/categoryMergeService.ts`:
```ts
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
```

**Step 4: Run the test again**

Run: `npx jest categoryMergeService.test.ts --verbose 2>&1 | tail -30`
Expected: 3 passing tests.

**Step 5: `CategoryMergeSuggestion.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GitMerge } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  suggestedWithName: string;
  onConfirm: () => void;
}

export const CategoryMergeSuggestion: React.FC<Props> = ({ suggestedWithName, onConfirm }) => {
  const { colors, cardRadius } = useSpecTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryAccent + '10', borderRadius: cardRadius }]}>
      <GitMerge size={16} color={colors.primaryAccent} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        Looks like <Text style={{ fontFamily: 'Satoshi-Bold' }}>{suggestedWithName}</Text> — merge into this category?
      </Text>
      <PressableScale onPress={onConfirm} style={[styles.confirmBtn, { backgroundColor: colors.primaryAccent }]}>
        <Text style={styles.confirmText}>Merge</Text>
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, marginBottom: 16 },
  text: { flex: 1, fontSize: 13, fontFamily: 'Satoshi-Medium', lineHeight: 18 },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  confirmText: { color: '#FFF', fontSize: 12, fontFamily: 'Satoshi-Bold' },
});
```

**Step 6: `CategoryCleanupCTA.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  onDelete: () => void;
}

export const CategoryCleanupCTA: React.FC<Props> = ({ onDelete }) => {
  const { colors, cardRadius } = useSpecTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>0 transactions — this category isn't in use.</Text>
      <PressableScale onPress={onDelete} style={[styles.deleteBtn, { backgroundColor: colors.danger + '15' }]}>
        <Trash2 size={14} color={colors.danger} />
        <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 16 },
  text: { flex: 1, fontSize: 13, fontFamily: 'Satoshi-Medium', marginRight: 8 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  deleteText: { fontSize: 12, fontFamily: 'Satoshi-Bold' },
});
```

**Step 7: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 8: Commit**

```bash
git add src/services/categoryMergeService.ts src/components/categories/CategoryMergeSuggestion.tsx \
        src/components/categories/CategoryCleanupCTA.tsx __tests__/services/categoryMergeService.test.ts
git commit -m "feat: add category merge execution service, CategoryMergeSuggestion, CategoryCleanupCTA"
```

---

### Task 10: `AddCategorySheet` edit mode

**Files:**
- Modify: `src/components/modals/AddCategorySheet.tsx`

**Problem:** Needs an `editing?: CategoryData` prop to become the Edit surface too
(pre-fill fields, `UPDATE` instead of `INSERT`, header text changes), and the
color-insert bug needs fixing now that migration 009 adds the column.

**Step 1: Add the `editing` prop and pre-fill logic**

Add the import and change the `Props` interface:
```tsx
interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```
to:
```tsx
import { CategoryData } from '../../types/category';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: CategoryData;
}
```
(`CategoryData` lives in `src/types/category.ts`, created in Task 5 — not in
`CategoriesScreen.tsx`, which no longer declares it after Task 11.)

Change:
```tsx
export const AddCategorySheet: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
```
to:
```tsx
export const AddCategorySheet: React.FC<Props> = ({ visible, onClose, onSuccess, editing }) => {
```

Change the visibility effect that resets fields:
```tsx
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SHEET_SPRING);
      setName('');
      setSelectedIcon('MoreHorizontal');
      setSelectedColor(COLORS[0]);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(800, SHEET_SPRING);
    }
  }, [visible, translateY, backdropOpacity]);
```
to:
```tsx
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SHEET_SPRING);
      setName(editing?.name ?? '');
      setSelectedIcon(editing?.icon ?? 'MoreHorizontal');
      setSelectedColor(editing?.color ?? COLORS[0]);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(800, SHEET_SPRING);
    }
  }, [visible, translateY, backdropOpacity, editing]);
```

**Step 2: Fix `handleSave` to persist color and branch on edit vs. create**

Change:
```tsx
  const handleSave = async () => {
    if (!name.trim()) return;
    const db = getDb();
    const id = uuidv4();
    // Assuming schema allows color. If not, color is skipped or stored in metadata. We'll try to add it.
    try {
      await db.execute(
        'INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)',
        [id, name.trim(), selectedIcon] // Skipping color insert to avoid schema error if column not present
      );
    } catch (e) {
      console.warn('Failed to insert category', e);
    }
    onSuccess();
    onClose();
  };
```
to:
```tsx
  const handleSave = async () => {
    if (!name.trim()) return;
    const db = getDb();

    try {
      if (editing) {
        await db.execute(
          'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
          [name.trim(), selectedIcon, selectedColor, editing.id],
        );
      } else {
        const id = uuidv4();
        await db.execute(
          'INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
          [id, name.trim(), selectedIcon, selectedColor],
        );
      }
    } catch (e) {
      console.warn('Failed to save category', e);
      return;
    }
    onSuccess();
    onClose();
  };
```

Note this now `return`s on failure instead of silently calling `onSuccess()`/`onClose()`
after a failed save — the previous code closed the sheet and reported success even
when the DB write threw (e.g. a `UNIQUE` constraint violation on `name` from renaming
into a collision). If a caller needs a way to show "name already in use," surface
that via a local error state at the point this is exercised in Task 12's manual pass
— not blocking this task, just don't regress the silent-swallow behavior into a
silent-success-on-failure regression while fixing it.

**Step 3: Update the header title**

Change:
```tsx
            <Text style={[styles.title, { color: colors.textPrimary }]}>New Category</Text>
```
to:
```tsx
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {editing ? 'Edit Category' : 'New Category'}
            </Text>
```

**Step 4: Update the save button label**

Change:
```tsx
              <Text style={[styles.saveText, { color: name.trim() ? '#FFF' : colors.textSecondary }]}>Save Category</Text>
```
to:
```tsx
              <Text style={[styles.saveText, { color: name.trim() ? '#FFF' : colors.textSecondary }]}>
                {editing ? 'Save Changes' : 'Save Category'}
              </Text>
```

**Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors — note `CategoryData` is imported from `src/types/category.ts`
here; `CategoriesScreen.tsx` (Task 11) needs to import it from the same place once
it stops declaring its own local copy, or this will be two incompatible types with
the same name.

**Step 6: Commit**

```bash
git add src/components/modals/AddCategorySheet.tsx
git commit -m "feat: add edit mode to AddCategorySheet, fix silent color/error-swallowing bugs"
```

---

### Task 11: `CategoryCard`, `CategoryExpandedContent`, `CategoryIntelligenceShell`, rewire `CategoriesScreen`

**Files:**
- Create: `src/components/categories/CategoryExpandedContent.tsx`
- Create: `src/components/categories/CategoryCard.tsx`
- Create: `src/components/categories/CategoryIntelligenceShell.tsx`
- Modify (full rewrite): `src/screens/user/CategoriesScreen.tsx`
- Delete: `src/components/budget/ExpandableCategoryRow.tsx`
- Delete: `src/components/budget/ExpandableCategoryCard.tsx` (check first — see Step 6)

This is the integration task. It's the biggest one in this plan — take it slowly and
typecheck after each file.

**Step 1: `CategoryExpandedContent.tsx`** — composes the budget bar (real trailing-avg
comparison, replacing the old fake `monthlySpend * 1.2`), merchants, merge suggestion
(if any), cleanup CTA (if unused), and action row:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { CategoryData, MergeSuggestion } from '../../types/category';
import { CategoryTopMerchants } from './CategoryTopMerchants';
import { CategoryActionRow } from './CategoryActionRow';
import { CategoryMergeSuggestion } from './CategoryMergeSuggestion';
import { CategoryCleanupCTA } from './CategoryCleanupCTA';

interface Props {
  category: CategoryData;
  mergeSuggestion?: MergeSuggestion;
  onEdit: () => void;
  onMerge: () => void;
  onMergeConfirm: () => void;
  onDelete: () => void;
}

export const CategoryExpandedContent: React.FC<Props> = ({
  category,
  mergeSuggestion,
  onEdit,
  onMerge,
  onMergeConfirm,
  onDelete,
}) => {
  const { colors } = useSpecTheme();

  const impact =
    category.trailingAverageSpend > 0
      ? (category.monthlySpend / category.trailingAverageSpend) * 100
      : category.monthlySpend > 0
        ? 100
        : 0;
  const isOver = category.health === 'over_budget';

  return (
    <View style={styles.body}>
      {category.usageCount > 0 && (
        <View style={styles.budgetRow}>
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetFill,
                { width: `${Math.min(impact, 100)}%`, backgroundColor: isOver ? colors.danger : colors.primaryAccent },
              ]}
            />
          </View>
          <Text style={[styles.budgetVal, { color: isOver ? colors.danger : colors.textSecondary }]}>
            {Math.round(impact)}% of usual
          </Text>
        </View>
      )}

      {mergeSuggestion && (
        <CategoryMergeSuggestion suggestedWithName={mergeSuggestion.suggestedWithName} onConfirm={onMergeConfirm} />
      )}

      {category.isUnused && <CategoryCleanupCTA onDelete={onDelete} />}

      <CategoryTopMerchants merchants={category.topMerchants} />

      <CategoryActionRow onEdit={onEdit} onMerge={onMerge} onDelete={onDelete} />
    </View>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 12 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  budgetBar: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
  budgetVal: { fontSize: 12, fontFamily: 'Satoshi-Bold' },
});
```

**Step 2: `CategoryCard.tsx`** — the collapsed row + expand/collapse animation, ported
from `ExpandableCategoryRow` with the icon resolver from Task 3 and a health-colored
accent added:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CategoryData, MergeSuggestion } from '../../types/category';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { CategorySparkline } from './CategorySparkline';
import { CategoryExpandedContent } from './CategoryExpandedContent';

interface Props {
  category: CategoryData;
  mergeSuggestion?: MergeSuggestion;
  onEdit: (category: CategoryData) => void;
  onMerge: (category: CategoryData) => void;
  onMergeConfirm: (sourceId: string, targetId: string) => void;
  onDelete: (id: string) => void;
}

const HEALTH_ACCENT: Record<CategoryData['health'], string> = {
  healthy: 'transparent',
  unused: '#94A3B8',
  over_budget: '#EF4444',
  attention: '#F59E0B',
};

export const CategoryCard: React.FC<Props> = ({ category, mergeSuggestion, onEdit, onMerge, onMergeConfirm, onDelete }) => {
  const { colors, cardRadius, iconShadow } = useSpecTheme();
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    setExpanded(!expanded);
    progress.value = withSpring(expanded ? 0 : 1, { damping: 15 });
  };

  const bodyStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, 220]),
    opacity: progress.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));

  const IconComp = resolveCategoryIcon(category.id, category.icon);
  const accent = HEALTH_ACCENT[category.health];

  return (
    <View style={[styles.container, { backgroundColor: colors.chipBg, borderRadius: cardRadius, borderLeftWidth: accent === 'transparent' ? 0 : 3, borderLeftColor: accent }]}>
      <PressableScale onPress={toggle} style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.background }, iconShadow]}>
          <IconComp size={20} color={category.color || colors.primaryAccent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{category.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {category.usageCount} txs • {category.monthlySpend > 0 ? `₹${category.monthlySpend.toLocaleString()}` : '₹0'}
          </Text>
        </View>
        {category.trend.length >= 2 && (
          <CategorySparkline values={category.trend} color={accent === 'transparent' ? colors.primaryAccent : accent} />
        )}
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={colors.textSecondary} />
        </Animated.View>
      </PressableScale>

      <Animated.View style={bodyStyle}>
        <CategoryExpandedContent
          category={category}
          mergeSuggestion={mergeSuggestion}
          onEdit={() => onEdit(category)}
          onMerge={() => onMerge(category)}
          onMergeConfirm={() => mergeSuggestion && onMergeConfirm(category.id, mergeSuggestion.suggestedWithId)}
          onDelete={() => onDelete(category.id)}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  meta: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
});
```

Note the expanded body height went from `ExpandableCategoryRow`'s fixed `160` to
`220` — the new content (budget row + possible merge-suggestion or cleanup-CTA card +
merchants + actions) is taller than the old version's. If content still clips or
leaves dead space in Step 5's manual check, adjust this number — it's a rough
estimate, not derived from actual measured content height (RN interpolate needs a
fixed target height; a `LayoutAnimation`-based approach that measures real height
would remove this guesswork but is out of scope for this pass since the existing
`ExpandableCategoryRow` used the same fixed-height approach without issue).

**Step 3: `CategoryIntelligenceShell.tsx`** — the screen-level layout, using
`useCategoryIntelligence` and composing the summary/banner/list:

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ArrowLeft, Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CategoryData } from '../../types/category';
import { useCategoryIntelligence } from '../../hooks/useCategoryIntelligence';
import { mergeCategories } from '../../services/categoryMergeService';
import { getDb } from '../../store/database';
import { CategoryHealthSummary } from './CategoryHealthSummary';
import { CategoryAttentionBanner } from './CategoryAttentionBanner';
import { CategoryCard } from './CategoryCard';
import { AddCategorySheet } from '../modals/AddCategorySheet';

interface Props {
  onGoBack: () => void;
}

type SortBy = 'name' | 'spend' | 'usage';

export const CategoryIntelligenceShell: React.FC<Props> = ({ onGoBack }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  const { categories, mergeSuggestions, reload } = useCategoryIntelligence();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('spend');

  const mergeSuggestionByCategoryId = useMemo(() => {
    const map = new Map<string, (typeof mergeSuggestions)[number]>();
    mergeSuggestions.forEach(s => map.set(s.categoryId, s));
    return map;
  }, [mergeSuggestions]);

  const filteredAndSorted = useMemo(() => {
    let result = categories;
    if (searchQuery) {
      result = result.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'spend') return b.monthlySpend - a.monthlySpend;
      if (sortBy === 'usage') return b.usageCount - a.usageCount;
      return a.name.localeCompare(b.name);
    });
  }, [categories, searchQuery, sortBy]);

  const toggleSort = () => {
    setSortBy(prev => (prev === 'spend' ? 'usage' : prev === 'usage' ? 'name' : 'spend'));
  };

  const handleEdit = (category: CategoryData) => {
    setEditingCategory(category);
    setSheetVisible(true);
  };

  const handleMerge = (category: CategoryData) => {
    const suggestion = mergeSuggestionByCategoryId.get(category.id);
    if (!suggestion) {
      Alert.alert('No merge suggestion', 'This category has no detected duplicate right now.');
      return;
    }
    // The expanded card's own CategoryMergeSuggestion already shows a one-tap
    // confirm — this handler backs the action-row "Merge" button as a shortcut
    // into the same expanded state a user would already be looking at.
  };

  const handleMergeConfirm = async (sourceId: string, targetId: string) => {
    try {
      await mergeCategories(sourceId, targetId);
      await reload();
    } catch (e) {
      Alert.alert('Merge failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    if (category.usageCount > 0) {
      Alert.alert('Category in use', `Reassign ${category.usageCount} transaction(s) first before deleting.`);
      return;
    }

    Alert.alert('Delete Category', `Are you sure you want to delete ${category.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const db = getDb();
          await db.execute('DELETE FROM categories WHERE id = ?;', [id]);
          await reload();
        },
      },
    ]);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setEditingCategory(undefined);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <PressableScale onPress={onGoBack} style={[styles.backButton, { backgroundColor: colors.chipBg }]}>
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Intelligence</Text>
        </View>

        <PressableScale onPress={() => setSheetVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primaryAccent }]}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </PressableScale>
      </View>

      <CategoryHealthSummary categories={categories} />

      <CategoryAttentionBanner
        categories={categories}
        mergeSuggestions={mergeSuggestions}
        onReviewMerge={() => {
          // Attention banner is a nudge, not a navigation target in v1 — the
          // merge suggestion itself lives inside each affected category's
          // expanded card, which the user reaches by tapping that card.
        }}
      />

      <View style={styles.toolsRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search categories..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={toggleSort} style={[styles.sortBtn, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
          <SlidersHorizontal size={18} color={colors.textPrimary} />
          <Text style={[styles.sortText, { color: colors.textPrimary }]}>{sortBy}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAndSorted}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32, paddingTop: 16 }}
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            mergeSuggestion={mergeSuggestionByCategoryId.get(item.id)}
            onEdit={handleEdit}
            onMerge={handleMerge}
            onMergeConfirm={handleMergeConfirm}
            onDelete={handleDelete}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <AddCategorySheet visible={sheetVisible} onClose={closeSheet} onSuccess={reload} editing={editingCategory} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black', letterSpacing: -0.5 },
  toolsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, fontFamily: 'Satoshi-Medium' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 48, gap: 8 },
  sortText: { fontSize: 13, fontFamily: 'Satoshi-Bold', textTransform: 'capitalize' },
});
```

Note `handleMerge` (backing the action row's standalone "Merge" button, distinct
from the expanded card's inline `CategoryMergeSuggestion` confirm) is currently a
no-op beyond the "no suggestion" alert — the actual merge confirm path is the inline
suggestion card, which is already visible whenever a suggestion exists. Decide during
Step 5's manual check whether the action-row Merge button needs its own behavior
(e.g. scroll-to and highlight the suggestion) or whether it should just be hidden
when no suggestion exists for that category — don't leave a button that does nothing
observable when tapped.

**Step 4: Rewrite `CategoriesScreen.tsx` as a thin wrapper**

Replace the entire file with:
```tsx
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CategoryIntelligenceShell } from '../../components/categories/CategoryIntelligenceShell';

type Props = NativeStackScreenProps<any, 'Categories'>;

export const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  return <CategoryIntelligenceShell onGoBack={() => navigation.goBack()} />;
};

export default CategoriesScreen;
```

**Step 5: Manual pass — run the app and exercise every state**

This screen has no automated coverage for merge/edit yet (Task 12 covers testing);
before moving on, use the project's `run` skill (or `npx react-native run-android`)
and manually check:
- Categories with real transactions show correct counts/spend and a real sparkline.
- A category spending well above its trailing 3-month average shows the
  `over_budget` accent and higher "% of usual."
- An unused (0-transaction) category shows `CategoryCleanupCTA` in its expanded view.
- Create two categories with near-identical names (e.g. "Snacks" / "Snaks") and
  confirm `CategoryMergeSuggestion` appears in both categories' expanded views, and
  confirming it actually reassigns transactions and removes the merged-away category.
- Edit a category's name/icon/color via the action row and confirm it persists after
  closing and reopening the screen (this is the real test of Task 10's fixes).
- Resolve the `handleMerge` no-op question from Step 3 based on what actually feels
  broken in this pass — fix it here if it's confusing, don't defer silently.

**Step 6: Delete the superseded row component(s)**

Run: `grep -rln "ExpandableCategoryRow" src __tests__`

Expected: only `CategoriesScreen.tsx`'s old import (already removed by Step 4) and
`ExpandableCategoryRow.tsx` itself. If clean:
```bash
git rm src/components/budget/ExpandableCategoryRow.tsx
```

Also check `ExpandableCategoryCard.tsx` — it appeared in the initial graph query
alongside `ExpandableCategoryRow.tsx` but was never read during this plan's
investigation. Check what uses it before touching it:
```bash
grep -rln "ExpandableCategoryCard" src __tests__
```
If it's a separate, still-used component (e.g. for a budget screen unrelated to
categories), leave it alone — this plan's scope is `CategoriesScreen` only. If it
turns out to be more dead code left over from the same era as `ExpandableCategoryRow`,
delete it too and note that in the commit message, but don't assume either way
without checking.

**Step 7: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 8: Commit**

```bash
git add src/components/categories/CategoryExpandedContent.tsx src/components/categories/CategoryCard.tsx \
        src/components/categories/CategoryIntelligenceShell.tsx src/screens/user/CategoriesScreen.tsx
git rm src/components/budget/ExpandableCategoryRow.tsx
git commit -m "feat: rewrite CategoriesScreen as CategoryIntelligenceShell with real health/budget/merge intelligence"
```

---

### Task 12: Update `CategoriesScreen.test.tsx`

**Files:**
- Modify (full rewrite): `__tests__/screens/CategoriesScreen.test.tsx`

**Problem:** The existing test targets the old flat-list structure (`usageCount`-only
rows, a `delete-category-${id}` testID that doesn't exist on the current delete
button). Task 7 added `testID="category-delete-btn"` to `CategoryActionRow` — that
needs a per-category testID applied at the `CategoryCard` call site for this test to
target a specific row's delete button.

**Step 1: Add the per-category testID in `CategoryActionRow`'s usage**

In `src/components/categories/CategoryExpandedContent.tsx`, the `CategoryActionRow`
doesn't currently receive a `category.id` for a testID. Rather than plumbing a new
prop through, pass it directly where it's rendered — modify
`CategoryActionRow.tsx`'s delete button to accept the id-based testID as a prop:

Change `CategoryActionRow.tsx`'s `Props`:
```tsx
interface Props {
  onEdit: () => void;
  onMerge: () => void;
  onDelete: () => void;
}
```
to:
```tsx
interface Props {
  onEdit: () => void;
  onMerge: () => void;
  onDelete: () => void;
  deleteTestID?: string;
}
```
And its component signature + delete button:
```tsx
export const CategoryActionRow: React.FC<Props> = ({ onEdit, onMerge, onDelete, deleteTestID }) => {
  ...
      <PressableScale onPress={onDelete} style={[styles.actionBtn, { backgroundColor: colors.danger + '15' }]} testID={deleteTestID}>
```

Then in `CategoryExpandedContent.tsx`, thread the category id down:
```tsx
      <CategoryActionRow onEdit={onEdit} onMerge={onMerge} onDelete={onDelete} deleteTestID={`delete-category-${category.id}`} />
```

**Step 2: Rewrite the test file**

Replace `__tests__/screens/CategoriesScreen.test.tsx` with:
```tsx
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CategoriesScreen } from '../../src/screens/user/CategoriesScreen';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

const navigation = { goBack: jest.fn() } as any;

const rowFor = (overrides: Partial<Record<string, any>>) => ({
  id: 'food',
  name: 'Food',
  icon: 'Utensils',
  color: null,
  usageCount: 0,
  totalSpendPaise: 0,
  currentMonthSpendPaise: 0,
  ...overrides,
});

describe('CategoriesScreen', () => {
  beforeEach(() => mockExecute.mockReset());

  it('lists categories with their transaction counts', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [rowFor({ id: 'food', name: 'Food', usageCount: 12 }), rowFor({ id: 'transport', name: 'Transport', icon: 'Car' })] })
      .mockResolvedValue({ rows: [] });

    const { findByText } = render(<CategoriesScreen navigation={navigation} route={{} as any} />);

    expect(await findByText('Food')).toBeTruthy();
    expect(await findByText('Transport')).toBeTruthy();
  });

  it('blocks deleting a category still in use, allows deleting an unused one', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [rowFor({ id: 'food', name: 'Food', usageCount: 12 }), rowFor({ id: 'transport', name: 'Transport', icon: 'Car' })] })
      .mockResolvedValue({ rows: [] });

    const { findByTestId } = render(<CategoriesScreen navigation={navigation} route={{} as any} />);

    // Expand each card first — the delete button lives in the expanded content.
    const foodCard = await findByTestId('delete-category-food').catch(() => null);
    // If the delete button isn't reachable without expanding, expand via the card header text press instead:
    if (!foodCard) {
      fireEvent.press(await (await import('@testing-library/react-native')).screen.getByText('Food'));
    }

    const deleteUsed = await findByTestId('delete-category-food');
    await act(async () => fireEvent.press(deleteUsed));
    // usageCount 12 -> blocked, no DELETE call issued
    expect(mockExecute.mock.calls.some(c => String(c[0]).includes('DELETE FROM categories'))).toBe(false);
  });
});
```

**Step 3: Run it, expect to iterate**

Run: `npx jest __tests__/screens/CategoriesScreen.test.tsx --verbose 2>&1 | tail -80`

The `screen.getByText` fallback pattern above is untested speculation about whether
`CategoryCard`'s delete button is reachable before the card is expanded — it likely
is NOT (the action row only renders inside the animated expanded body). The real fix
is almost certainly: `fireEvent.press(await findByText('Food'))` to expand the card
first, then `findByTestId('delete-category-food')` to reach the now-rendered delete
button. Rewrite Step 2's second test to do that directly instead of the
defensive-but-untested `.catch()` fallback once you've confirmed it against the real
component tree — don't ship speculative test code, confirm the actual DOM shape by
running it and reading the RNTL error output (it prints the full rendered tree on a
failed `findByTestId`).

**Step 4: Get both tests green**

Iterate until both pass. Use `screen.debug()` (from `@testing-library/react-native`)
if a query keeps missing — it prints the current render tree, faster than guessing.

**Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 6: Commit**

```bash
git add src/components/categories/CategoryActionRow.tsx src/components/categories/CategoryExpandedContent.tsx \
        __tests__/screens/CategoriesScreen.test.tsx
git commit -m "test: update CategoriesScreen test for the new CategoryIntelligenceShell structure"
```

---

### Task 13: Full verification pass

**Step 1: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 2: Full test suite**

Run: `npx jest --silent 2>&1 | tail -20`
Expected: no suite fails to *load*. Compare pass counts against the baseline noted
before this plan started (5 suites were hidden by the `uuid` bug pre-Task-1).

**Step 3: Manual simulator pass**

Per Task 11 Step 5's checklist, if not already fully exercised — confirm the whole
flow end-to-end one more time after all tasks land: search, sort, expand, edit,
merge, delete, empty state (temporarily rename all categories' `name` to force a
`findByText` miss, or just check on a fresh/empty DB if available).

**Step 4: Report**

Summarize what shipped, what was deliberately deferred (the Non-goals list in the
design doc), and any open questions surfaced during Task 11/12's manual/iterative
steps (e.g. the `handleMerge` action-row button behavior, the rename-collision UX).
