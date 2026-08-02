# Category Intelligence Screen — Design

**Goal:** Turn `CategoriesScreen` from a flat CRUD list into a "Category Intelligence"
dashboard: health classification, real (derived) budget context, duplicate-merge
suggestions, and unused-category cleanup — all computed from existing transaction
history, no new user-facing budget-setting flow, no persistent gamification state.

**Grounding:** No `PRODUCT.md`/`DESIGN.md`/etc. exist in this repo. Design principles
are grounded in `CLAUDE.md`'s existing rules, `specTheme` design tokens, and the
`ui-lessons` memory from prior sessions — not a separate governance doc set.

---

## Current State (confirmed by reading source, not assumed)

- `CategoriesScreen.tsx` already has search, a sort toggle (name/spend/usage), and an
  "N unused categories" banner — the scaffolding is more complete than a bare list.
- `ExpandableCategoryRow.tsx` has an expand/collapse animation (damping-15 spring,
  height/opacity interpolation) that's already correct and reusable.
- **Fake budget data**: `ExpandableCategoryRow.tsx` computes
  `budget = monthlySpend > 0 ? monthlySpend * 1.2 : 10000` — literally commented
  `// Fake budget data for demo`. There is no real per-category budget anywhere.
- **Unwired actions**: `CategoriesScreen.handleEdit`/`handleMerge` are
  `Alert.alert('...', '... would open here.')` stubs — no real implementation.
- **`categories` table has no `color` column** (`id, name UNIQUE, icon` only), but
  `AddCategorySheet.tsx` already builds a full color picker and silently drops the
  value on insert (comment: "Skipping color insert to avoid schema error").
- **`budget_history` table exists** (`category_id`, `spent_amount_paise`,
  `budget_limit_paise`, per month) but nothing in the app reads or writes it — a
  fully dead table today.
- Four tables carry `category_id` for merchant-learning purposes:
  `merchant_learning`, `favorite_merchants`, `recent_merchants`,
  `merchant_category_map`. Any category merge must reassign all four or it silently
  orphans learned merchant→category associations.

## Decisions (from brainstorming)

1. **Full rewrite** into the new component set below (not incremental patching of
   `ExpandableCategoryRow`).
2. **Budget is derived, not user-set**: trailing-3-month average spend per category is
   the implicit baseline. No new budget-setting UI, no write path into
   `budget_history` (it stays unused — out of scope to wire it up here).
3. **Merge suggestions use name-similarity only** (normalized Levenshtein ratio,
   threshold 0.6) — no merchant-overlap heuristic in v1.
4. **"Small winnable challenges" are computed fresh, not persisted.** No dismiss
   state, no new table. The banner reflects live category state every load.

## Data & Intelligence Layer

New `src/hooks/useCategoryIntelligence.ts` replaces the inline query logic in
`CategoriesScreen.tsx`. Per category, computes:

- **Usage & spend** — existing query (count + total from `transactions`), unchanged.
- **Top merchants** — existing query, unchanged.
- **6-month trend** — new query, grouped by month, feeds `CategorySparkline`.
- **Health classification**:
  - `unused` — zero transactions ever.
  - `over_budget` — current month spend > 1.3× trailing-3-month average (threshold
    chosen to avoid flagging ordinary month-to-month noise).
  - `attention` — very low transaction count (1–2) or default-fallback categories
    (`Unknown`/`Others`) — "may need cleanup" per the brief's own example.
  - `healthy` — everything else.
- **Merge candidates** — pairwise name-similarity across all category names,
  computed once per load (not per-card), threshold 0.6.

**Migration 009** adds `categories.color TEXT` — the one schema change in this plan,
closing the pre-existing silent-drop bug in `AddCategorySheet`.

## Components (`src/components/categories/`)

- **`CategoryIntelligenceShell.tsx`** — screen-level layout (header, search/sort,
  scroll body, floating add action). `CategoriesScreen.tsx` becomes a thin route
  wrapper instantiating `useCategoryIntelligence` and rendering this shell.
- **`CategoryHealthSummary.tsx`** — total / healthy / needs-attention counts, calm
  status-line styling, not alarming.
- **`CategoryAttentionBanner.tsx`** — one computed challenge at a time, priority
  merge > unused > over-budget (e.g. "2 categories look similar — review merge?").
  Session-dismissible only, no persistence.
- **`CategoryCard.tsx`** — collapsed row: icon, name, count+spend, health-colored
  accent, sparkline preview, tap to expand. Replaces `ExpandableCategoryRow`'s header.
- **`CategorySparkline.tsx`** — 6-month trend, no axes/labels, `react-native-svg`.
- **`CategoryTopMerchants.tsx`** — merchant chip row, extracted from
  `ExpandableCategoryRow` as-is.
- **`CategoryMergeSuggestion.tsx`** — shown in expanded view only when a
  name-similarity match exists; one-tap confirm executes the merge below.
- **`CategoryCleanupCTA.tsx`** — shown for `unused` categories in expanded view.
- **`CategoryActionRow.tsx`** — Edit/Merge/Delete buttons, extracted as-is, but Edit
  now opens `AddCategorySheet` in edit mode instead of an `Alert` stub.
- **`CategoryExpandedContent.tsx`** — composes sparkline + top merchants + budget bar
  + merge suggestion (if any) + cleanup CTA (if unused) + action row, inside the
  existing expand/collapse animation (reused, not rebuilt).

**Reused, not rebuilt:** `AddCategorySheet` gains an optional `editing?: CategoryData`
prop — pre-fills name/icon/color, switches `INSERT`→`UPDATE`, header text changes to
"Edit Category." No new sheet component.

## Interactions

**Merge** (one-tap confirm from `CategoryMergeSuggestion`), inside a single
`db.transaction(...)`:
1. `UPDATE transactions SET category_id = :targetId WHERE category_id = :sourceId`
2. `UPDATE merchant_learning / favorite_merchants / recent_merchants /
   merchant_category_map SET category_id = :targetId WHERE category_id = :sourceId`
   — the actual "feeds MerchantLearningService" requirement; skipping this orphans
   every learned merchant association pointing at the deleted category.
3. `DELETE FROM categories WHERE id = :sourceId`
4. Reload — no explicit "notify InsightEngine" call needed; insight/budget-baseline
   computations read live transaction data on their own next pass.

**Edit**: `UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?`. Since
`name` is `UNIQUE`, a rename colliding with an existing category surfaces as a normal
save error — no automated "did you mean merge?" redirect in v1 (fast-follow, not
blocking).

**Cleanup**: plain `DELETE FROM categories WHERE id = ?` (zero transactions reference
an unused category by definition, nothing to reassign).

## Error Handling & States

- **Zero categories**: empty-state illustration + "Add your first category" CTA,
  matching `TransactionsScreen`'s existing empty-state pattern.
- **DB failures** (merge/edit/delete): try/catch → `Alert.alert`, same pattern as the
  rest of this screen today. Merge specifically runs as one DB transaction so a
  mid-merge failure rolls back instead of leaving transactions half-reassigned.
- **Loading**: skeleton `CategoryHealthSummary` + 3–4 placeholder cards (pulse
  opacity, matching `TransactionsContext.tsx`'s `DbLoadingScreen` pattern) instead of
  a blocking spinner.
- **Search, no results**: plain "No categories match" text.

## Testing

- `useCategoryIntelligence.test.ts` — unit tests for health classification and
  merge-candidate detection against fixed fixture rows, mocking `getDb()` the same
  way `transactionStore.test.ts` does.
- `CategoriesScreen.test.tsx` — update to match the new shell structure (it currently
  tests the old flat-list screen).
- Merge/edit/delete — integration-style tests against a mocked `db.execute`,
  asserting the right SQL sequence runs, mirroring `transactionStore.test.ts`'s
  "propagates a DB failure instead of swallowing it" pattern.

## Non-goals (explicit, deferred)

- Per-category user-set budgets (derived baseline only).
- Persistent challenge/dismiss tracking.
- Rename-collision → merge redirect.
- Multi-category merge (pairwise only, one suggestion at a time).
- Wiring up the dead `budget_history` table.
