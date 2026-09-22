# Smart Money Mentor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn CoinKeeper from a record of what happened into a mentor that warns before money is lost, explains where it went, and notices progress.

**Architecture:** Every figure the user sees is computed by pure functions over the SQLite ledger (`src/services/spendingAnalysis.ts` and siblings). The UI and notifications only present those results. The on-device model is used only where rules genuinely cannot work (unknown SMS formats); it never produces a number.

**Tech Stack:** React Native 0.80, TypeScript, op-sqlite (SQLCipher), zustand stores, notifee, FlashList, Reanimated. Optional on-device Gemma 3 270M via llama.rn.

---

## Ground rules for executing this plan

These override the default writing-plans template where they differ, because the product owner asked for them explicitly.

1. **Verification is on the real phone, in scenarios.** Every task ends with a device check: reload the app, walk the scenario, screenshot, read the screenshot. Nothing is "done" until it is seen on the device.
2. **Unit tests only where money is computed.** Pure functions that produce a rupee figure, a count or a date get a small test. UI, navigation and styling do not.
3. **Never edit source files while a scenario is running on the device.** Metro Fast Refresh reloads the app mid-run and silently kills in-flight work. That has already cost one import run.
4. **Never copy data or files from the Pro app to Lite.**
5. **Nothing destructive on the user's ledger without asking.** Re-import, reset and bulk deletes need an explicit go-ahead in the conversation.
6. **Commit only when the user says so.** Each task lists what it would commit.

### Device workflow (used by every scenario)

```bash
# Find the phone (wireless debugging ports rotate)
INST=$(perl -e 'alarm 8; exec "dns-sd -B _adb-tls-connect._tcp local."' | awk '/_adb-tls-connect/ {print $NF}' | tail -1)
perl -e "alarm 8; exec \"dns-sd -L $INST _adb-tls-connect._tcp local.\"" | grep "can be reached"
adb connect Android.local:<port>

# Every session: let the phone reach Metro, then reload
adb -s <device> reverse tcp:8081 tcp:8081
adb -s <device> shell am force-stop com.coinkeeper.finance
adb -s <device> shell monkey -p com.coinkeeper.finance -c android.intent.category.LAUNCHER 1

# Screenshot
adb -s <device> shell "screencap -p /sdcard/s.png" && adb -s <device> pull /sdcard/s.png ./s.png
```

Coordinates on the RMX3092 (1080×2400): Activity tab `342 2242`, Settings tab `735 2242`, Ask AI `915 194`, Inbox icon on Transactions `805 203`, Inbox refresh `977 202`.

### What the data says (drives every priority below)

Measured on the user's real 532-transaction ledger:

- **82% of spending has no category** (₹4,18,510), mostly person-to-person UPI.
- **Top payees are people:** ARFAT ROZEWALE ₹1,00,500; MAHIR BAGEWADI ₹35,000; LEEVIA ANGEL ₹15,000.
- **Repeating payments:** Airtel ₹3,003 ×18, HDFC ₹708 ×8 (low-balance fee), Airtel ₹499 ×10.
- **Only 15 of 1,204 bank SMS quote an account balance.** Live balance tracking is not possible from SMS alone.

---

## Phase 0 — A clean baseline

### Task 0.1: Checkpoint this session's work

**Needs user approval.**

**Step 1:** Run the full check.

```bash
npx tsc --noEmit -p . 2>&1 | grep -E "^src/|^App" ; npx jest 2>&1 | grep -E "Tests:|Test Suites:"
```

Expected: no type errors; `Tests: 595 passed`.

**Step 2:** Show `git status --short` to the user and commit on their word:

```bash
git add -A
git commit -m "feat: SMS import overhaul, in-app analysis, dialogs, lending foundation"
```

### Task 0.2: Re-import so tonight's parsing fixes reach the ledger

**Needs user approval.** Existing rows were imported before three fixes, so two insights are still wrong: fees show ₹308 instead of about ₹5,900, and Airtel is double-counted.

**Scenario:**
1. Inbox → refresh → **Re-import everything** → **Add all**.
2. Ask AI → Intelligence.

**Expected on screen:**
- The bank charges card includes the ₹708 low-balance charges (total well above ₹5,000).
- The Airtel ₹3,003 count is roughly half of 18, because payment and confirmation SMS now count once.
- Transactions total stays close to 532, minus the held-back duplicates.

**If the fee card still misses them:** open one of those transactions and check its name. The parser should now produce `low balance`; if it shows `HDFC Bank`, the new `charged for (.+?) in your` pattern in `src/services/sms/parseSmsBody.ts` did not match that message.

---

## Phase 1 — Warn before a charge, not after

The app already detects repeating payments and already knows how to schedule bill reminders. This phase connects them instead of building a second alert system.

### Task 1.1: Infer when a repeating payment falls due

**Files:**
- Modify: `src/services/spendingAnalysis.ts`
- Test: `__tests__/services/spendingAnalysis.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { inferMonthlyDueDay } from '../../src/services/spendingAnalysis';

describe('inferMonthlyDueDay', () => {
  it('finds the day a monthly bill usually lands', () => {
    expect(inferMonthlyDueDay(['2026-05-16', '2026-06-16', '2026-07-17', '2026-08-16'])).toBe(16);
  });

  it('refuses a payment that is not monthly', () => {
    // Weekly top-ups are repetition, not a monthly bill.
    expect(inferMonthlyDueDay(['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22'])).toBeNull();
  });

  it('needs at least three occurrences', () => {
    expect(inferMonthlyDueDay(['2026-07-16', '2026-08-16'])).toBeNull();
  });
});
```

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/services/spendingAnalysis.test.ts`
Expected: FAIL, `inferMonthlyDueDay is not a function`.

**Step 3: Implement**

Append to `src/services/spendingAnalysis.ts`:

```ts
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The day of the month a repeating payment usually lands, or null when the
 * repetition is not monthly. Gaps must mostly sit between 25 and 35 days:
 * billing dates drift by a day or two, but a weekly top-up is not a bill.
 */
export const inferMonthlyDueDay = (dates: readonly string[]): number | null => {
  if (dates.length < 3) return null;

  const sorted = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((t, i) => (t - sorted[i]) / DAY_MS);
  const monthly = gaps.filter(g => g >= 25 && g <= 35).length;
  if (monthly < Math.ceil(gaps.length * 0.6)) return null;

  const days = sorted.map(t => new Date(t).getDate()).sort((a, b) => a - b);
  return days[Math.floor(days.length / 2)];
};
```

Also extend `RecurringPayment` with the dates it saw, so callers can infer a due day:

```ts
export interface RecurringPayment {
  payee: string;
  amountPaise: number;
  times: number;
  lastSeen: string;
  totalPaise: number;
  /** Every date this payment landed, oldest first. */
  dates: string[];
}
```

In `findRecurring`, add `dates: sorted.map(tx => tx.date),` to the pushed object.

**Step 4: Run the test**

Run: `npx jest __tests__/services/spendingAnalysis.test.ts`
Expected: PASS.

**Step 5: Commit (on the user's word)**

```bash
git add src/services/spendingAnalysis.ts __tests__/services/spendingAnalysis.test.ts
git commit -m "feat: infer the monthly due day of a repeating payment"
```

### Task 1.2: Suggest bills from repeating payments

**Files:**
- Create: `src/services/billSuggestions.ts`
- Modify: `__tests__/services/spendingAnalysis.test.ts` (add cases)

**Step 1: Write the failing test**

```ts
import { suggestBills } from '../../src/services/billSuggestions';
import type { RecurringPayment } from '../../src/services/spendingAnalysis';

const airtel: RecurringPayment = {
  payee: 'Airtel', amountPaise: 300300, times: 4, totalPaise: 1201200,
  lastSeen: '2026-08-16', dates: ['2026-05-16', '2026-06-16', '2026-07-16', '2026-08-16'],
};

describe('suggestBills', () => {
  it('turns a monthly repeating payment into a bill with its due day', () => {
    expect(suggestBills([airtel], [])).toEqual([
      { name: 'Airtel', amountPaise: 300300, dueDay: 16 },
    ]);
  });

  it('skips a payment the user already tracks as a bill', () => {
    expect(suggestBills([airtel], [{ name: 'airtel', amountPaise: 300300 }])).toEqual([]);
  });
});
```

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/services/spendingAnalysis.test.ts`
Expected: FAIL, module not found.

**Step 3: Implement** `src/services/billSuggestions.ts`:

```ts
import { inferMonthlyDueDay, type RecurringPayment } from './spendingAnalysis';

export interface BillSuggestion {
  name: string;
  amountPaise: number;
  dueDay: number;
}

/**
 * Repeating monthly payments the user does not yet track as a bill. Once they
 * are bills, the existing reminder system warns before each one lands, with
 * no second alert mechanism to keep in step.
 */
export const suggestBills = (
  recurring: readonly RecurringPayment[],
  existingBills: readonly { name: string; amountPaise: number }[],
): BillSuggestion[] => {
  const tracked = new Set(existingBills.map(b => `${b.name.trim().toLowerCase()}|${b.amountPaise}`));

  return recurring.flatMap(payment => {
    const dueDay = inferMonthlyDueDay(payment.dates);
    const key = `${payment.payee.trim().toLowerCase()}|${payment.amountPaise}`;
    if (dueDay === null || tracked.has(key)) return [];
    return [{ name: payment.payee, amountPaise: payment.amountPaise, dueDay }];
  });
};
```

**Step 4: Run the test.** Expected: PASS.

**Step 5: Commit** `feat: suggest bills from repeating payments`.

### Task 1.3: "Remind me before each charge" on the Intelligence screen

**Files:**
- Modify: `src/screens/user/AskAiScreen.tsx`
- Modify: `src/services/InsightEngine.ts` (tag the recurring insight so the screen can act on it)

**Step 1:** In `InsightEngine`, give the recurring insight a stable route: `actionRoute: 'SuggestBills'`.

**Step 2:** In `AskAiScreen`, when an insight has `actionRoute === 'SuggestBills'`, render a button under its text: **Remind me before each charge**. On press:

```tsx
import { useBillStore } from '../../store/billStore';
import { rescheduleBillReminders } from '../../services/notificationService';
import { suggestBills } from '../../services/billSuggestions';
import { findRecurring } from '../../services/spendingAnalysis';
import { useTransactionStore } from '../../store/transactionStore';

const handleRemindBills = async () => {
  const { transactions } = useTransactionStore.getState();
  const { bills, addBill } = useBillStore.getState();
  const suggestions = suggestBills(findRecurring(transactions), bills);

  for (const s of suggestions) {
    await addBill({ name: s.name, amountPaise: s.amountPaise, dueDay: s.dueDay, isRecurring: true, reminderDaysBefore: 3 });
  }
  // addBill stores the bill but does not schedule it; this schedules every active bill.
  await rescheduleBillReminders();
  setDialog({
    title: 'Reminders set',
    message: `${suggestions.length} bill${suggestions.length === 1 ? '' : 's'} will now remind you 3 days before they land.`,
    actions: [{ label: 'Done', cancel: true }],
  });
};
```

Use the shared `AppDialog` (`src/components/ui/AppDialog.tsx`), never `Alert.alert`.

**Step 3: Type-check.** `npx tsc --noEmit -p .` — no errors.

**Scenario (device):**
1. Ask AI → tap **Remind me before each charge**.
2. Expect the "Reminders set" dialog with a count.
3. Settings → Upcoming Bills: Airtel appears with its due day.
4. Confirm the reminders exist:
   ```bash
   adb -s <device> shell dumpsys notification | grep -c coinkeeper
   ```
   Expect a non-zero count after the step (notifee trigger notifications are registered with the system).

**Commit** `feat: turn repeating payments into bill reminders`.

---

## Phase 2 — Stop paying bank fees

Live balance warnings are not possible: only 15 of 1,204 bank SMS quote a balance. This phase warns from the **pattern** instead: a bank that charged a low-balance fee in past months will probably do so again, so remind the user before month-end.

### Task 2.1: Find fees that repeat per bank

**Files:**
- Modify: `src/services/spendingAnalysis.ts`
- Test: `__tests__/services/spendingAnalysis.test.ts`

**Step 1: Write the failing test**

```ts
import { findRepeatingFees } from '../../src/services/spendingAnalysis';

const fee = (month: string, bankId = 'HDFC') => ({
  id: month, amountPaise: 70800, type: 'expense' as const,
  description: 'low balance', bankId, date: `${month}-05T10:00:00Z`,
});

describe('findRepeatingFees', () => {
  it('reports a bank that charged a low-balance fee month after month', () => {
    const result = findRepeatingFees([fee('2026-05'), fee('2026-06'), fee('2026-07')]);
    expect(result).toEqual([{ bankId: 'HDFC', months: 3, totalPaise: 212400, lastAmountPaise: 70800 }]);
  });

  it('ignores a one-off charge', () => {
    expect(findRepeatingFees([fee('2026-07')])).toEqual([]);
  });
});
```

**Step 2:** Run it; expect FAIL.

**Step 3: Implement.** Add `bankId?: string` to `AnalysableTransaction`, then:

```ts
export interface RepeatingFee {
  bankId: string;
  /** Distinct calendar months the bank charged a fee in. */
  months: number;
  totalPaise: number;
  lastAmountPaise: number;
}

/** A fee charged in two or more separate months is a habit worth breaking. */
export const findRepeatingFees = (
  transactions: readonly AnalysableTransaction[],
): RepeatingFee[] => {
  const byBank = new Map<string, AnalysableTransaction[]>();
  for (const tx of spends(transactions)) {
    if (!tx.bankId || !FEE_WORDS.test(nameOf(tx))) continue;
    const list = byBank.get(tx.bankId) ?? [];
    list.push(tx);
    byBank.set(tx.bankId, list);
  }

  return [...byBank.entries()]
    .map(([bankId, fees]) => {
      const sorted = [...fees].sort((a, b) => a.date.localeCompare(b.date));
      return {
        bankId,
        months: new Set(sorted.map(f => monthOf(f.date))).size,
        totalPaise: sorted.reduce((s, f) => s + f.amountPaise, 0),
        lastAmountPaise: sorted[sorted.length - 1].amountPaise,
      };
    })
    .filter(f => f.months >= 2)
    .sort((a, b) => b.totalPaise - a.totalPaise);
};
```

In `InsightEngine`, include `t.bank_id AS bankId` in the ledger query and map it.

**Step 4:** Run tests; expect PASS. **Commit** `feat: detect fees a bank charges month after month`.

### Task 2.2: Remind before month-end

**Files:**
- Modify: `src/services/notificationService.ts`
- Modify: `src/services/InsightEngine.ts`

**Step 1:** Add to `notificationService.ts`:

```ts
/**
 * A reminder on the 25th, before most banks assess month-end balances. Driven
 * by fee history rather than live balance, because bank SMS rarely quote one.
 */
export const scheduleFeeReminder = async (bankName: string, feePaise: number, months: number) => {
  if (!(await areNotificationsEnabled())) return;

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), 25, 10, 0, 0);
  if (target.getTime() <= now.getTime()) target.setMonth(target.getMonth() + 1);

  await notifee.createTriggerNotification(
    {
      id: `fee-reminder-${bankName}`,
      title: `Avoid the ${bankName} low-balance fee`,
      body: `${bankName} charged ₹${Math.round(feePaise / 100)} in ${months} past months. Top it up before month-end.`,
      android: { channelId: CHANNELS.INSIGHTS, pressAction: { id: 'default' } },
    },
    { type: TriggerType.TIMESTAMP, timestamp: target.getTime() },
  );
};
```

Using a fixed `id` means rescheduling replaces the reminder rather than stacking a second one.

**Step 2:** At the end of `generateDailyInsights`, for each repeating fee, call `scheduleFeeReminder` with the bank's display name (from `resolveBank`'s name map) and emit a warning insight: `"HDFC Bank has charged a low-balance fee in 8 months — ₹5,664 so far"`.

**Scenario (device):**
1. Ask AI → Intelligence.
2. Expect a card naming HDFC's repeating fee with month count and total.
3. Confirm a scheduled trigger:
   ```bash
   adb -s <device> shell dumpsys notification | grep -i "fee-reminder"
   ```

**Commit** `feat: remind before a repeating bank fee lands`.

---

## Phase 3 — "Who is this?"

82% of spending cannot be categorised because it went to people. Asking about the ten biggest unnamed payees explains most of that money, and teaches the importer for next time.

### Task 3.1: Rank the payees worth asking about

**Files:**
- Modify: `src/services/spendingAnalysis.ts`
- Test: `__tests__/services/spendingAnalysis.test.ts`

**Step 1: Write the failing test**

```ts
import { payeesToName } from '../../src/services/spendingAnalysis';

const t = (description: string, amountPaise: number, category = 'Others') => ({
  id: description + amountPaise, amountPaise, type: 'expense' as const,
  description, category, date: '2026-08-01T00:00:00Z',
});

describe('payeesToName', () => {
  it('lists uncategorised payees by money, largest first', () => {
    const result = payeesToName([
      t('ARFAT ROZEWALE', 10050000),
      t('LEEVIA ANGEL', 1500000),
      t('Jio-bp Pump', 55400, 'Transport'),
    ]);
    expect(result.map(p => p.payee)).toEqual(['ARFAT ROZEWALE', 'LEEVIA ANGEL']);
  });
});
```

**Step 2:** Run; expect FAIL.

**Step 3: Implement**

```ts
const UNEXPLAINED = new Set(['', 'other', 'others', 'unknown']);

/**
 * The payees whose naming would explain the most money. Ten questions answered
 * once beat a category chart built on a tenth of the ledger.
 */
export const payeesToName = (
  transactions: readonly AnalysableTransaction[],
  limit = 10,
): { payee: string; totalPaise: number; times: number }[] => {
  const totals = new Map<string, { payee: string; totalPaise: number; times: number }>();
  for (const tx of spends(transactions)) {
    const payee = nameOf(tx);
    if (!payee || !UNEXPLAINED.has((tx.category ?? '').trim().toLowerCase())) continue;
    const entry = totals.get(payee) ?? { payee, totalPaise: 0, times: 0 };
    entry.totalPaise += tx.amountPaise;
    entry.times += 1;
    totals.set(payee, entry);
  }
  return [...totals.values()].sort((a, b) => b.totalPaise - a.totalPaise).slice(0, limit);
};
```

**Step 4:** PASS. **Commit** `feat: rank the payees worth naming`.

### Task 3.2: Apply a name to every past and future transaction

**Files:**
- Modify: `src/store/transactionStore.ts`

**Step 1:** Add the action to the store interface and implementation:

```ts
/** Files every transaction to this payee under a category, and remembers it for future imports. */
categorisePayee: (payee: string, categoryName: string, icon?: string) => Promise<number>;
```

```ts
categorisePayee: async (payee, categoryName, icon) => {
  const db = getDb();
  const categoryId = await resolveCategoryId(db, categoryName, icon);

  const before = await db.execute(
    'SELECT COUNT(*) AS total FROM transactions WHERE description = ?;',
    [payee],
  );
  const changed = (((before?.rows ?? []) as any[])[0]?.total ?? 0) as number;

  await db.execute('UPDATE transactions SET category_id = ? WHERE description = ?;', [categoryId, payee]);
  // Teaches the importer: the next SMS to this payee arrives already filed.
  await MerchantLearningService.learnCorrection(payee, categoryId);

  await get().loadTransactions();
  financialEventBus.emit();
  return changed;
},
```

Import `MerchantLearningService` from `../services/MerchantLearningService`. Counting before updating avoids relying on op-sqlite's `rowsAffected`, which is not reported for these statements.

**Step 2:** Type-check. **Commit** `feat: categorise every transaction to a payee at once`.

### Task 3.3: The naming screen

**Files:**
- Create: `src/screens/user/NamePayeesScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (register `NamePayees`)
- Modify: `src/services/InsightEngine.ts` (coverage insight → `actionRoute: 'NamePayees'`)
- Modify: `src/screens/user/AskAiScreen.tsx` (action button navigates)

**Screen behaviour:**
- Header: "Who are these?" plus a one-line explanation: *"Name your biggest payees once. Past and future payments to them are filed automatically."*
- List (FlashList): payee name, total, times paid.
- Tapping a row opens a chooser with quick picks first: **Family**, **Friends**, **Rent**, **Salary to staff**, then the existing categories via `CategoryPickerSheet`. Quick picks are created on first use through `resolveCategoryId` (find-or-create), so no migration is needed.
- After picking, call `categorisePayee`, remove the row, and show a quiet toast: *"ARFAT ROZEWALE → Family · 4 payments filed"*.
- Style with `useSpecTheme` tokens and `onAccent` for text on accent backgrounds. Never hardcode `#FFFFFF`.

**Scenario (device):**
1. Ask AI → tap the "82% has no category" card → the naming screen opens.
2. Expect ARFAT ROZEWALE first at ₹1,00,500.
3. Pick **Family**. The row disappears and the toast shows 4 payments filed.
4. Back to Intelligence: the uncategorised percentage has dropped.
5. Transactions → search ARFAT → the rows show **Family**.

**Commit** `feat: name your biggest payees once`.

---

## Phase 4 — Lent & returned

Foundation already exists: migration 019 (`awaiting_return`, `settlement_of`), `src/services/settlementMatcher.ts` (tested), store actions `markAwaitingReturn` and `settleWith`, the "I'll get this back" toggle, and settled rows excluded from totals.

### Task 4.1: Detect returns across the ledger

**Files:**
- Create: `src/services/settlementDetection.ts`

**Implementation:**

```ts
import { findReturn, type Match } from './settlementMatcher';
import type { Transaction } from '../types/transaction';

export interface ReturnSuggestion extends Match {
  outgoingId: string;
}

/**
 * Pairs every outstanding loan with the money that came back. A 'settled'
 * verdict (same amount, matching name, within 90 days) is safe to apply
 * silently; an 'ask' verdict waits for the user.
 */
export const detectReturns = (transactions: readonly Transaction[]): ReturnSuggestion[] => {
  const settledIncoming = new Set(transactions.filter(t => t.settlementOf).map(t => t.id));
  const outstanding = transactions.filter(
    t => t.type === 'expense' && t.awaitingReturn && !transactions.some(r => r.settlementOf === t.id),
  );
  const incoming = transactions
    .filter(t => t.type === 'income' && !settledIncoming.has(t.id))
    .map(t => ({
      id: t.id,
      amountPaise: t.amountPaise,
      counterparty: t.description ?? '',
      occurredAt: new Date(t.date).getTime(),
    }));

  return outstanding.flatMap(out => {
    const match = findReturn(
      { id: out.id, amountPaise: out.amountPaise, counterparty: out.description ?? '', occurredAt: new Date(out.date).getTime() },
      incoming,
    );
    return match ? [{ ...match, outgoingId: out.id }] : [];
  });
};
```

The matcher logic is already tested; this file only wires rows into it, so it gets a device check rather than a test.

### Task 4.2: Apply safe matches automatically

**Files:**
- Modify: `src/store/transactionStore.ts`

Add:

```ts
/** Settles every exact match silently; returns the ones that need the user. */
reconcileReturns: () => Promise<ReturnSuggestion[]>;
```

```ts
reconcileReturns: async () => {
  const suggestions = detectReturns(get().transactions);
  for (const s of suggestions.filter(x => x.verdict === 'settled')) {
    await get().settleWith(s.outgoingId, s.incomingId);
  }
  return suggestions.filter(x => x.verdict === 'ask');
},
```

Call `reconcileReturns()` after `addTransactions` finishes in `SmsReviewScreen.handleAddAll`, so a repayment imported from SMS settles its loan immediately.

### Task 4.3: The Lent & returned screen

**Files:**
- Create: `src/screens/user/LentReturnedScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (register `LentReturned`)
- Modify: `src/screens/user/SettingsScreen.tsx` (row: **Lent & returned**)

**Sections, top to bottom:**
1. **Still out** — outstanding loans grouped by person, with the total at the top (*"₹8,500 still out with 3 people"*).
2. **Did this come back?** — the `ask` suggestions from `reconcileReturns()`, each with **Yes, it's back** (calls `settleWith`) and **No** (dismisses for this session).
3. **Settled** — past pairs: out date, back date, amount.

Run `reconcileReturns()` when the screen opens, so detection happens even without a new import.

**Scenario (device):**
1. Transactions → open a ₹3,500 payment to a person → turn on **I'll get this back** → Save.
2. Expect it gone from the Expense total, and listed under **Still out** on Lent & returned.
3. Transactions → find an incoming payment from the same person for the same amount (or add one manually with the same name).
4. Reopen Lent & returned: the pair has moved to **Settled** with no prompt.
5. Repeat with a partial amount: expect a **Did this come back?** card instead.

**Commit** `feat: Lent & returned, settled automatically when it is safe`.

---

## Phase 5 — A weekly check-in, one sentence long

### Task 5.1: Build the sentence

**Files:**
- Create: `src/services/weeklyCheckIn.ts`
- Test: `__tests__/services/weeklyCheckIn.test.ts`

**Step 1: Write the failing test**

```ts
import { buildWeeklyCheckIn } from '../../src/services/weeklyCheckIn';

const spend = (date: string, amountPaise: number) => ({
  id: date + amountPaise, amountPaise, type: 'expense' as const, description: 'x', date,
});

describe('buildWeeklyCheckIn', () => {
  const now = new Date('2026-09-13T19:00:00Z');

  it('says the week was lighter than usual and names the next bill', () => {
    const history = [
      spend('2026-08-20', 500000), spend('2026-08-27', 500000), spend('2026-09-03', 500000),
      spend('2026-09-10', 200000),
    ];
    const text = buildWeeklyCheckIn(history, [{ name: 'Airtel', amountPaise: 300300, dueDay: 16 }], now);
    expect(text).toBe('You spent ₹2,000 this week, less than your usual ₹5,000. Airtel (₹3,003) is due on the 16th.');
  });

  it('stays short', () => {
    const text = buildWeeklyCheckIn([spend('2026-09-10', 100)], [], now);
    expect(text.length).toBeLessThanOrEqual(140);
  });
});
```

**Step 2:** Run; expect FAIL.

**Step 3: Implement**

```ts
import type { AnalysableTransaction } from './spendingAnalysis';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

/**
 * One sentence about the past week: how it compared with a usual week, and
 * the next thing that will cost money. No lists, no scores, no guilt.
 */
export const buildWeeklyCheckIn = (
  transactions: readonly AnalysableTransaction[],
  bills: readonly { name: string; amountPaise: number; dueDay: number }[],
  now: Date = new Date(),
): string => {
  const end = now.getTime();
  const weekTotal = (weeksAgo: number) =>
    transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const at = new Date(t.date).getTime();
        return at <= end - weeksAgo * WEEK_MS && at > end - (weeksAgo + 1) * WEEK_MS;
      })
      .reduce((s, t) => s + t.amountPaise, 0);

  const thisWeek = weekTotal(0);
  const earlier = [1, 2, 3, 4].map(weekTotal).filter(v => v > 0).sort((a, b) => a - b);
  const usual = earlier.length ? earlier[Math.floor(earlier.length / 2)] : null;

  let sentence =
    usual === null
      ? `You spent ${rupees(thisWeek)} this week.`
      : thisWeek <= usual
        ? `You spent ${rupees(thisWeek)} this week, less than your usual ${rupees(usual)}.`
        : `You spent ${rupees(thisWeek)} this week, more than your usual ${rupees(usual)}.`;

  const today = now.getDate();
  const next = [...bills].sort((a, b) => ((a.dueDay - today + 31) % 31) - ((b.dueDay - today + 31) % 31))[0];
  if (next) {
    const suffix = next.dueDay % 10 === 1 && next.dueDay !== 11 ? 'st'
      : next.dueDay % 10 === 2 && next.dueDay !== 12 ? 'nd'
      : next.dueDay % 10 === 3 && next.dueDay !== 13 ? 'rd' : 'th';
    const tail = ` ${next.name} (${rupees(next.amountPaise)}) is due on the ${next.dueDay}${suffix}.`;
    if ((sentence + tail).length <= 140) sentence += tail;
  }
  return sentence;
};
```

**Step 4:** PASS. **Commit** `feat: one-sentence weekly check-in`.

### Task 5.2: Show it first on Intelligence

**Files:** `src/screens/user/AskAiScreen.tsx`

Render the sentence as the first card, above the insights, titled **This week**. Compute it live on screen open from the transaction and bill stores, so it is never stale.

### Task 5.3: A weekly nudge to look

**Files:** `src/services/notificationService.ts`

```ts
import { RepeatFrequency } from '@notifee/react-native';

/** Sunday evening. The sentence itself is built when the screen opens, so it is never out of date. */
export const scheduleWeeklyCheckIn = async () => {
  if (!(await areNotificationsEnabled())) return;
  const next = new Date();
  next.setDate(next.getDate() + ((7 - next.getDay()) % 7 || 7));
  next.setHours(19, 0, 0, 0);

  await notifee.createTriggerNotification(
    {
      id: 'weekly-check-in',
      title: 'Your week in money',
      body: 'One sentence on how the week went, and what is coming next.',
      android: { channelId: CHANNELS.INSIGHTS, pressAction: { id: 'default' } },
    },
    { type: TriggerType.TIMESTAMP, timestamp: next.getTime(), repeatFrequency: RepeatFrequency.WEEKLY },
  );
};
```

Call it once after `initializeNotifications()` in `TransactionsContext`. The fixed id makes repeat calls replace rather than stack.

**Scenario (device):** open Ask AI; the **This week** card is first and reads as one sentence. `dumpsys notification | grep weekly-check-in` shows the trigger.

**Commit** `feat: weekly check-in card and Sunday nudge`.

---

## Phase 6 — Celebrate wins

### Task 6.1: Find progress worth saying out loud

**Files:**
- Modify: `src/services/spendingAnalysis.ts`
- Test: `__tests__/services/spendingAnalysis.test.ts`

**Step 1: Write the failing test**

```ts
import { findWins } from '../../src/services/spendingAnalysis';

const row = (date: string, amountPaise: number, description = 'x') => ({
  id: date + description, amountPaise, type: 'expense' as const, description, date,
});

describe('findWins', () => {
  const now = new Date('2026-09-20T10:00:00Z');

  it('notices a month with no bank fees after months that had them', () => {
    const wins = findWins(
      [row('2026-06-05', 70800, 'low balance'), row('2026-07-05', 70800, 'low balance'), row('2026-09-02', 5000, 'Swiggy')],
      now,
    );
    expect(wins).toContain('No bank fees this month, after 2 months of paying them.');
  });

  it('says nothing when there is nothing to celebrate', () => {
    expect(findWins([], now)).toEqual([]);
  });
});
```

**Step 2:** Run; expect FAIL.

**Step 3: Implement**

```ts
/**
 * Plain-language progress. Budgeting apps lose people partly because they only
 * ever report failure; a real improvement deserves a sentence.
 */
export const findWins = (
  transactions: readonly AnalysableTransaction[],
  now: Date = new Date(),
): string[] => {
  const wins: string[] = [];
  const thisMonth = now.toISOString().slice(0, 7);
  const feeMonths = new Set(
    spends(transactions).filter(tx => FEE_WORDS.test(nameOf(tx))).map(tx => monthOf(tx.date)),
  );

  if (feeMonths.size > 0 && !feeMonths.has(thisMonth)) {
    wins.push(`No bank fees this month, after ${feeMonths.size} month${feeMonths.size === 1 ? '' : 's'} of paying them.`);
  }

  const months = spendByMonth(transactions);
  const current = months.find(m => m.month === thisMonth);
  const past = months.filter(m => m.month !== thisMonth).map(m => m.spentPaise).sort((a, b) => a - b);
  if (current && past.length >= 3 && current.spentPaise < past[Math.floor(past.length / 2)] * 0.7) {
    wins.push('This month is running well below your usual spending.');
  }

  return wins;
};
```

**Step 4:** PASS.

### Task 6.2: Show wins on Intelligence

**Files:** `src/services/InsightEngine.ts`, `src/screens/user/AskAiScreen.tsx`

Emit each win as a `type: 'milestone'` insight. In `AskAiScreen`, render milestones with the success colour (`colors.success`) and a check icon, placed after **This week** so good news is seen before warnings.

**Scenario (device):** wins only appear when earned, so verify the empty case: no milestone card should appear on the current ledger if this month has fees. Then check the rendering by temporarily running with a device date in a fee-free month, or by trusting the unit test and confirming the card style once a real win occurs.

**Commit** `feat: celebrate real progress`.

---

## Phase 7 — Read with AI, or normally

From the agreed design (`docs/plans/2026-09-16-money-that-comes-back-and-ai-design.md`, part 2).

### Task 7.1: Ask how to read, when the Inbox opens

**Files:** `src/screens/user/SmsReviewScreen.tsx`

On first entry (not on every refresh), show `AppDialog`:
- Title: **How should CoinKeeper read your messages?**
- **Read normally** — "Instant. Uses the bank formats it knows." → `loadSms()`
- **Read with AI** — "Slower. Also reads formats it doesn't know." → Task 7.2
- **Cancel**

Remember the last choice in preferences (`sms_read_mode`), and preselect it next time.

### Task 7.2: The AI path

**Files:** `src/screens/user/SmsReviewScreen.tsx`

```ts
const readWithAi = async () => {
  if ((await LlmModelManager.getState()) !== 'ready') {
    setDialog({
      title: 'AI reading needs a one-time download',
      message: 'A 278 MB model that runs only on this phone. Your messages are never uploaded.',
      actions: [
        { label: 'Download', onPress: () => navigation.navigate('SmartParsing') },
        { label: 'Read normally instead', onPress: () => void loadSms() },
        { label: 'Cancel', cancel: true },
      ],
    });
    return;
  }
  await loadSms({ useModel: true, autoImport: true });
};
```

Extend `loadSms` with:
- `useModel` → passed through to `parseSmsToDraft(m, { useModel })`.
- `autoImport` → after the scan, call `handleAddAll(parsed)` directly instead of `promptAddAll`.

The model already runs only on messages the rules did not recognise and that mention money (`parseSmsSmart`), so the AI path touches a few hundred messages, not the whole inbox.

### Task 7.3: One-tap undo for the batch

**Files:** `src/store/transactionStore.ts`, `src/screens/user/SmsReviewScreen.tsx`

1. Make `addTransactions` return the saved ids alongside the count (`{ saved: number; ids: string[] }`), and update its two callers.
2. Add `deleteTransactionsByIds(ids: string[]): Promise<void>` using a single `DELETE ... WHERE id IN (...)` and one `financialEventBus.emit()`.
3. The summary banner after an AI import reads *"Added 47 — 12 read by AI · Undo"*; **Undo** calls `deleteTransactionsByIds`.

**Scenario (device), needs the model downloaded in the Lite app first (user's call, 278 MB):**
1. Inbox → **Read with AI**.
2. Expect progress, then an automatic import with the summary banner.
3. Rows read by the model carry **🤖 Read by AI**.
4. Tap **Undo**: the batch disappears from Transactions and the count returns to where it was.

**Commit** `feat: read SMS with AI, import automatically, undo in one tap`.

---

## Out of scope for this plan

- **Chat that answers with ledger facts in AI wording** (design part 3). It deserves its own plan once Phases 1–6 give it better facts to talk about.
- **Sharing one model file between Pro and Lite.** Explicitly not wanted.
- **Moving money or investing.** CoinKeeper tracks money; it never holds or moves it.

## Order and why

| Phase | Why this order |
|---|---|
| 0 | The ledger has to be right before anything analyses it |
| 1 | Reuses detection and reminders that already work; immediate, concrete value |
| 2 | Saves real rupees (₹708 a month on this ledger) |
| 3 | Unlocks meaningful categories for a ledger that is mostly people |
| 4 | Builds on Phase 3 (names make lending legible) and the existing foundation |
| 5, 6 | Keep people coming back, once there is something accurate to say |
| 7 | Largest change and needs a 278 MB download; lowest value on this ledger, where rules already read almost everything |
