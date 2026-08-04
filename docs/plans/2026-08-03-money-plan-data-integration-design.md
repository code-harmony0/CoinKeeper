# Money Plan Data Integration — Design

**Date:** 2026-08-03
**Status:** Approved

## Problem

The Money Plan screen shows "No income set" and ₹0 across every card even when the
user has logged income. Investigation found four disconnects between the end-user
screens (Budget, Bills, Goals) and the data they are supposed to reflect.

### 1. Income is read from the wrong month

`src/hooks/useMoneyPlanIntelligence.ts` queries income and expenses over different
windows:

```sql
-- income  → [lastMonthStart, monthStart)   ← LAST month
WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?

-- expense → occurred_at >= monthStart      ← THIS month
```

Income logged today is therefore invisible to the plan. This is the root cause of
the ₹0 screen.

### 2. No recurring-income concept

Salary must be re-entered every month. Nothing carries income forward.

### 3. Bills never count as spending

`billStore.markPaid(id, timestamp)` only stamps `lastPaidAt` on the bill row. It
writes no transaction, so paid bills never reach the Needs bucket, the spending
totals, or the Money Plan.

### 4. Goals link is fragile

`useMoneyPlanIntelligence` joins the emergency fund by hardcoded, case-sensitive
name: `WHERE name = 'Emergency Fund'`. A goal named "Emergency fund" silently
returns nothing. Separately, `goals` stores amounts as REAL rupees while
`transactions` uses INTEGER paise.

## What already works

Worth stating, because it constrains the design:

- Settings → `Budget` / `Bills` / `Goals` navigation is correct; all three are
  registered in `RootNavigator`.
- There is exactly one transactions table (`transactions_v2` renamed in migration
  002). `transactionStore.addTransaction` writes `amount_paise`, `type`,
  `category_id`, `occurred_at`.
- `resolveCategoryId` guarantees every transaction lands on a category carrying a
  `budget_bucket` (via `classifyBudgetBucket`, applied in migration 009 and on new
  category creation). Expense → bucket attribution is sound.

## Decision: materialize into `transactions`

Every downstream consumer — Money Plan, dashboard, reports, transaction list —
already reads `transactions`. So the design question is how recurring income and
bill payments *enter* the system.

**Chosen: Approach A — materialize.** Recurring income and paid bills become real
rows in `transactions`.

- A recurring template generates one income row per month with a deterministic id
  (`rec_<templateId>_<YYYY-MM>`) plus `INSERT OR IGNORE`, making generation
  idempotent and safe to run on every app open.
- `markPaid` inserts a linked expense row; un-paying deletes it.

Rationale: single source of truth. Every existing consumer works with zero
changes, and salary/bills correctly appear in the transaction list and reports.
It matches the architecture already in place.

Trade-off accepted: generated rows are real history, so editing salary does not
rewrite past months. This is desirable — it records what actually happened.

### Alternatives rejected

- **B — compute at read time.** Keep recurring income and bills in their own
  tables and have every consumer sum `transactions + recurring + bills`. Rejected:
  requires touching every consumer, recurring income would never appear in the
  transaction list, and two screens can easily disagree.
- **C — hybrid** (materialize bills, compute income). Rejected: inconsistent
  mental model with no compensating benefit.

## Phases

Each phase is independently shippable.

### Phase 1 — Fix the income window

Query-only, no migration. Income becomes `[monthStart, nextMonthStart)`, matching
expenses. Bound the expense query on the upper end too, so future-dated rows do
not leak in. **This alone fixes the ₹0 screen.**

### Phase 2 — Recurring income

New table:

```sql
CREATE TABLE recurring_income (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  day_of_month INTEGER NOT NULL,
  start_month TEXT NOT NULL,   -- 'YYYY-MM'
  end_month TEXT,              -- nullable = open-ended
  active INTEGER NOT NULL DEFAULT 1
);
```

`syncRecurringIncome()` runs on app open and generates any missing months up to
today. Income for a month = generated rows + one-off income, both already in
`transactions`. UI: a "recurring / salary" toggle in the income entry flow.

Edge cases: `day_of_month` > days in month clamps to the last day; generation must
never run ahead of the current month.

### Phase 3 — Bills → spending

`markPaid` inserts an expense transaction using the bill's category, with
`occurred_at` = paid date and a `bill_id` foreign key for dedupe and un-pay.
Un-paying deletes that row. Bills then flow into the Needs bucket automatically
through the existing `budget_bucket` join.

### Phase 4 — Goals → Money Plan

Add an `is_emergency_fund` flag and drop the string match. Convert goal amounts to
paise for consistency with the rest of the schema (migration must convert existing
rows, not just the column).

## Testing

- Phase 1: unit-test the month window at boundaries — first and last day of month,
  and a future-dated transaction.
- Phase 2: `syncRecurringIncome()` is idempotent (running twice produces one row
  per month); clamping for short months; no generation beyond the current month.
- Phase 3: mark-paid then un-pay leaves no orphan transaction; a paid bill appears
  in the Needs bucket.
- Phase 4: migration converts existing rupee amounts to paise exactly once.
