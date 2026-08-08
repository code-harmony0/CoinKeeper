# Transactions — Pipeline Repair and Redesign (Design)

**Date:** 2026-08-09
**Surfaces:** `TransactionsScreen`, `AddTransactionSheet`, `CategoriesScreen` ("Intelligence"), `PredictionBanner`, categorization services
**Status:** Approved, pending implementation plan

---

## The product rule this serves

> Transactions are the source of truth for Dashboard, Money Plan, Goals, Bills, Reports, AI Coach, and Category Intelligence. Every change must ripple immediately.

**The ripple already works.** `financialEventBus.emit()` fires from `transactionStore` and `FinancialLedgerService`; it is consumed by `UserDashboardScreen`, `useMoneyPlanIntelligence`, `useCategoryIntelligence`, `useGoalIntelligence`, `intelligenceStore`, `billStore`, and `goalStore`. The architecture is sound.

What ripples is wrong. That is the problem this document fixes first.

---

## Part 1 — The data pipeline (must land first)

### 1.1 The categorization crash

`src/services/TransactionPredictionService.ts` queries columns that migration 002 removed:

```sql
-- duplicate check, line ~51
WHERE amount = ? AND LOWER(description) LIKE ? AND date >= ?
-- budget impact, line ~112
WHERE category = (SELECT name FROM categories WHERE id = ?) AND date >= ?
```

Migration 002 renamed `transactions_v2 → transactions`. The live schema is
`amount_paise INTEGER`, `occurred_at INTEGER`, `category_id TEXT`. There is no
`amount`, `date`, or `category` column, so both queries throw
`no such column`.

`AddTransactionSheet`'s `runPredictions()` has **no try/catch**, so the whole
prediction rejects, `setPrediction()` never runs, and the save path falls
through to `|| 'unknown'`.

**Fix:** correct both queries to the live schema, and wrap `runPredictions` in a
try/catch that degrades to "no suggestion" rather than swallowing the transaction
into `unknown`. A prediction failure must never silently choose a category.

### 1.2 The self-reinforcing mislabel

`MerchantLearningService` records whatever was saved. Having saved `food` as
`unknown`, it now predicts `unknown` for `food` with rising confidence. The
corruption trains itself.

**Fix:** `unknown` is never a learnable outcome. `recordMerchantCategory` and the
learning writes must refuse to persist a mapping whose target is the
unknown/uncategorized bucket.

### 1.3 No first-run categorization

`suggestCategoryForMerchant` only does an exact lookup in `merchant_category_map`
— learned history. A new user typing `food` gets nothing, **even though a `Food`
category exists**. Categorization is impossible before history exists.

**Fix:** a resolution ladder, cheapest and most certain first:

1. **Learned mapping** — exact merchant match in `merchant_category_map` (current behaviour, highest trust)
2. **Category name match** — merchant text equals or contains an existing category name (`food` → Food). This alone fixes the screenshots.
3. **Keyword seed** — a small, local, India-first dictionary (swiggy/zomato/blinkit → Food; uber/ola/irctc → Transport; jio/airtel → Bills). Bundled data, no network, no API key.
4. **Fuzzy match** — bounded edit distance against category names and keywords so `shoping` → Shopping. Guarded by a distance threshold; below it, no guess.

If nothing clears the threshold the app says it does not know and asks — it must
not invent a category. Honest uncertainty over a confident wrong answer is the
"trust without custody" position applied to data.

### 1.4 Repairing what is already wrong

A **review screen**, never a silent rewrite. Re-run the corrected ladder over
existing `unknown` rows, present each proposed change with its reason, and let
the user accept individually or in bulk. Also purge poisoned
`merchant → unknown` mappings so the model stops reproducing them.

Rewriting someone's financial records without asking is exactly what a
"track and confirm, never act on your behalf" product must not do.

---

## Part 2 — The interface

### 2.1 Stop shipping database identifiers

Currently on screen: `bank_transfer`, `Manual`, `unknown`, and lowercase
unnormalized `food` / `company` / `shoping`.

> "Cut everything which is not known by the user or is not the user's task to
> know. The client has nothing to do with what identifiers the bank's database
> uses internally." — *Transaction list view UX case study, Design Bootcamp*

- `PredictionBanner` renders `{category}` — the raw **ID**. It must resolve to a display name.
- Payment method and source (`Manual`, `bank_transfer`) leave the row entirely; they belong in the detail sheet, humanized ("Bank transfer").
- Merchant and category names are title-cased for display; `unknown` displays as "Uncategorized".

### 2.2 The list

Three stacked filter mechanisms (period pills, type segments, search + filter
icon) consume roughly 340px above two transactions.

**Replacement:** search stays inline. Type, amount, and other predicates collapse
into the existing `TransactionFiltersSheet` behind **one control that shows an
active-filter count**. Period becomes a header control. This returns ~200px to
actual content.

**Row anatomy:** category icon in a tinted circle (the accent rotation, per
DESIGN.md §6 — never a bare `...`), merchant title-cased as the title, amount
right-aligned in income/expense colour, time as a quiet third line. Nothing else.

Rows stay grouped by day ("Today"), which is already correct and worth keeping.

### 2.3 The Categories screen

"Intelligence" currently reports **"0 Healthy / 10 Needs attention"** — a summary
whose only message is that everything is broken, mostly *because* of 1.1. Most of
this resolves once categorization works.

Beyond that: drop the "intelligence model" jargon, and stop counting a category
with no spend as unhealthy — an unused category is not a problem, it is an unused
category.

### 2.4 The Add sheets

- The income sheet (`IncomeTransactionFlow`) has **no visible Save control** and ~60% dead space. It needs a persistent action, matching the expense sheet's docked footer.
- `ADD TRANSACTION` / `ADD EXPENSE • SUN 1:35 AM` are uppercase eyebrows above a heading; DESIGN.md's craft floor bans them. The sheet's heading carries itself.
- Type chips (`SALARY`, `FREELANCE`) are uppercase where the rest of the app is sentence case.

---

## What is explicitly not in scope

No new features. No new AI. No new data sources. Money Plan, Goals, Bills, and
Reports are untouched — they inherit correctness through the existing event bus
rather than being modified.

---

## Docs referenced

`PRODUCT.md` and `DESIGN.md` exist and are followed. `VISUAL_LANGUAGE.md`,
`COMPONENT_GUIDELINES.md`, `ACCESSIBILITY.md`, and `ANIMATION.md` **do not exist
in this repo**; DESIGN.md §3 (type), §5 (radius/shadow), §6 (icons), §7
(components), and §8 (motion) cover that ground and are treated as authoritative.

---

## Risks

| Risk | Mitigation |
|---|---|
| Fixing the dead-column queries may surface further schema drift elsewhere | Grep the whole `src/services` tree for `FROM transactions` with legacy column names as a dedicated task |
| Fuzzy matching produces confident nonsense | Bounded distance threshold; below it, no suggestion at all |
| The repair screen rewrites records the user wanted | Per-row consent, reason shown, nothing applied without a tap |
| Categorization ladder is untestable through the UI | Ladder is a pure module with unit tests, mirroring `budgetPacing` |
