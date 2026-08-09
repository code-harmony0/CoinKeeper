# Transactions Pipeline Repair and Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop every expense landing in a fabricated "unknown" category, then rebuild the Transactions list and entry sheets on top of correct data.

**Architecture:** Part 1 repairs the data pipeline — three SQL queries referencing columns migration 002 deleted, a missing error guard, a self-reinforcing learning loop, and the absence of any first-run categorization. Part 2 redesigns the surfaces. Categorization becomes a pure, unit-tested resolution ladder mirroring `budgetPacing.ts`.

**Tech Stack:** React Native 0.80.2, TypeScript, op-sqlite, Zustand, Jest.

**Design doc:** `docs/plans/2026-08-09-transactions-pipeline-and-redesign-design.md`

---

## Background you must read first

**The bug chain, verified end to end:**

1. `TransactionPredictionService.predict()` runs `WHERE amount = ? … AND date >= ?`. Migration 002 renamed `transactions_v2 → transactions`; the live columns are `amount_paise`, `occurred_at`, `category_id`. The query throws `no such column: amount`.
2. `AddTransactionSheet`'s `runPredictions()` has **no try/catch**, so the rejection kills the whole prediction. `setPrediction()` never runs.
3. Save falls through to `prediction?.categoryId || draft.category_id || 'unknown'`.
4. `resolveCategoryId(db, 'unknown', …)` finds no category named "unknown" and **creates one** — this is why "unknown" appears in the Categories list beside the real `Food` category.
5. `MerchantLearningService` then learns `food → <unknown id>` and predicts it with growing confidence. The corruption trains itself.

**Exactly three queries use dead columns** (verified by repo-wide grep — everything else is correct):

- `src/services/TransactionPredictionService.ts:51` — `amount`, `date`
- `src/services/TransactionPredictionService.ts:112` — `amount`, `category`, `date`
- `src/components/modals/AddTransactionSheet.tsx:111` — `amount`, `date`

**Seeded category ids are the lowercase names** (`food`, `transport`, `shopping`, `entertainment`, `bills`, `health`, `education`, `others`) — so a plain name match fixes the screenshots on its own.

**Money is paise.** Always `Money.format(paise, { zeroDecimals: true })`. Never hand-divide by 100.

**Theme:** `useSpecTheme()`. Never `ui/Text`'s `color="secondary"` — it resolves to indigo `#5856D6` from the other theme system.

**SQL can't run in Jest** (op-sqlite is a mocked native module). `__tests__/db/` tests read source with `fs` + regex instead. Follow that pattern for the schema guard.

**Pre-existing failures:** `goalStore`, `insightsEngine`, `MoneyPlanShell` fail on `main`. Expect exactly 3 failing suites at every checkpoint. A fourth is yours.

---

# PART 1 — PIPELINE

## Task 1: Schema-drift regression guard

Lock the class of bug shut before fixing instances.

**Files:**
- Test: `__tests__/db/transactionColumnDrift.test.ts`

**Step 1: Write the failing test**

```ts
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');

/**
 * Migration 002 renamed transactions_v2 -> transactions. The live table has
 * amount_paise / occurred_at / category_id and NO amount, date, or category
 * column. Queries written against the pre-002 names throw "no such column"
 * at runtime, which is how every expense silently became "unknown".
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

// Migrations legitimately reference the old schema while migrating it.
const files = walk(SRC).filter(f => !f.includes(`${'/'}db${'/'}migrations${'/'}`));

const LEGACY = /\b(?:SELECT|WHERE|ORDER BY|SET|SUM\()[^;`]*?\b(amount|date|category)\b\s*(?:=|>=|<=|>|<|\)|,|\s+DESC|\s+ASC)/gi;

describe('transactions column drift', () => {
  it('no query outside migrations uses pre-002 transaction columns', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (!/\b(?:FROM|UPDATE|INTO)\s+transactions\b/i.test(src)) continue;

      for (const match of src.matchAll(LEGACY)) {
        const snippet = match[0];
        // amount_paise / occurred_at / category_id are the correct names.
        if (/amount_paise|occurred_at|category_id/.test(snippet)) continue;
        offenders.push(`${file.replace(ROOT + '/', '')}: ${snippet.trim()}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
```

**Step 2: Run it to confirm it catches the real bugs**

Run: `npx jest __tests__/db/transactionColumnDrift.test.ts`
Expected: FAIL, listing the 3 known offenders. If it reports zero, the regex is wrong — fix the test before continuing, do not proceed.

**Step 3: Commit the failing guard**

```bash
git add __tests__/db/transactionColumnDrift.test.ts
git commit -m "test: guard against pre-002 transaction column drift"
```

---

## Task 2: Fix the three dead-column queries

**Files:**
- Modify: `src/services/TransactionPredictionService.ts:49-54`, `:111-114`
- Modify: `src/components/modals/AddTransactionSheet.tsx:111`

**Step 1: Duplicate check — live schema**

`occurred_at` is INTEGER epoch-ms, so compare against a number, not an ISO string:

```ts
const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;

const dupCheck = await db.execute(
  `SELECT id FROM transactions
    WHERE amount_paise = ? AND LOWER(description) LIKE ? AND occurred_at >= ?
    LIMIT 1`,
  [draft.amount_paise, `%${draft.merchant_name.toLowerCase()}%`, fortyEightHoursAgo],
);
```

Note `amount_paise` compares to `draft.amount_paise` directly — the old code divided by 100 to match a rupee column that no longer exists.

**Step 2: Budget impact — live schema**

```ts
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

const spentRes = await db.execute(
  `SELECT COALESCE(SUM(amount_paise), 0) AS total FROM transactions
    WHERE category_id = ? AND occurred_at >= ? AND type = 'expense'`,
  [draft.category_id, startOfMonth],
);

const spentPaise = Number((spentRes?.rows?.[0] as any)?.total ?? 0);
```

Delete the `* 100` on the spend total — it is already paise. Keep `monthly_limit * 100` only if `budgets.monthly_limit` is stored in rupees; **verify that column's unit before trusting it** and state what you found in the commit message.

**Step 3: Recent-amount chips**

```ts
`SELECT DISTINCT amount_paise FROM transactions ORDER BY occurred_at DESC LIMIT 4`
```

Update the consuming code to read `amount_paise` and render through `Money.format`.

**Step 4: Run the guard**

Run: `npx jest __tests__/db/transactionColumnDrift.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add -A src/services/TransactionPredictionService.ts src/components/modals/AddTransactionSheet.tsx
git commit -m "fix: query transactions with post-002 column names"
```

---

## Task 3: Never let a prediction failure choose a category

A thrown prediction must degrade to "no suggestion", never to a silent category.

**Files:**
- Modify: `src/components/modals/AddTransactionSheet.tsx` (`runPredictions`, ~line 131)

**Step 1: Guard the effect**

```ts
if (numAmount > 0 || updatedDraft.merchant_name) {
  try {
    const pred = await TransactionPredictionService.predict(updatedDraft);
    setPrediction(pred);
    const budget = await TransactionPredictionService.evaluateBudgetImpact(updatedDraft);
    setBudgetImpact(budget);
  } catch (e) {
    // A failed prediction must never become a category. Surfacing "no
    // suggestion" is honest; falling through to 'unknown' is how every
    // expense in the app got mislabelled.
    console.error('[runPredictions]', e);
    setPrediction(null);
    setBudgetImpact(null);
  }
}
```

**Step 2: Typecheck and commit**

Run: `npx tsc --noEmit -p .`

```bash
git commit -am "fix: a failed prediction no longer silently picks a category"
```

---

## Task 4: The category resolution ladder

**Files:**
- Create: `src/services/categoryResolver.ts`
- Test: `__tests__/services/categoryResolver.test.ts`

**Step 1: Write the failing test**

```ts
import { resolveCategory, UNKNOWN } from '../../src/services/categoryResolver';

const CATEGORIES = [
  { id: 'food', name: 'Food' },
  { id: 'transport', name: 'Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'bills', name: 'Bills' },
];

describe('resolveCategory', () => {
  it('matches a merchant that is literally a category name', () => {
    // The exact case from the shipped screenshots: typing "food" while a
    // Food category exists produced "unknown".
    expect(resolveCategory('food', CATEGORIES)?.categoryId).toBe('food');
  });

  it('is case and whitespace insensitive', () => {
    expect(resolveCategory('  FOOD ', CATEGORIES)?.categoryId).toBe('food');
  });

  it('matches a known Indian merchant via the keyword seed', () => {
    expect(resolveCategory('Swiggy', CATEGORIES)?.categoryId).toBe('food');
    expect(resolveCategory('Ola cabs', CATEGORIES)?.categoryId).toBe('transport');
  });

  it('tolerates a typo within the fuzzy threshold', () => {
    expect(resolveCategory('shoping', CATEGORIES)?.categoryId).toBe('shopping');
  });

  it('returns null rather than guessing at an unrelated string', () => {
    expect(resolveCategory('qwertyuiop', CATEGORIES)).toBeNull();
  });

  it('never resolves to the unknown bucket', () => {
    const withUnknown = [...CATEGORIES, { id: 'u1', name: UNKNOWN }];
    expect(resolveCategory('unknown', withUnknown)).toBeNull();
  });

  it('reports which rung matched so the UI can explain itself', () => {
    expect(resolveCategory('food', CATEGORIES)?.reason).toBe('name');
    expect(resolveCategory('swiggy', CATEGORIES)?.reason).toBe('keyword');
    expect(resolveCategory('shoping', CATEGORIES)?.reason).toBe('fuzzy');
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx jest __tests__/services/categoryResolver.test.ts`
Expected: FAIL — module not found

**Step 3: Implement**

Write `src/services/categoryResolver.ts` exporting:

- `export const UNKNOWN = 'unknown';`
- `export type ResolveReason = 'name' | 'keyword' | 'fuzzy';`
- `export interface CategoryMatch { categoryId: string; reason: ResolveReason; }`
- `export const resolveCategory = (merchant: string, categories: {id: string; name: string}[]): CategoryMatch | null`

Rungs, in order, first hit wins:

1. **name** — normalized merchant equals a category name, or contains it as a whole word.
2. **keyword** — a bundled India-first dictionary mapping merchant tokens to category *names*: swiggy/zomato/blinkit/zepto/dominos → Food; uber/ola/rapido/irctc/indigo → Transport; amazon/flipkart/myntra/meesho → Shopping; jio/airtel/vi/bescom/electricity → Bills; apollo/pharmeasy/1mg → Health; netflix/spotify/hotstar → Entertainment. Resolve the name back to an id from the passed list; skip any keyword whose category is absent.
3. **fuzzy** — Levenshtein against category names and keyword keys. Accept only when `distance <= max(1, floor(len/4))` **and** the candidate is unambiguously closest. Otherwise null.

Any candidate whose name is `unknown` (case-insensitive) is excluded at every rung. Pure functions only — no DB access, no imports from `store/`.

**Step 4: Verify and commit**

Run: `npx jest __tests__/services/categoryResolver.test.ts` → PASS (7 tests)

```bash
git add src/services/categoryResolver.ts __tests__/services/categoryResolver.test.ts
git commit -m "feat: category resolution ladder with name, keyword, and fuzzy rungs"
```

---

## Task 5: Wire the ladder in and stop creating "unknown"

**Files:**
- Modify: `src/services/categorizationService.ts`
- Modify: `src/services/TransactionPredictionService.ts`
- Modify: `src/services/MerchantLearningService.ts`
- Modify: `src/components/modals/AddTransactionSheet.tsx` (~line 308)

**Step 1: Extend `suggestCategoryForMerchant`**

Keep the learned-mapping lookup as rung 0 (highest trust). On miss, load `SELECT id, name FROM categories` and fall through to `resolveCategory`.

**Step 2: `predict()` uses the ladder when learning has nothing**

After the `MerchantLearningService` branch, if `result.categoryId` is still null, call the ladder and set `predictionReason` from the matched rung ("Matches your Food category", "Swiggy is usually Food", "Looks like Shopping").

**Step 3: `unknown` is never learnable**

In `MerchantLearningService` (and `recordMerchantCategory`), refuse to persist a mapping whose target category is named `unknown`. This is what breaks the self-reinforcing loop.

**Step 4: Stop fabricating the category at save**

Replace `prediction?.categoryId || draft.category_id || 'unknown'` with a resolution that ends at the seeded **`others`** category — a real, intentional bucket — never a string that `resolveCategoryId` will turn into a new junk category row.

**Step 5: Verify**

Run: `npx tsc --noEmit -p . && npx jest`
Expected: 3 pre-existing failures only.

```bash
git commit -am "fix: real first-run categorization; unknown is no longer learnable"
```

---

## Task 6: Repair screen for already-mislabelled rows

Consent-based. Never rewrites records silently.

**Files:**
- Create: `src/screens/user/RecategorizeReviewScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (register `RecategorizeReview`)
- Modify: `src/screens/user/CategoriesScreen.tsx` (entry point)

**Step 1: Build the screen**

- Load transactions whose category is the unknown bucket.
- For each, run the ladder over `description`; keep only rows with a match.
- Render one row per proposal: merchant, amount, `Uncategorized → Food`, and the reason.
- Per-row accept, plus "Accept all".
- On accept: update `category_id`, then `financialEventBus.emit()` so Dashboard, Money Plan, Goals, Bills, and Reports all re-derive immediately (this is the PRODUCT RULE's ripple, already wired).
- Also delete poisoned `merchant → unknown` mappings.
- Empty state: "Nothing to fix — every transaction has a category."

**Step 2: Entry point**

On `CategoriesScreen`, when an unknown-bucket category exists with transactions, show a row: "N transactions need a category" → opens the review screen. Replace the existing "clean up your intelligence model" copy.

**Step 3: Verify and commit**

Run: `npx tsc --noEmit -p . && npx jest`

```bash
git add -A && git commit -m "feat: consent-based recategorization review for mislabelled rows"
```

---

# PART 2 — INTERFACE

## Task 7: Honest transaction rows

**Files:**
- Modify: `src/screens/user/TransactionsScreen.tsx` (`renderRow`)
- Modify: `src/components/transaction/PredictionBanner.tsx`

**Step 1: `PredictionBanner` shows a name, not an id**

It currently renders `{category}` — the raw category **id**. Accept a resolved display name (title-cased; `unknown` → "Uncategorized"), or render nothing when there is no confident match. Also drop the uppercase `AI ASSISTANT` eyebrow — DESIGN.md's craft floor bans eyebrows above headings.

**Step 2: Row anatomy**

Category icon in a tinted circle from the accent rotation (DESIGN.md §6 — never a bare `...` glyph), merchant title-cased as the title, amount right-aligned in income/expense colour, time as a quiet third line.

**Remove `Manual` and `bank_transfer` from the row entirely.** Payment method moves to `TransactionDetailSheet`, humanized (`bank_transfer` → "Bank transfer"). Add a shared `humanizePaymentMethod()` helper rather than scattering string maps.

**Step 3: Verify and commit**

Run: `npx tsc --noEmit -p . && npx jest`

```bash
git commit -am "feat: transaction rows show real categories, not database identifiers"
```

---

## Task 8: One filter control

**Files:**
- Modify: `src/screens/user/TransactionsScreen.tsx`

**Step 1: Collapse the chrome**

Period pills, type segments, and search+filter currently stack to roughly 340px above the rows. Keep **search inline**. Move type and the rest into the existing `TransactionFiltersSheet`, behind a single control that displays an active-filter **count badge** when any filter is set. Period becomes a header control.

**Step 2: Verify no filter capability is lost**

Every predicate reachable before must remain reachable. List them in the commit message.

**Step 3: Commit**

```bash
git commit -am "feat: collapse three filter mechanisms into one control"
```

---

## Task 9: Category screen honesty + entry sheets

**Files:**
- Modify: `src/screens/user/CategoriesScreen.tsx`
- Modify: `src/components/modals/IncomeTransactionFlow.tsx`
- Modify: `src/components/modals/AddTransactionSheet.tsx`

**Step 1: Categories screen**

- A category with no spend is **not** "needs attention". Only flag real problems (uncategorized rows, duplicates).
- Drop "intelligence model" jargon.
- Title-case category names; `unknown` → "Uncategorized".

**Step 2: Income sheet has a visible Save**

`IncomeTransactionFlow` currently has **no visible save control** and ~60% dead space. Add a docked footer action matching the expense sheet's, disabled until the amount is valid, labelled with the amount ("Save ₹15,000 income").

**Step 3: Remove uppercase eyebrows**

`ADD TRANSACTION`, `ADD EXPENSE • SUN 1:35 AM`, and uppercase type chips (`SALARY`, `FREELANCE`) become sentence case or are deleted where the heading already carries the meaning.

**Step 4: Verify and commit**

Run: `npx tsc --noEmit -p . && npx jest`

```bash
git commit -am "feat: honest category health, visible income save, no uppercase eyebrows"
```

---

## Task 10: Verify and document

**Step 1: Full check**

```bash
npx tsc --noEmit -p .
npx jest
npm run verify:split
```

Expected: no tsc output; exactly 3 pre-existing failures; split passes.

**Step 2: Screenshot pass — REQUIRED**

Ask the user for: Transactions list (populated + empty), Add expense typing a known merchant, Add income, Categories, and the recategorize review screen. Confirm no raw identifier (`bank_transfer`, `Manual`, `unknown`) appears anywhere.

**Step 3: DESIGN.md**

Record the transaction row anatomy, the single-filter rule, and the standing rule: **never render a database identifier to a user**.

```bash
git commit -am "docs: record transaction row anatomy and the no-identifiers rule"
```

---

## Definition of done

- [ ] Typing "food" categorizes as Food, not unknown
- [ ] "shoping" resolves to Shopping; "qwertyuiop" resolves to nothing at all
- [ ] No `bank_transfer`, `Manual`, or `unknown` visible anywhere in the UI
- [ ] A failed prediction shows no suggestion and never picks a category
- [ ] `unknown` can never be learned or created as a category
- [ ] Existing bad rows fixable via consent-based review; accepting ripples through the event bus
- [ ] Column-drift guard passes
- [ ] Income sheet has a visible Save
- [ ] `tsc` clean; exactly 3 pre-existing test failures
