# Transaction Screens Bugfixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix five concrete issues found while reviewing the transaction intake area
(`AddTransactionSheet`, `AddScreen`, `TransactionsScreen`, `SmsReviewScreen`) after the
2026-08-02 Add Transaction Intake redesign: a Jest config bug that hides 5 test suites,
dead code left over from a superseded categorization approach, a stale component test,
an index-based state bug in bulk SMS approval, and silently-discarded receipt images.

**Architecture:** No new architecture — this is a bugfix/cleanup pass over existing
files. One schema migration (008) adds a column; everything else is code-only.

**Tech Stack:** React Native, TypeScript, Jest + `@testing-library/react-native`,
`@op-engineering/op-sqlite`.

**Non-goal (explicitly out of scope):** `SmsReviewScreen` and `AddTransactionSheet`'s
SMS tab remain two separate flows. `SmsReviewScreen` is a bulk "catch up on up to 100
messages" surface reachable from `TransactionsScreen`'s inbox icon; the SMS tab is a
lightweight single-add flow capped at 5 messages with prediction/budget review before
save. Merging them into one flow is a product decision (whether bulk-approve should
skip budget review) that this plan does not make — only the confirmed *bug* in
`SmsReviewScreen`'s bulk-approve (Task 4) is fixed here.

---

### Task 1: Fix Jest `transformIgnorePatterns` to allow `uuid`'s ESM build

**Files:**
- Modify: `jest.config.js`

**Problem:** `uuid`'s package ships an ESM-only `dist/esm-browser/index.js` that Jest
never transpiles because `uuid` isn't in the `transformIgnorePatterns` allow-list. Any
test that transitively imports `MerchantLearningService.ts` or `TransactionDraftService.ts`
(both `import { v4 as uuidv4 } from 'uuid'`) fails at module load with
`SyntaxError: Unexpected token 'export'` — not a real test failure, a config bug. This
currently hides 5 suites: `MerchantLearningService.test.ts`,
`__tests__/components/AddTransactionSheet.test.tsx`, `TransactionsScreen.test.tsx`,
`App.test.tsx`, and (transitively) any future test reaching those services.

**Step 1: Add `uuid` to the allow-list**

In `jest.config.js`, change:
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

**Step 2: Run the previously-broken suites**

Run: `npx jest MerchantLearningService.test.ts 2>&1 | tail -40`

Expected: the suite now loads and runs (it may still have real failures — that's fine,
this task only fixes the *load* error; note any real failures for later, don't fix
them here unless trivial).

**Step 3: Run the full suite to get a fresh baseline count**

Run: `npx jest --silent 2>&1 | tail -10`

Expected: fewer than 5 suites failing at "Test suite failed to run" — record the new
pass/fail counts, they're the baseline for the rest of this plan.

**Step 4: Commit**

```bash
git add jest.config.js
git commit -m "fix: allow uuid's ESM build through Jest transform, unmasking 5 hidden test suites"
```

---

### Task 2: Remove dead `categorizationService` and its stale tests

**Files:**
- Delete: `src/services/categorizationService.ts`
- Delete: `__tests__/services/categorizationService.test.ts`

**Problem:** `categorizationService.ts` (`suggestCategoryForMerchant`,
`recordMerchantCategory`) is orphaned — nothing under `src/` imports it. It was
superseded by `MerchantLearningService` + `TransactionPredictionService` in the
2026-08-02 redesign. Its only consumers are its own test and the stale
`AddTransactionSheet.test.tsx` (rewritten in Task 3).

**Step 1: Confirm it's actually dead**

Run:
```bash
grep -rln "categorizationService" src __tests__
```
Expected: only `__tests__/services/categorizationService.test.ts` and
`__tests__/components/AddTransactionSheet.test.tsx` — no file under `src/` other than
`categorizationService.ts` itself. (Task 3 removes the `AddTransactionSheet.test.tsx`
reference, so do this task and Task 3 together before considering either done.)

**Step 2: Delete both files**

```bash
git rm src/services/categorizationService.ts __tests__/services/categorizationService.test.ts
```

**Step 3: Commit** (combine with Task 3's commit if doing them back-to-back — see
Task 3 Step 5)

```bash
git commit -m "chore: remove dead categorizationService, superseded by MerchantLearningService/TransactionPredictionService"
```

---

### Task 3: Rewrite `AddTransactionSheet.test.tsx` for the current component

**Files:**
- Modify (full rewrite): `__tests__/components/AddTransactionSheet.test.tsx`

**Problem:** The existing test renders category chips ("Food"), a date picker
(`testID="date-picker"`), an "Add a note..." placeholder, and asserts
`onSubmit` receives `{ amount, category }` — none of which exist in the current
`AddTransactionSheet` (it uses a hero amount input, a merchant text field, no date
picker, and submits `{ amount_paise, category_id }`). It predates the whole
`TransactionDraftService`/prediction-banner architecture and must be rewritten from
scratch against current behavior, not patched.

**Step 1: Write the new test file**

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddTransactionSheet } from '../../src/components/modals/AddTransactionSheet';

jest.mock('@react-native-community/blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('../../src/services/TransactionPredictionService', () => ({
  TransactionPredictionService: {
    predict: jest.fn(async () => ({
      categoryId: 'food',
      accountId: null,
      isRecurring: false,
      isDuplicate: false,
      predictionReason: 'merchant match',
      confidence: 92,
    })),
    evaluateBudgetImpact: jest.fn(async () => ({
      exceedsBudget: false,
      remainingAfter: 5000,
      budgetTotal: 10000,
    })),
  },
}));

jest.mock('../../src/services/smsParserService', () => ({
  fetchRecentSms: jest.fn(async () => []),
  parseSmsToDraft: jest.fn(async () => null),
}));

jest.mock('../../src/services/EcosystemIntegrationService', () => ({
  EcosystemIntegrationService: {
    notifyDraftSaved: jest.fn(async () => undefined),
  },
}));

describe('AddTransactionSheet', () => {
  it('shows only Type/SMS/Scan tabs (no dead Recent tab)', () => {
    const { getByText, queryByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={jest.fn()} />,
    );

    expect(getByText('Type')).toBeTruthy();
    expect(getByText('SMS')).toBeTruthy();
    expect(getByText('Scan')).toBeTruthy();
    expect(queryByText('Recent')).toBeNull();
  });

  it('manual mode: typing an amount and merchant reveals the prediction banner and enables save', async () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText, findByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByPlaceholderText('0'), '250');
    fireEvent.changeText(getByPlaceholderText('Where did you spend?'), 'Uber');

    expect(await findByText(/Looks like/)).toBeTruthy();

    fireEvent.press(getByText('Save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount_paise: 25000, category_id: 'food' }),
      ),
    );
  });

  it('SMS mode: shows the empty state when no transaction-like messages are found', async () => {
    const { getByText, findByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={jest.fn()} />,
    );

    fireEvent.press(getByText('SMS'));

    expect(
      await findByText('No transaction-like messages found. You can still add this manually.'),
    ).toBeTruthy();
  });
});
```

**Step 2: Run it**

Run: `npx jest __tests__/components/AddTransactionSheet.test.tsx -v 2>&1 | tail -60`

Expected: 3 passing tests. If a test fails, the most likely causes (in order of
likelihood) are: (a) `getByPlaceholderText('0')` matching more than one node — narrow
with a more specific query if so; (b) the prediction banner text assertion needs a
`findByText` timeout bump — pass `{ timeout: 3000 }` as a second argument if the
300ms debounce in `AddTransactionSheet`'s prediction effect needs more headroom under
test; (c) `MerchantLearningService.getFavorites`/`getRecent` throwing because the
global `op-sqlite` mock in `jest.setup.js` returns `{ rows: [] }` for every query —
this should resolve to `[]` cleanly, but if it throws, mock
`MerchantLearningService.getFavorites`/`getRecent` the same way `TransactionPredictionService`
is mocked above. Do not move on until this suite is green.

**Step 3: Confirm Task 2's dead-code grep is now clean**

Run: `grep -rln "categorizationService" src __tests__`

Expected: no matches at all (both this file's old reference and the dead service are
gone).

**Step 4: Run the full suite**

Run: `npx jest --silent 2>&1 | tail -10`

Expected: no suites fail to *load* due to `categorizationService`/`uuid`; note the new
totals.

**Step 5: Commit (covers Task 2 + Task 3 together)**

```bash
git add __tests__/components/AddTransactionSheet.test.tsx
git rm src/services/categorizationService.ts __tests__/services/categorizationService.test.ts
git commit -m "test: rewrite AddTransactionSheet test against current UI, remove dead categorizationService"
```

---

### Task 4: Fix the bulk-approve index bug in `SmsReviewScreen`

**Files:**
- Modify: `src/screens/user/SmsReviewScreen.tsx`

**Problem:** `handleBulkApproveHigh` iterates `highConf` (an array of
`{ item, idx }` computed once, before any approvals happen) and calls
`handleApprove(item, idx)` sequentially. Each call does
`setDrafts(prev => prev.filter((_, i) => i !== index))` against whatever `drafts` is
*at that moment* — but `index` is the position in the *original* array. After the
first removal shifts everything left by one, every subsequent removal in the same
batch targets the wrong row. The transaction data saved is still correct (`item` is
captured correctly per-iteration), but the visible inbox can leave an unapproved draft
hidden or remove the wrong row.

**Fix:** Key removal by the draft's stable `id` instead of its array index.

**Step 1: Change `handleApprove` and `handleReject` to take an id, not an index**

Change:
```tsx
  const handleApprove = async (item: TransactionDraft, index: number) => {
    try {
      await addTransaction({
        amount: (item.amount_paise || 0) / 100, // App expects rupees currently
        type: 'expense', // Needs better mapping for credit if we extract it, but assuming expense for now
        category: item.category_id || 'unknown',
        categoryIcon: 'other',
        description: item.merchant_name || 'Unknown',
        date: item.date || new Date().toISOString(),
        paymentMethod: item.payment_method || 'UPI'
      });
      
      if (item.merchant_name && item.category_id) {
        await MerchantLearningService.learnCorrection(item.merchant_name, item.category_id);
        await MerchantLearningService.updateFrequency(item.merchant_name, item.category_id);
      }
      
      await EcosystemIntegrationService.notifyDraftSaved(item);

      setDrafts(prev => prev.filter((_, i) => i !== index));
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save transaction.');
    }
  };

  const handleReject = (index: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== index));
  };
```
to:
```tsx
  const handleApprove = async (item: TransactionDraft) => {
    try {
      await addTransaction({
        amount: (item.amount_paise || 0) / 100, // App expects rupees currently
        type: 'expense', // Needs better mapping for credit if we extract it, but assuming expense for now
        category: item.category_id || 'unknown',
        categoryIcon: 'other',
        description: item.merchant_name || 'Unknown',
        date: item.date || new Date().toISOString(),
        paymentMethod: item.payment_method || 'UPI'
      });
      
      if (item.merchant_name && item.category_id) {
        await MerchantLearningService.learnCorrection(item.merchant_name, item.category_id);
        await MerchantLearningService.updateFrequency(item.merchant_name, item.category_id);
      }
      
      await EcosystemIntegrationService.notifyDraftSaved(item);

      setDrafts(prev => prev.filter(d => d.id !== item.id));
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save transaction.');
    }
  };

  const handleReject = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };
```

**Step 2: Update the `highConf`/`lowConf` grouping to drop the index**

Change:
```tsx
  const { highConf, lowConf } = useMemo(() => {
    const high: Array<{item: TransactionDraft, idx: number}> = [];
    const low: Array<{item: TransactionDraft, idx: number}> = [];
    
    drafts.forEach((item, idx) => {
      const conf = item.confidence || 0;
      if (conf >= 90) high.push({ item, idx });
      else low.push({ item, idx });
    });
    
    return { highConf: high, lowConf: low };
  }, [drafts]);

  const handleBulkApproveHigh = async () => {
    for (const { item, idx } of highConf) {
      await handleApprove(item, idx);
    }
  };
```
to:
```tsx
  const { highConf, lowConf } = useMemo(() => {
    const high: TransactionDraft[] = [];
    const low: TransactionDraft[] = [];
    
    drafts.forEach((item) => {
      const conf = item.confidence || 0;
      if (conf >= 90) high.push(item);
      else low.push(item);
    });
    
    return { highConf: high, lowConf: low };
  }, [drafts]);

  const handleBulkApproveHigh = async () => {
    for (const item of highConf) {
      await handleApprove(item);
    }
  };
```

**Step 3: Update the two render blocks that mapped over `{item, idx}` pairs**

Change both occurrences of:
```tsx
                {highConf.map(({ item, idx }) => (
                  <SmsInboxRow 
                    key={idx} 
                    item={item} 
                    onApprove={() => handleApprove(item, idx)} 
                    onReject={() => handleReject(idx)}
                    onChangeCategory={() => {
                      Alert.alert('Change Category', 'Category picker would open here.');
                    }}
                  />
                ))}
```
and
```tsx
                {lowConf.map(({ item, idx }) => (
                  <SmsInboxRow 
                    key={idx} 
                    item={item} 
                    onApprove={() => handleApprove(item, idx)} 
                    onReject={() => handleReject(idx)}
                    onChangeCategory={() => {
                      Alert.alert('Change Category', 'Category picker would open here.');
                    }}
                  />
                ))}
```
to (same shape, just iterating plain items now):
```tsx
                {highConf.map((item) => (
                  <SmsInboxRow 
                    key={item.id} 
                    item={item} 
                    onApprove={() => handleApprove(item)} 
                    onReject={() => handleReject(item.id)}
                    onChangeCategory={() => {
                      Alert.alert('Change Category', 'Category picker would open here.');
                    }}
                  />
                ))}
```
and
```tsx
                {lowConf.map((item) => (
                  <SmsInboxRow 
                    key={item.id} 
                    item={item} 
                    onApprove={() => handleApprove(item)} 
                    onReject={() => handleReject(item.id)}
                    onChangeCategory={() => {
                      Alert.alert('Change Category', 'Category picker would open here.');
                    }}
                  />
                ))}
```

**Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`

Expected: no new errors.

**Step 5: Commit**

```bash
git add src/screens/user/SmsReviewScreen.tsx
git commit -m "fix: key SmsReviewScreen draft removal by id instead of stale array index"
```

---

### Task 5: Persist scanned receipt images with the saved transaction

**Files:**
- Create: `src/db/migrations/008_receipt_persistence.ts`
- Modify: `src/db/migrations/index.ts`
- Modify: `src/types/transaction.ts`
- Modify: `src/store/transactionStore.ts`
- Modify: `src/screens/user/AddScreen.tsx`

**Problem:** `AddTransactionSheet`'s scan mode captures `receipt_image_uri` into the
`TransactionDraft`, but the persisted `Transaction` type and the `transactions` table
have no column for it, and `AddScreen.tsx`'s `onSubmit` doesn't forward it either way.
The photo is discarded the instant the transaction is saved — receipt scanning
currently can't attach evidence to the saved record.

**Step 1: Write migration 008**

Create `src/db/migrations/008_receipt_persistence.ts`:
```ts
import type { DB } from '@op-engineering/op-sqlite';

/**
 * Adds receipt_image_uri to the live `transactions` table (renamed from
 * transactions_v2 in migration 002). transaction_drafts already had this
 * column since migration 006 — this closes the gap so a saved transaction
 * can keep the receipt photo captured during scan mode instead of losing it
 * at save time.
 */
export const migrate008ReceiptPersistence = async (db: DB): Promise<void> => {
  await db.execute('ALTER TABLE transactions ADD COLUMN receipt_image_uri TEXT;');
};
```

**Step 2: Register the migration**

In `src/db/migrations/index.ts`, add the import:
```ts
import { migrate007IncomeIntelligence } from './007_income_intelligence';
```
→
```ts
import { migrate007IncomeIntelligence } from './007_income_intelligence';
import { migrate008ReceiptPersistence } from './008_receipt_persistence';
```

And add the version bump after the existing `currentVersion < 7` block:
```ts
  if (currentVersion < 7) {
    await migrate007IncomeIntelligence(db);
    await db.execute('PRAGMA user_version = 7;');
  }
};
```
→
```ts
  if (currentVersion < 7) {
    await migrate007IncomeIntelligence(db);
    await db.execute('PRAGMA user_version = 7;');
  }

  if (currentVersion < 8) {
    await migrate008ReceiptPersistence(db);
    await db.execute('PRAGMA user_version = 8;');
  }
};
```

**Step 3: Add the field to the `Transaction` type**

In `src/types/transaction.ts`, change:
```ts
export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  description?: string;
  date: string;
  paymentMethod?: string;
  incomeType?: IncomeType;
  incomeSourceId?: string;
}
```
to:
```ts
export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  description?: string;
  date: string;
  paymentMethod?: string;
  incomeType?: IncomeType;
  incomeSourceId?: string;
  receiptImageUri?: string;
}
```

**Step 4: Thread it through `transactionStore.ts`**

In `src/store/transactionStore.ts`, update `ROW_QUERY`:
```ts
const ROW_QUERY = `
  SELECT t.id, t.amount_paise, t.type, c.name AS category,
         COALESCE(c.icon, 'other') AS categoryIcon,
         t.description, t.occurred_at, t.payment_method AS paymentMethod
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
`;
```
to:
```ts
const ROW_QUERY = `
  SELECT t.id, t.amount_paise, t.type, c.name AS category,
         COALESCE(c.icon, 'other') AS categoryIcon,
         t.description, t.occurred_at, t.payment_method AS paymentMethod,
         t.receipt_image_uri AS receiptImageUri
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
`;
```

Update `rowToTransaction`:
```ts
const rowToTransaction = (row: any): Transaction => ({
  id: row.id,
  amount: fromPaise(row.amount_paise),
  type: row.type,
  category: row.category ?? 'Other',
  categoryIcon: row.categoryIcon ?? 'other',
  description: row.description ?? undefined,
  date: new Date(row.occurred_at).toISOString(),
  paymentMethod: row.paymentMethod ?? undefined,
});
```
to:
```ts
const rowToTransaction = (row: any): Transaction => ({
  id: row.id,
  amount: fromPaise(row.amount_paise),
  type: row.type,
  category: row.category ?? 'Other',
  categoryIcon: row.categoryIcon ?? 'other',
  description: row.description ?? undefined,
  date: new Date(row.occurred_at).toISOString(),
  paymentMethod: row.paymentMethod ?? undefined,
  receiptImageUri: row.receiptImageUri ?? undefined,
});
```

Update the `addTransaction` INSERT:
```ts
      await db.execute(
        `INSERT INTO transactions
          (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL);`,
        [
          newTx.id,
          amountPaise,
          newTx.type,
          categoryId,
          newTx.description ?? null,
          new Date(newTx.date).getTime(),
          newTx.paymentMethod ?? null,
        ],
      );
```
to:
```ts
      await db.execute(
        `INSERT INTO transactions
          (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash, receipt_image_uri)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, ?);`,
        [
          newTx.id,
          amountPaise,
          newTx.type,
          categoryId,
          newTx.description ?? null,
          new Date(newTx.date).getTime(),
          newTx.paymentMethod ?? null,
          newTx.receiptImageUri ?? null,
        ],
      );
```

**Step 5: Forward it from `AddScreen.tsx`**

In `src/screens/user/AddScreen.tsx`, change:
```tsx
            await addTransaction({
              amount: (draft.amount_paise || 0) / 100, // App stores rupees externally in Context still
              type: 'expense',
              category: draft.category_id || 'unknown',
              categoryIcon: 'other',
              description: draft.merchant_name || 'Unknown',
              paymentMethod: draft.payment_method ?? 'Manual',
              date: draft.date || new Date().toISOString(),
            });
```
to:
```tsx
            await addTransaction({
              amount: (draft.amount_paise || 0) / 100, // App stores rupees externally in Context still
              type: 'expense',
              category: draft.category_id || 'unknown',
              categoryIcon: 'other',
              description: draft.merchant_name || 'Unknown',
              paymentMethod: draft.payment_method ?? 'Manual',
              date: draft.date || new Date().toISOString(),
              receiptImageUri: draft.receipt_image_uri,
            });
```

**Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`

Expected: no new errors.

**Step 7: Run the transaction store tests**

Run: `npx jest transactionStore.test.ts -v 2>&1 | tail -40`

Expected: still passing — none of the existing tests assert an exact SQL string or
exact column count, so adding a column/param should not break them. If a test does
fail, read the failure carefully before changing test expectations; the tests may be
catching a real ordering mistake in Step 4.

**Step 8: Commit**

```bash
git add src/db/migrations/008_receipt_persistence.ts src/db/migrations/index.ts \
        src/types/transaction.ts src/store/transactionStore.ts src/screens/user/AddScreen.tsx
git commit -m "feat: persist scanned receipt image with the saved transaction (migration 008)"
```

---

### Task 6: Full verification pass

**Step 1: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

**Step 2: Full test suite**

Run: `npx jest --silent 2>&1 | tail -15`
Expected: the 5 previously-hidden suites now load; compare pass/fail counts against
the Task 1 baseline and Task 3 baseline. Any suite still failing to *load* (not just
failing assertions) is a new problem introduced by this plan and must be fixed before
calling the plan done. Suites failing on real assertions unrelated to this plan's
changes are out of scope — note them for a separate pass.

**Step 3: Report**

Summarize before/after suite counts and list anything found but deliberately left
out of scope (per the Non-goal note at the top of this plan).
