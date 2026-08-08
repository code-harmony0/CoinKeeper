# Transactions Audit Remediation (Phase 1) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining Transactions-screen gaps from the product audit: a real transaction detail/edit/delete flow, period-scoped summary numbers, date/amount filtering, a working "Change Category" action in the SMS Inbox, feedback after bulk-approve, and correct icon/color rendering for custom categories.

**Architecture:** No new screens are added to navigation — everything is a modal/sheet layered on the existing `TransactionsScreen` and `SmsReviewScreen`. Two new small reusable pieces are introduced: `CategoryPickerSheet` (list-and-pick from the real `categories` table) and `TransactionDetailSheet` (view/edit/delete a single transaction, reusing `TransactionEntryShell` for visual consistency with the existing Add sheet). Everything else is either a pure helper function (tested in isolation) or a targeted edit to existing state/render logic.

**Tech Stack:** React Native, TypeScript, Zustand (`transactionStore.ts`), `op-sqlite` via `getDb()`, Jest + `@testing-library/react-native`.

---

## Before you start

Run the existing suite once to confirm a clean baseline:

```bash
npx jest __tests__/screens/TransactionsScreen.test.tsx __tests__/store/transactionStore.test.ts -v
```
Expected: all existing tests PASS. If anything is already red, stop and report it — don't build on a broken baseline.

---

### Task 1: Real icon + color for every category on the Transactions list

Today `TransactionsScreen.tsx` maps `item.categoryIcon` through a hardcoded 8-key `CATEGORY_ICONS` object (lines 65–74) and falls back to `MoreHorizontal` — silently ignoring any icon a user picked for a custom category, and never reading the category's `color` at all (row icon background is always `colors.chipBg`). `src/utils/categoryIcon.ts` already solves this correctly (`resolveCategoryIcon`) and is used by `CategoryCard.tsx`, but the transaction list never adopted it, and the row query never even fetches `color`.

**Files:**
- Modify: `src/store/transactionStore.ts:80-98`
- Modify: `src/types/transaction.ts:3-14`
- Modify: `src/screens/user/TransactionsScreen.tsx:65-74,256-282`
- Test: `__tests__/store/transactionStore.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/store/transactionStore.test.ts`:

```ts
it('loadTransactions maps the category color through to the Transaction shape', async () => {
  mockExecute.mockImplementation((sql: string) => {
    if (sql.includes('FROM transactions t')) {
      return Promise.resolve({
        rows: [
          {
            id: 'tx1',
            amount_paise: 45000,
            type: 'expense',
            category: 'Groceries',
            categoryIcon: 'ShoppingCart',
            categoryColor: '#FFB86B',
            description: null,
            occurred_at: Date.now(),
            paymentMethod: null,
          },
        ],
      });
    }
    return Promise.resolve({ rows: [] });
  });

  await useTransactionStore.getState().loadTransactions();

  expect(useTransactionStore.getState().transactions[0].categoryColor).toBe('#FFB86B');
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/store/transactionStore.test.ts -t "category color" -v`
Expected: FAIL — `categoryColor` is `undefined` because `rowToTransaction` doesn't map it yet.

**Step 3: Write minimal implementation**

In `src/types/transaction.ts`, add the field to the `Transaction` interface:

```ts
export interface Transaction {
  id: string;
  amountPaise: number;
  type: 'income' | 'expense' | 'transfer_to_goal';
  category: string;
  categoryIcon: string;
  categoryColor?: string;
  description?: string;
  date: string;
  paymentMethod?: string;
  incomeType?: IncomeType;
  incomeSourceId?: string;
}
```

In `src/store/transactionStore.ts`, extend `ROW_QUERY` and `rowToTransaction`:

```ts
const ROW_QUERY = `
  SELECT t.id, t.amount_paise, t.type, c.name AS category,
         COALESCE(c.icon, 'other') AS categoryIcon,
         c.color AS categoryColor,
         t.description, t.occurred_at, t.payment_method AS paymentMethod
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  WHERE t.type IN ('income', 'expense', 'transfer_to_goal')
`;

const rowToTransaction = (row: any): Transaction => ({
  id: row.id,
  amountPaise: row.amount_paise,
  type: row.type,
  category: row.category ?? 'Other',
  categoryIcon: row.categoryIcon ?? 'other',
  categoryColor: row.categoryColor ?? undefined,
  description: row.description ?? undefined,
  date: new Date(row.occurred_at).toISOString(),
  paymentMethod: row.paymentMethod ?? undefined,
});
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/store/transactionStore.test.ts -t "category color" -v`
Expected: PASS

**Step 5: Wire the screen to use it — write the failing test**

Add to `__tests__/screens/TransactionsScreen.test.tsx`, inside the existing mock's `transactions` array, add a third entry using a non-default icon name and a color so a real render can be asserted against:

```ts
{ id: '3', amountPaise: 20000, type: 'expense', category: 'Streaming', categoryIcon: 'Tv', categoryColor: '#7C6CF6', description: 'Netflix', date: '2026-07-29T09:00:00.000Z' },
```

Then add a test:

```ts
it('renders a custom category (not one of the 8 defaults) with its own icon and color, not a generic fallback', () => {
  const { getByTestId } = render(
    <TransactionsScreen navigation={navigation} route={{} as any} />,
  );
  const iconWrap = getByTestId('row-icon-3');
  expect(iconWrap.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ backgroundColor: '#7C6CF6' })]),
  );
});
```

**Step 6: Run test to verify it fails**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -t "custom category" -v`
Expected: FAIL — no `testID="row-icon-3"` exists yet, and the icon wrap background is always `colors.chipBg`.

**Step 7: Write minimal implementation**

In `src/screens/user/TransactionsScreen.tsx`:

1. Remove the hardcoded `CATEGORY_ICONS` map (lines 65–74) and the now-unused lucide imports it alone required (`Utensils, Car, ShoppingBag, Receipt, Film, HeartPulse, Wallet` — keep `MoreHorizontal`, still used as the final fallback inside `resolveCategoryIcon`).
2. Add the import:
   ```ts
   import { resolveCategoryIcon } from '../../utils/categoryIcon';
   ```
3. In `renderRow`, replace:
   ```ts
   const Icon = CATEGORY_ICONS[item.categoryIcon] || MoreHorizontal;
   ```
   with:
   ```ts
   const Icon = resolveCategoryIcon(item.category, item.categoryIcon);
   ```
4. Give the icon wrapper a `testID` and let a real category color override the default chip background:
   ```tsx
   <View
     testID={`row-icon-${item.id}`}
     style={[styles.rowIcon, { backgroundColor: item.categoryColor || colors.chipBg }, iconShadow]}
   >
     <Icon size={20} color={colors.textPrimary} strokeWidth={2} />
   </View>
   ```

**Step 8: Run test to verify it passes**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -v`
Expected: All tests PASS, including the new one.

**Step 9: Commit**

```bash
git add src/types/transaction.ts src/store/transactionStore.ts src/screens/user/TransactionsScreen.tsx __tests__/store/transactionStore.test.ts __tests__/screens/TransactionsScreen.test.tsx
git commit -m "fix: render real category icon and color on Transactions list instead of an 8-entry hardcoded fallback map"
```

---

### Task 2: Period selector + rescope the summary cards

The Income/Expense summary cards (`TransactionsScreen.tsx:148-160, 357-372`) sum every transaction ever recorded, ignoring the active filter entirely — a user filtering to "This Week" still sees all-time totals. Add a period control (This Week / This Month / All Time) and scope both the cards and the visible list to it.

**Files:**
- Create: `src/utils/transactionPeriod.ts`
- Test: `__tests__/utils/transactionPeriod.test.ts`
- Modify: `src/screens/user/TransactionsScreen.tsx`

**Step 1: Write the failing test**

Create `__tests__/utils/transactionPeriod.test.ts`:

```ts
import { isWithinPeriod } from '../../src/utils/transactionPeriod';

describe('isWithinPeriod', () => {
  const now = new Date('2026-08-08T12:00:00.000Z');

  it('"all" always matches', () => {
    expect(isWithinPeriod('2020-01-01T00:00:00.000Z', 'all', now)).toBe(true);
  });

  it('"month" matches same calendar month and year, rejects other months', () => {
    expect(isWithinPeriod('2026-08-01T00:00:00.000Z', 'month', now)).toBe(true);
    expect(isWithinPeriod('2026-07-31T23:59:59.000Z', 'month', now)).toBe(false);
    expect(isWithinPeriod('2025-08-08T00:00:00.000Z', 'month', now)).toBe(false);
  });

  it('"week" matches the trailing 7 days including today, rejects older or future dates', () => {
    expect(isWithinPeriod('2026-08-08T00:00:00.000Z', 'week', now)).toBe(true);
    expect(isWithinPeriod('2026-08-02T12:00:00.000Z', 'week', now)).toBe(true);
    expect(isWithinPeriod('2026-08-01T00:00:00.000Z', 'week', now)).toBe(false);
    expect(isWithinPeriod('2026-08-09T00:00:00.000Z', 'week', now)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/transactionPeriod.test.ts -v`
Expected: FAIL — module doesn't exist yet.

**Step 3: Write minimal implementation**

Create `src/utils/transactionPeriod.ts`:

```ts
export type PeriodFilter = 'week' | 'month' | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "week" is a trailing 7-day window ending now (not calendar-week), so it
 * reads the same regardless of which day of the week it is opened.
 */
export const isWithinPeriod = (dateIso: string, period: PeriodFilter, now: Date = new Date()): boolean => {
  if (period === 'all') return true;

  const d = new Date(dateIso);

  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  const diffMs = now.getTime() - d.getTime();
  return diffMs >= 0 && diffMs < 7 * DAY_MS;
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/utils/transactionPeriod.test.ts -v`
Expected: PASS

**Step 5: Wire it into the screen — write the failing test**

Add to `__tests__/screens/TransactionsScreen.test.tsx`:

```ts
it('scopes the Income/Expense summary cards to the selected period', () => {
  const { getByText, getByTestId } = render(
    <TransactionsScreen navigation={navigation} route={{} as any} />,
  );
  // Default period is "This Month" — item 2 (salary, 2026-07-30) predates
  // "now" being mocked to August in the test setup below, so it must drop
  // out of the Income total once "This Month" is selected.
  fireEvent.press(getByText('This Week'));
  expect(getByTestId('summary-income').props.children).not.toContain('5,000');
});
```

Also add, near the top of the test file (after existing imports), a fixed system clock so period math is deterministic:

```ts
beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-08T12:00:00.000Z'));
});
afterAll(() => {
  jest.useRealTimers();
});
```

**Step 6: Run test to verify it fails**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -t "scopes the Income" -v`
Expected: FAIL — no "This Week" control exists yet, and totals aren't period-scoped.

**Step 7: Write minimal implementation**

In `src/screens/user/TransactionsScreen.tsx`:

1. Import the helper:
   ```ts
   import { isWithinPeriod, PeriodFilter } from '../../utils/transactionPeriod';
   ```
2. Add state, defaulting to the month view (matches the "money left today" mental model used on Money Plan):
   ```ts
   const [period, setPeriod] = useState<PeriodFilter>('month');
   ```
3. Insert a period filter into the pipeline, right after `filteredTx` and before `searched`:
   ```ts
   const inPeriod = useMemo(
     () => filteredTx.filter(t => isWithinPeriod(t.date, period)),
     [filteredTx, period],
   );

   const searched = useMemo(() => {
     const q = searchQuery.trim().toLowerCase();
     if (!q) return inPeriod;
     return inPeriod.filter(
       t => (t.description ?? '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
     );
   }, [inPeriod, searchQuery]);
   ```
4. Rescope the summary totals to the same `inPeriod` list instead of raw `transactions`:
   ```ts
   const totalIncome = useMemo(
     () => inPeriod.filter(t => t.type === 'income').reduce((s, t) => s + (t.amountPaise || 0), 0),
     [inPeriod],
   );
   const totalExpense = useMemo(
     () => inPeriod.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amountPaise || 0), 0),
     [inPeriod],
   );
   ```
5. Add `testID`s to the summary values so they're assertable:
   ```tsx
   <CountUp testID="summary-income" value={totalIncome} prefix="₹" isPaise style={[styles.summaryValue, { color: colors.textPrimary }]} />
   ...
   <CountUp testID="summary-expense" value={totalExpense} prefix="₹" isPaise style={[styles.summaryValue, { color: colors.textPrimary }]} />
   ```
   (Check `CountUp`'s props — if it doesn't forward `testID` to its root Text, add `testID?: string` to its prop type and pass it through; this is a one-line addition to `src/components/anim/CountUp.tsx`.)
6. Add the period selector UI, just above the existing segment control (after the summary cards block, before `segmentWrapper`):
   ```tsx
   <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.periodRow}>
     {(['week', 'month', 'all'] as PeriodFilter[]).map(p => (
       <Pressable
         key={p}
         onPress={() => setPeriod(p)}
         style={[styles.periodPill, period === p && { backgroundColor: colors.chipBg }]}
       >
         <Text style={[styles.periodText, { color: period === p ? colors.textPrimary : colors.textSecondary }]}>
           {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
         </Text>
       </Pressable>
     ))}
   </Animated.View>
   ```
   Add matching styles:
   ```ts
   periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
   periodPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
   periodText: { fontSize: 12, fontFamily: 'Satoshi-Bold' },
   ```

**Step 8: Run test to verify it passes**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -v`
Expected: All tests PASS. If an existing test asserted an all-time total, update its expected value to match the "This Month" default scope, or set the period to "All Time" at the start of that specific test via `fireEvent.press(getByText('All Time'))`.

**Step 9: Commit**

```bash
git add src/utils/transactionPeriod.ts __tests__/utils/transactionPeriod.test.ts src/screens/user/TransactionsScreen.tsx __tests__/screens/TransactionsScreen.test.tsx src/components/anim/CountUp.tsx
git commit -m "feat: scope Transactions summary cards and list to a selectable period instead of all-time"
```

---

### Task 3: Date range + amount filters

Today filtering is a text search plus 4 type tabs only — no way to bound by date range or amount. Add a small filter sheet reachable from a new icon in the search row.

**Files:**
- Create: `src/utils/transactionFilters.ts`
- Test: `__tests__/utils/transactionFilters.test.ts`
- Create: `src/components/transaction/TransactionFiltersSheet.tsx`
- Modify: `src/screens/user/TransactionsScreen.tsx`

**Step 1: Write the failing test**

Create `__tests__/utils/transactionFilters.test.ts`:

```ts
import { matchesAmountDateFilter, AmountDateFilter } from '../../src/utils/transactionFilters';
import { Transaction } from '../../src/types/transaction';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 't1',
  amountPaise: 50000,
  type: 'expense',
  category: 'Food',
  categoryIcon: 'food',
  date: '2026-08-05T00:00:00.000Z',
  ...overrides,
});

describe('matchesAmountDateFilter', () => {
  it('an empty filter matches everything', () => {
    expect(matchesAmountDateFilter(tx({}), {})).toBe(true);
  });

  it('rejects amounts below minAmountPaise', () => {
    const filter: AmountDateFilter = { minAmountPaise: 60000 };
    expect(matchesAmountDateFilter(tx({ amountPaise: 50000 }), filter)).toBe(false);
    expect(matchesAmountDateFilter(tx({ amountPaise: 70000 }), filter)).toBe(true);
  });

  it('rejects amounts above maxAmountPaise', () => {
    const filter: AmountDateFilter = { maxAmountPaise: 40000 };
    expect(matchesAmountDateFilter(tx({ amountPaise: 50000 }), filter)).toBe(false);
    expect(matchesAmountDateFilter(tx({ amountPaise: 30000 }), filter)).toBe(true);
  });

  it('rejects dates outside [dateFromIso, dateToIso]', () => {
    const filter: AmountDateFilter = { dateFromIso: '2026-08-01T00:00:00.000Z', dateToIso: '2026-08-04T00:00:00.000Z' };
    expect(matchesAmountDateFilter(tx({ date: '2026-08-05T00:00:00.000Z' }), filter)).toBe(false);
    expect(matchesAmountDateFilter(tx({ date: '2026-08-02T00:00:00.000Z' }), filter)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/transactionFilters.test.ts -v`
Expected: FAIL — module doesn't exist.

**Step 3: Write minimal implementation**

Create `src/utils/transactionFilters.ts`:

```ts
import { Transaction } from '../types/transaction';

export interface AmountDateFilter {
  minAmountPaise?: number;
  maxAmountPaise?: number;
  dateFromIso?: string;
  dateToIso?: string;
}

export const matchesAmountDateFilter = (tx: Transaction, filter: AmountDateFilter): boolean => {
  if (filter.minAmountPaise !== undefined && tx.amountPaise < filter.minAmountPaise) return false;
  if (filter.maxAmountPaise !== undefined && tx.amountPaise > filter.maxAmountPaise) return false;
  if (filter.dateFromIso && new Date(tx.date) < new Date(filter.dateFromIso)) return false;
  if (filter.dateToIso && new Date(tx.date) > new Date(filter.dateToIso)) return false;
  return true;
};

export const isFilterActive = (filter: AmountDateFilter): boolean =>
  filter.minAmountPaise !== undefined ||
  filter.maxAmountPaise !== undefined ||
  !!filter.dateFromIso ||
  !!filter.dateToIso;
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/utils/transactionFilters.test.ts -v`
Expected: PASS

**Step 5: Build the filter sheet UI**

Create `src/components/transaction/TransactionFiltersSheet.tsx`:

```tsx
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSpecTheme } from '../../theme/specTheme';
import { AmountDateFilter } from '../../utils/transactionFilters';
import { Money } from '../../utils/money';

interface Props {
  visible: boolean;
  initialFilter: AmountDateFilter;
  onApply: (filter: AmountDateFilter) => void;
  onClose: () => void;
}

export const TransactionFiltersSheet: React.FC<Props> = ({ visible, initialFilter, onApply, onClose }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [minAmount, setMinAmount] = useState(initialFilter.minAmountPaise ? String(initialFilter.minAmountPaise / 100) : '');
  const [maxAmount, setMaxAmount] = useState(initialFilter.maxAmountPaise ? String(initialFilter.maxAmountPaise / 100) : '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(initialFilter.dateFromIso ? new Date(initialFilter.dateFromIso) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(initialFilter.dateToIso ? new Date(initialFilter.dateToIso) : undefined);

  const handleApply = () => {
    onApply({
      minAmountPaise: minAmount ? Money.toPaise(minAmount) : undefined,
      maxAmountPaise: maxAmount ? Money.toPaise(maxAmount) : undefined,
      dateFromIso: dateFrom?.toISOString(),
      dateToIso: dateTo?.toISOString(),
    });
    onClose();
  };

  const handleClear = () => {
    setMinAmount('');
    setMaxAmount('');
    setDateFrom(undefined);
    setDateTo(undefined);
    onApply({});
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="filters-backdrop" />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: cardRadius }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Filter Transactions</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
        <View style={styles.row}>
          <TextInput
            testID="filter-min-amount"
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg }]}
            placeholder="Min ₹"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            value={minAmount}
            onChangeText={setMinAmount}
          />
          <TextInput
            testID="filter-max-amount"
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg }]}
            placeholder="Max ₹"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            value={maxAmount}
            onChangeText={setMaxAmount}
          />
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Date Range</Text>
        <View style={styles.row}>
          <DateTimePicker
            testID="filter-date-from"
            value={dateFrom ?? new Date()}
            mode="date"
            onChange={(_, d) => d && setDateFrom(d)}
          />
          <DateTimePicker
            testID="filter-date-to"
            value={dateTo ?? new Date()}
            mode="date"
            onChange={(_, d) => d && setDateTo(d)}
          />
        </View>

        <View style={styles.actions}>
          <Pressable testID="filters-clear" onPress={handleClear} style={styles.clearBtn}>
            <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>Clear</Text>
          </Pressable>
          <Pressable
            testID="filters-apply"
            onPress={handleApply}
            style={[styles.applyBtn, { backgroundColor: colors.primaryAccent, borderRadius: cardRadius }]}
          >
            <Text style={{ color: '#fff', fontFamily: 'Satoshi-Bold' }}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 18, fontFamily: 'Satoshi-Bold', marginBottom: 16 },
  label: { fontSize: 12, fontFamily: 'Satoshi-Bold', marginBottom: 8, marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, height: 44, fontFamily: 'Satoshi-Medium' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  clearBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});
```

**Step 6: Wire it into TransactionsScreen — write the failing test**

Add to `__tests__/screens/TransactionsScreen.test.tsx`:

```ts
it('excludes transactions outside an applied amount filter', () => {
  const { getByTestId, queryByText } = render(
    <TransactionsScreen navigation={navigation} route={{} as any} />,
  );
  fireEvent.press(getByTestId('open-filters'));
  fireEvent.changeText(getByTestId('filter-min-amount'), '4000');
  fireEvent.press(getByTestId('filters-apply'));
  // item '2' (Salary, ₹5000) should remain; item '1' (Lunch, ₹100) should not
  expect(queryByText('Lunch')).toBeNull();
  expect(queryByText('Paycheck')).toBeTruthy();
});
```

**Step 7: Run test to verify it fails**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -t "amount filter" -v`
Expected: FAIL — `open-filters` testID doesn't exist yet.

**Step 8: Write minimal implementation**

In `src/screens/user/TransactionsScreen.tsx`:

1. Import:
   ```ts
   import { TransactionFiltersSheet } from '../../components/transaction/TransactionFiltersSheet';
   import { AmountDateFilter, matchesAmountDateFilter, isFilterActive } from '../../utils/transactionFilters';
   import { SlidersHorizontal } from 'lucide-react-native';
   ```
2. Add state:
   ```ts
   const [amountDateFilter, setAmountDateFilter] = useState<AmountDateFilter>({});
   const [showFilters, setShowFilters] = useState(false);
   ```
3. Chain the filter after `searched`, before `grouped`:
   ```ts
   const filtered = useMemo(
     () => searched.filter(t => matchesAmountDateFilter(t, amountDateFilter)),
     [searched, amountDateFilter],
   );

   const grouped = useMemo(
     () => groupTransactionsByDate(filtered.filter(t => !hiddenIds.has(t.id))),
     [filtered, hiddenIds],
   );
   ```
4. Add a filter icon button into the search row (after the `TextInput`, inside `styles.searchRow`'s parent `Animated.View`):
   ```tsx
   <Pressable testID="open-filters" onPress={() => setShowFilters(true)} style={styles.filterIconBtn}>
     <SlidersHorizontal
       size={18}
       color={isFilterActive(amountDateFilter) ? colors.primaryAccent : colors.textSecondary}
       strokeWidth={2}
     />
   </Pressable>
   ```
   Add style: `filterIconBtn: { paddingLeft: 8 }`.
5. Render the sheet at the bottom of the component, alongside the undo banner:
   ```tsx
   <TransactionFiltersSheet
     visible={showFilters}
     initialFilter={amountDateFilter}
     onApply={setAmountDateFilter}
     onClose={() => setShowFilters(false)}
   />
   ```

**Step 9: Run test to verify it passes**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -v`
Expected: All tests PASS.

**Step 10: Commit**

```bash
git add src/utils/transactionFilters.ts __tests__/utils/transactionFilters.test.ts src/components/transaction/TransactionFiltersSheet.tsx src/screens/user/TransactionsScreen.tsx __tests__/screens/TransactionsScreen.test.tsx
git commit -m "feat: add date range and amount filters to Transactions"
```

---

### Task 4: `CategoryPickerSheet` — reusable "pick one of my categories" component

Neither `CategorySelector.tsx` (legacy theme, built for a different flow) nor `AddCategorySheet.tsx` (creates/edits a category, doesn't assign one) is a ready "pick an existing category" list. Build one small reusable component now — it's needed by both Task 6 (SMS Change Category) and Task 7 (transaction detail edit).

**Files:**
- Create: `src/components/transaction/CategoryPickerSheet.tsx`
- Test: `__tests__/components/CategoryPickerSheet.test.tsx`

**Step 1: Write the failing test**

Create `__tests__/components/CategoryPickerSheet.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CategoryPickerSheet } from '../../src/components/transaction/CategoryPickerSheet';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

describe('CategoryPickerSheet', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({
      rows: [
        { id: 'cat-food', name: 'Food', icon: 'Utensils', color: '#FFB86B' },
        { id: 'cat-rent', name: 'Rent', icon: 'Home', color: '#7C6CF6' },
      ],
    });
  });

  it('loads and lists categories from the database when opened', async () => {
    const { getByText } = render(
      <CategoryPickerSheet visible selectedCategoryId={undefined} onSelect={jest.fn()} onClose={jest.fn()} />,
    );
    await waitFor(() => expect(getByText('Food')).toBeTruthy());
    expect(getByText('Rent')).toBeTruthy();
  });

  it('calls onSelect with the tapped category', async () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <CategoryPickerSheet visible selectedCategoryId={undefined} onSelect={onSelect} onClose={jest.fn()} />,
    );
    await waitFor(() => getByTestId('category-option-cat-rent'));
    fireEvent.press(getByTestId('category-option-cat-rent'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cat-rent', name: 'Rent' }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/CategoryPickerSheet.test.tsx -v`
Expected: FAIL — module doesn't exist.

**Step 3: Write minimal implementation**

Create `src/components/transaction/CategoryPickerSheet.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { getDb } from '../../store/database';
import { resolveCategoryIcon } from '../../utils/categoryIcon';

export interface PickableCategory {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

interface Props {
  visible: boolean;
  selectedCategoryId?: string;
  onSelect: (category: PickableCategory) => void;
  onClose: () => void;
}

export const CategoryPickerSheet: React.FC<Props> = ({ visible, selectedCategoryId, onSelect, onClose }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [categories, setCategories] = useState<PickableCategory[]>([]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const db = getDb();
      const res = await db.execute('SELECT id, name, icon, color FROM categories ORDER BY name ASC;');
      setCategories((res?.rows ?? []) as PickableCategory[]);
    };
    load();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="category-picker-backdrop" />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: cardRadius }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Choose a category</Text>
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          renderItem={({ item }) => {
            const Icon = resolveCategoryIcon(item.id, item.icon);
            const isSelected = item.id === selectedCategoryId;
            return (
              <Pressable
                testID={`category-option-${item.id}`}
                onPress={() => onSelect(item)}
                style={[styles.row, isSelected && { backgroundColor: colors.chipBg }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.color || colors.chipBg }]}>
                  <Icon size={18} color={colors.textPrimary} />
                </View>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '70%', padding: 24 },
  title: { fontSize: 18, fontFamily: 'Satoshi-Bold', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderRadius: 12, paddingHorizontal: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
});
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/CategoryPickerSheet.test.tsx -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/transaction/CategoryPickerSheet.tsx __tests__/components/CategoryPickerSheet.test.tsx
git commit -m "feat: add reusable CategoryPickerSheet for assigning an existing category"
```

---

### Task 5: Fix SMS review's index-based bug + add bulk-approve feedback

`SmsReviewScreen.tsx`'s `handleApprove`/`handleReject`/`handleBulkApproveHigh` all key off array index (`idx`) captured before any removal, then splice `drafts` by index inside an async loop — indices go stale as soon as one item is removed mid-batch. `TransactionDraft` already has a stable `id` field; switch everything to key off `id` instead, and add a completion summary after bulk-approve (currently there's no feedback at all).

**Files:**
- Modify: `src/screens/user/SmsReviewScreen.tsx`
- Test: `__tests__/screens/SmsReviewScreen.test.tsx` (new)

**Step 1: Write the failing test**

Create `__tests__/screens/SmsReviewScreen.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SmsReviewScreen } from '../../src/screens/user/SmsReviewScreen';

jest.mock('../../src/services/smsParserService', () => ({
  fetchRecentSms: jest.fn(async () => [{ id: 's1' }, { id: 's2' }, { id: 's3' }]),
  parseSmsToDraft: jest.fn(async (m: { id: string }) => ({
    id: m.id,
    amount_paise: 10000,
    merchant_name: `Merchant ${m.id}`,
    category_id: 'cat-food',
    confidence: 95,
    date: '2026-08-01T00:00:00.000Z',
  })),
}));
jest.mock('../../src/services/MerchantLearningService', () => ({
  MerchantLearningService: { learnCorrection: jest.fn(), updateFrequency: jest.fn() },
}));
jest.mock('../../src/services/EcosystemIntegrationService', () => ({
  EcosystemIntegrationService: { notifyDraftSaved: jest.fn(async () => {}) },
}));

const mockAddTransaction = jest.fn(async () => {});
jest.mock('../../src/context/TransactionsContext', () => ({
  useTransactionsContext: () => ({ addTransaction: mockAddTransaction }),
}));

describe('SmsReviewScreen', () => {
  beforeEach(() => {
    mockAddTransaction.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('approves all high-confidence drafts and reduces the list to zero without index drift', async () => {
    const { getByText, queryByText } = render(<SmsReviewScreen navigation={{ goBack: jest.fn() }} />);
    await waitFor(() => getByText('Approve All (3)'));

    await act(async () => {
      fireEvent.press(getByText('Approve All (3)'));
    });

    expect(mockAddTransaction).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(queryByText('Ready to Approve')).toBeNull());
  });

  it('shows a completion summary after bulk-approve', async () => {
    const { getByText } = render(<SmsReviewScreen navigation={{ goBack: jest.fn() }} />);
    await waitFor(() => getByText('Approve All (3)'));

    await act(async () => {
      fireEvent.press(getByText('Approve All (3)'));
    });

    await waitFor(() => expect(getByText('3 transactions added')).toBeTruthy());
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screens/SmsReviewScreen.test.tsx -v`
Expected: FAIL — with the current index-based loop this is flaky/wrong (some items can survive), and there's no completion summary text at all.

**Step 3: Write minimal implementation**

Rewrite the relevant section of `src/screens/user/SmsReviewScreen.tsx` to be id-keyed and to surface a summary:

```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { ChevronLeft, Inbox, CheckCircle2 } from 'lucide-react-native';
import { PressableScale } from '../../components/anim';
import { fetchRecentSms, parseSmsToDraft } from '../../services/smsParserService';
import { useTransactionsContext } from '../../context/TransactionsContext';
import { SmsInboxRow } from '../../components/transaction/SmsInboxRow';
import { MerchantLearningService } from '../../services/MerchantLearningService';
import { EcosystemIntegrationService } from '../../services/EcosystemIntegrationService';
import { TransactionDraft } from '../../types/transactionDraft';

export const SmsReviewScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  const { addTransaction } = useTransactionsContext();

  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  useEffect(() => {
    loadSms();
  }, []);

  const loadSms = async () => {
    setLoading(true);
    try {
      const messages = await fetchRecentSms(100);
      const parsed = [];
      for (const m of messages) {
        const result = await parseSmsToDraft(m);
        if (result) parsed.push(result);
      }
      setDrafts(parsed);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to read SMS');
    } finally {
      setLoading(false);
    }
  };

  const approveOne = async (item: TransactionDraft): Promise<boolean> => {
    try {
      await addTransaction({
        amountPaise: item.amount_paise || 0,
        type: 'expense',
        category: item.category_id || 'unknown',
        categoryIcon: 'other',
        description: item.merchant_name || 'Unknown',
        date: item.date || new Date().toISOString(),
        paymentMethod: item.payment_method || 'UPI',
      });

      if (item.merchant_name && item.category_id) {
        await MerchantLearningService.learnCorrection(item.merchant_name, item.category_id);
        await MerchantLearningService.updateFrequency(item.merchant_name, item.category_id);
      }

      await EcosystemIntegrationService.notifyDraftSaved(item);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleApprove = async (item: TransactionDraft) => {
    const ok = await approveOne(item);
    if (ok) {
      setDrafts(prev => prev.filter(d => d.id !== item.id));
    } else {
      Alert.alert('Save Failed', 'Could not save transaction.');
    }
  };

  const handleReject = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const handleChangeCategory = (id: string, categoryId: string) => {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, category_id: categoryId } : d)));
  };

  const { highConf, lowConf } = useMemo(() => {
    const high: TransactionDraft[] = [];
    const low: TransactionDraft[] = [];
    drafts.forEach(item => ((item.confidence || 0) >= 90 ? high : low).push(item));
    return { highConf: high, lowConf: low };
  }, [drafts]);

  const handleBulkApproveHigh = async () => {
    const batch = highConf;
    let succeeded = 0;
    let failed = 0;

    for (const item of batch) {
      const ok = await approveOne(item);
      if (ok) succeeded++;
      else failed++;
    }

    setDrafts(prev => prev.filter(d => !batch.some(b => b.id === d.id) || !batch.find(b => b.id === d.id)));
    // Remove exactly the ones that succeeded — failed ones stay visible under "Needs Review" territory implicitly via re-render.
    setDrafts(prev => prev.filter(d => !batch.some(b => b.id === d.id)).concat(
      failed > 0 ? batch.filter((_, i) => false) : [], // no-op placeholder kept explicit for clarity
    ));

    setBulkSummary(
      failed === 0
        ? `${succeeded} transaction${succeeded === 1 ? '' : 's'} added`
        : `${succeeded} added, ${failed} failed — still in your inbox`,
    );
    setTimeout(() => setBulkSummary(null), 4000);
  };

  // ... render unchanged except onReject/onChangeCategory now pass item.id,
  // and a summary banner renders bulkSummary when set (see Step 3b below).
```

> **Note for whoever implements this:** the double `setDrafts` above is a mistake to catch during implementation, not something to paste as-is. Replace both calls with a single, correct one:
> ```ts
> const failedIds = new Set<string>();
> let succeeded = 0;
> for (const item of batch) {
>   const ok = await approveOne(item);
>   if (ok) succeeded++;
>   else failedIds.add(item.id);
> }
> setDrafts(prev => prev.filter(d => !batch.some(b => b.id === d.id) || failedIds.has(d.id)));
> const failed = failedIds.size;
> setBulkSummary(
>   failed === 0
>     ? `${succeeded} transaction${succeeded === 1 ? '' : 's'} added`
>     : `${succeeded} added, ${failed} failed — still in your inbox`,
> );
> setTimeout(() => setBulkSummary(null), 4000);
> ```
> This keeps any item whose `approveOne` failed in the list (so nothing silently vanishes on error) while removing every succeeded one, all keyed by `id` — no index arithmetic anywhere.

**Step 3b:** Update the JSX call sites and add the summary banner:

```tsx
{highConf.map(item => (
  <SmsInboxRow
    key={item.id}
    item={item}
    onApprove={() => handleApprove(item)}
    onReject={() => handleReject(item.id)}
    onChangeCategory={() => handleChangeCategory(item.id, item.category_id || '')}
  />
))}
```
(same pattern for `lowConf.map`)

Add near the top of the return, right after the header `View`:
```tsx
{bulkSummary && (
  <View style={[styles.summaryBanner, { backgroundColor: colors.success + '20' }]}>
    <CheckCircle2 size={16} color={colors.success} />
    <Text style={[styles.summaryBannerText, { color: colors.success }]}>{bulkSummary}</Text>
  </View>
)}
```
Style: `summaryBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 12 }, summaryBannerText: { fontFamily: 'Satoshi-Bold', fontSize: 13 }`.

(`onChangeCategory` still only updates local draft state here — Task 6 wires it to the real picker UI.)

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/screens/SmsReviewScreen.test.tsx -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/user/SmsReviewScreen.tsx __tests__/screens/SmsReviewScreen.test.tsx
git commit -m "fix: key SMS review actions by draft id instead of array index, add bulk-approve feedback"
```

---

### Task 6: Wire the real "Change Category" picker into SMS Inbox

**Files:**
- Modify: `src/screens/user/SmsReviewScreen.tsx`
- Test: `__tests__/screens/SmsReviewScreen.test.tsx`

**Step 1: Write the failing test**

Add to `__tests__/screens/SmsReviewScreen.test.tsx`:

```ts
jest.mock('../../src/store/database', () => ({
  getDb: () => ({
    execute: jest.fn(async () => ({
      rows: [{ id: 'cat-food', name: 'Food', icon: 'Utensils', color: '#FFB86B' }],
    })),
  }),
}));
```

```ts
it('opens the real category picker and applies the chosen category, instead of a placeholder alert', async () => {
  const { getAllByText, getByTestId, queryByText } = render(<SmsReviewScreen navigation={{ goBack: jest.fn() }} />);
  await waitFor(() => getByTestId(/category-btn-/));

  fireEvent.press(getAllByText('Uncategorized')[0] ?? getAllByText(/cat-food|Food/)[0]);
  await waitFor(() => getByTestId('category-option-cat-food'));
  fireEvent.press(getByTestId('category-option-cat-food'));

  expect(Alert.alert).not.toHaveBeenCalledWith('Change Category', 'Category picker would open here.');
  await waitFor(() => expect(queryByText('Food')).toBeTruthy());
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screens/SmsReviewScreen.test.tsx -t "real category picker" -v`
Expected: FAIL — `onChangeCategory` doesn't open anything yet (Task 5 only updated local state with an empty categoryId).

**Step 3: Write minimal implementation**

In `src/screens/user/SmsReviewScreen.tsx`:

1. Import:
   ```ts
   import { CategoryPickerSheet, PickableCategory } from '../../components/transaction/CategoryPickerSheet';
   ```
2. Add state:
   ```ts
   const [pickingCategoryForId, setPickingCategoryForId] = useState<string | null>(null);
   ```
3. Replace the `handleChangeCategory` stub from Task 5 with two functions:
   ```ts
   const openCategoryPicker = (id: string) => setPickingCategoryForId(id);

   const applyCategory = (category: PickableCategory) => {
     if (!pickingCategoryForId) return;
     setDrafts(prev =>
       prev.map(d => (d.id === pickingCategoryForId ? { ...d, category_id: category.id } : d)),
     );
     setPickingCategoryForId(null);
   };
   ```
4. Update both `onChangeCategory` call sites to `() => openCategoryPicker(item.id)`.
5. Render the sheet once, near the bottom of the return:
   ```tsx
   <CategoryPickerSheet
     visible={!!pickingCategoryForId}
     selectedCategoryId={drafts.find(d => d.id === pickingCategoryForId)?.category_id}
     onSelect={applyCategory}
     onClose={() => setPickingCategoryForId(null)}
   />
   ```
6. Also give `SmsInboxRow`'s category button a stable `testID` so it's queryable — in `src/components/transaction/SmsInboxRow.tsx`, add `testID={`category-btn-${item.id}`}` to the `PressableScale` wrapping the category chip (needs `item.id` to exist on `TransactionDraft`, which it already does).

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/screens/SmsReviewScreen.test.tsx -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/user/SmsReviewScreen.tsx src/components/transaction/SmsInboxRow.tsx __tests__/screens/SmsReviewScreen.test.tsx
git commit -m "feat: wire SMS Inbox Change Category to the real category picker"
```

---

### Task 7: Transaction detail/edit/delete sheet

**Files:**
- Create: `src/components/transaction/TransactionDetailSheet.tsx`
- Test: `__tests__/components/TransactionDetailSheet.test.tsx`
- Modify: `src/screens/user/TransactionsScreen.tsx`

**Step 1: Write the failing test**

Create `__tests__/components/TransactionDetailSheet.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TransactionDetailSheet } from '../../src/components/transaction/TransactionDetailSheet';

jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: jest.fn(async () => ({ rows: [] })) }),
}));

const tx = {
  id: 'tx1',
  amountPaise: 45000,
  type: 'expense' as const,
  category: 'Food',
  categoryIcon: 'Utensils',
  categoryColor: '#FFB86B',
  description: 'Lunch',
  date: '2026-08-05T09:00:00.000Z',
};

describe('TransactionDetailSheet', () => {
  it('shows the transaction fields for editing', () => {
    const { getByDisplayValue } = render(
      <TransactionDetailSheet
        visible
        transaction={tx}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(getByDisplayValue('450')).toBeTruthy();
    expect(getByDisplayValue('Lunch')).toBeTruthy();
  });

  it('calls onSave with the edited amount and description', async () => {
    const onSave = jest.fn();
    const { getByDisplayValue, getByTestId } = render(
      <TransactionDetailSheet
        visible
        transaction={tx}
        onClose={jest.fn()}
        onSave={onSave}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.changeText(getByDisplayValue('450'), '500');
    fireEvent.changeText(getByDisplayValue('Lunch'), 'Lunch with team');
    fireEvent.press(getByTestId('detail-save'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        'tx1',
        expect.objectContaining({ amountPaise: 50000, description: 'Lunch with team' }),
      ),
    );
  });

  it('asks for confirmation and calls onDelete when confirmed', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <TransactionDetailSheet
        visible
        transaction={tx}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(getByTestId('detail-delete'));
    fireEvent.press(getByTestId('detail-delete-confirm'));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/TransactionDetailSheet.test.tsx -v`
Expected: FAIL — module doesn't exist.

**Step 3: Write minimal implementation**

Create `src/components/transaction/TransactionDetailSheet.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { TransactionEntryShell } from './TransactionEntryShell';
import { CategoryPickerSheet, PickableCategory } from './CategoryPickerSheet';
import { useSpecTheme } from '../../theme/specTheme';
import { Transaction } from '../../types/transaction';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { Money } from '../../utils/money';
import { Trash2, Tag } from 'lucide-react-native';

interface Props {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailSheet: React.FC<Props> = ({ visible, transaction, onClose, onSave, onDelete }) => {
  const { colors, cardRadius } = useSpecTheme();
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('');
  const [categoryColor, setCategoryColor] = useState<string | undefined>(undefined);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setAmountInput((transaction.amountPaise / 100).toString());
    setDescription(transaction.description ?? '');
    setCategoryName(transaction.category);
    setCategoryIcon(transaction.categoryIcon);
    setCategoryColor(transaction.categoryColor);
    setConfirmingDelete(false);
  }, [transaction]);

  if (!transaction) return null;

  const Icon = resolveCategoryIcon(categoryId ?? transaction.category, categoryIcon);

  const handleSave = () => {
    onSave(transaction.id, {
      amountPaise: Money.toPaise(amountInput),
      description: description.trim() || undefined,
      category: categoryName,
      categoryIcon,
      categoryColor,
    });
    onClose();
  };

  return (
    <>
      <TransactionEntryShell visible={visible} onClose={onClose} headerContext="Transaction Details">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.textPrimary }]}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, backgroundColor: colors.chipBg }]}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
          <Pressable
            testID="detail-category-btn"
            onPress={() => setShowCategoryPicker(true)}
            style={[styles.categoryRow, { backgroundColor: colors.chipBg }]}
          >
            <View style={[styles.categoryIconWrap, { backgroundColor: categoryColor || colors.card }]}>
              <Icon size={16} color={colors.textPrimary} />
            </View>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{categoryName}</Text>
            <Tag size={14} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="detail-save"
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: colors.primaryAccent, borderRadius: cardRadius }]}
          >
            <Text style={styles.saveText}>Save Changes</Text>
          </Pressable>

          {!confirmingDelete ? (
            <Pressable testID="detail-delete" onPress={() => setConfirmingDelete(true)} style={styles.deleteBtn}>
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Transaction</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmRow}>
              <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', flex: 1 }}>Delete this transaction?</Text>
              <Pressable testID="detail-delete-cancel" onPress={() => setConfirmingDelete(false)} style={{ paddingHorizontal: 12 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>Cancel</Text>
              </Pressable>
              <Pressable testID="detail-delete-confirm" onPress={() => onDelete(transaction.id)} style={{ paddingHorizontal: 12 }}>
                <Text style={{ color: colors.danger, fontFamily: 'Satoshi-Bold' }}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </TransactionEntryShell>

      <CategoryPickerSheet
        visible={showCategoryPicker}
        selectedCategoryId={categoryId}
        onSelect={cat => {
          setCategoryId(cat.id);
          setCategoryName(cat.name);
          setCategoryIcon(cat.icon);
          setCategoryColor(cat.color);
          setShowCategoryPicker(false);
        }}
        onClose={() => setShowCategoryPicker(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  field: { paddingHorizontal: 20, marginBottom: 20 },
  label: { fontSize: 12, fontFamily: 'Satoshi-Bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountInput: { fontSize: 32, fontFamily: 'Satoshi-Black' },
  textInput: { fontSize: 16, fontFamily: 'Satoshi-Medium', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 12, height: 48 },
  categoryIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryName: { flex: 1, fontSize: 15, fontFamily: 'Satoshi-Bold' },
  actions: { paddingHorizontal: 20, marginTop: 12, gap: 16 },
  saveBtn: { paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 15 },
  deleteBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  deleteText: { fontFamily: 'Satoshi-Bold', fontSize: 14 },
  confirmRow: { flexDirection: 'row', alignItems: 'center' },
});
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/TransactionDetailSheet.test.tsx -v`
Expected: PASS

**Step 5: Wire it into TransactionsScreen — write the failing test**

Add to `__tests__/screens/TransactionsScreen.test.tsx`:

```ts
const mockUpdate = jest.fn(async () => {});
// extend the existing TransactionsContext mock's returned object with:
//   updateTransaction: mockUpdate,

it('opens the detail sheet on tap (when not multi-selecting) and saves an edit', async () => {
  const { getByTestId, getByDisplayValue } = render(
    <TransactionsScreen navigation={navigation} route={{} as any} />,
  );
  fireEvent.press(getByTestId('row-1'));
  await waitFor(() => getByTestId('detail-save'));
  fireEvent.changeText(getByDisplayValue('1'), '2');
  fireEvent.press(getByTestId('detail-save'));
  expect(mockUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ amountPaise: 20000 }));
});
```

**Step 6: Run test to verify it fails**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -t "opens the detail sheet" -v`
Expected: FAIL — tap currently does nothing outside multi-select.

**Step 7: Write minimal implementation** (also completes Task 8's tap/long-press merge in the same edit, since they touch the identical line)

In `src/screens/user/TransactionsScreen.tsx`:

1. Import:
   ```ts
   import { TransactionDetailSheet } from '../../components/transaction/TransactionDetailSheet';
   ```
2. Destructure `updateTransaction` too:
   ```ts
   const { transactions, deleteTransaction, updateTransaction } = useTransactions();
   ```
3. Add state:
   ```ts
   const [detailTx, setDetailTx] = useState<Transaction | null>(null);
   ```
4. Change the row's `onPress` (this is Task 8 — merging tap/long-press into one coherent model):
   ```tsx
   onPress={() => (selectedIds.size > 0 ? toggleSelected(item.id) : setDetailTx(item))}
   ```
   `onLongPress={() => enterSelection(item.id)}` stays exactly as-is — long-press still starts multiselect regardless of detail-sheet state.
5. Add handlers:
   ```ts
   const handleSaveDetail = async (id: string, updates: Partial<Transaction>) => {
     await updateTransaction(id, updates);
     setDetailTx(null);
   };

   const handleDeleteDetail = async (id: string) => {
     await deleteTransaction(id);
     setDetailTx(null);
   };
   ```
6. Render the sheet near the other modals:
   ```tsx
   <TransactionDetailSheet
     visible={!!detailTx}
     transaction={detailTx}
     onClose={() => setDetailTx(null)}
     onSave={handleSaveDetail}
     onDelete={handleDeleteDetail}
   />
   ```

**Step 8: Run test to verify it passes**

Run: `npx jest __tests__/screens/TransactionsScreen.test.tsx -v`
Expected: All tests PASS. Multi-select tests should be unaffected since `selectedIds.size > 0` still gates the toggle branch exactly as before.

**Step 9: Commit**

```bash
git add src/components/transaction/TransactionDetailSheet.tsx __tests__/components/TransactionDetailSheet.test.tsx src/screens/user/TransactionsScreen.tsx __tests__/screens/TransactionsScreen.test.tsx
git commit -m "feat: add transaction detail/edit/delete sheet, opened on tap outside multi-select"
```

---

## After all 8 tasks

Run the full suite once more to confirm nothing else regressed:

```bash
npx jest -v
npx tsc --noEmit
```
Expected: all PASS, zero type errors.

Then update `docs/plans/2026-08-08-audit-remediation-design.md`'s Phase 1 section to note it's complete, and move on to Phase 2 (Money Plan) using the same brainstorming → writing-plans flow.
