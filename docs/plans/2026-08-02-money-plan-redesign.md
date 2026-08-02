# Money Plan Screen Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Money Plan screen (`BudgetScreen.tsx`) from a static percent-editor into a real, data-driven financial planner — real bucket totals, real top-spending categories, a real 0–100 score, real outcome-based lifestyle presets, and real 3/6/12-month projections. No fake or hardcoded numbers anywhere.

**Architecture:** Follows the `CategoryIntelligenceShell` pattern this codebase already validated: a thin screen wrapper (`BudgetScreen.tsx`) renders a shell component (`MoneyPlanShell.tsx`) that composes small presentational subcomponents, driven by one intelligence hook (`useMoneyPlanIntelligence`) for real DB-backed data and a pure calculation module (`moneyPlanIntelligence.ts`) for score/projection/preset math. A new `budget_bucket` column on `categories` (needs/wants/savings, user-editable) makes bucket totals and "Top Spending" real instead of guessed.

**Tech Stack:** React Native, TypeScript, `@op-engineering/op-sqlite`, Zustand (`budgetStore`), Reanimated v3, Jest + `@testing-library/react-native`.

Reference: `docs/plans/2026-08-02-money-plan-redesign-design.md` for the full design rationale.

---

## Conventions to follow (established by the Category Intelligence work)

- Screens (`src/screens/user/*.tsx`) are thin wrappers that just render a Shell component from `src/components/<domain>/`.
- Intelligence hooks (`src/hooks/use*.ts`) own DB queries directly via `getDb()` from `src/store/database`, return `{ ...data, loading, reload }`.
- Pure, DB-free calculation logic lives in `src/services/*.ts` as named exports — no React, no DB — so it can be unit tested directly.
- Migrations: `src/db/migrations/NNN_name.ts` exports `migrateNNNName(db)`, registered in `src/db/migrations/index.ts` with a `PRAGMA user_version` bump.
- Tests mirror `src/` under `__tests__/` (e.g. `src/hooks/useMoneyPlanIntelligence.ts` → `__tests__/hooks/useMoneyPlanIntelligence.test.ts`). Hook tests mock `../../src/store/database` with a `mockExecute = jest.fn()` and drive it via `.mockResolvedValueOnce(...)` per query, using `renderHook`/`waitFor` from `@testing-library/react-native`.
- Money: amounts are stored in paise (integers) in the DB; convert with `fromPaise`/`toPaise` from `src/utils/money.ts` immediately after querying.
- Colors come from `useSpecTheme()`: `colors.mintDeep` = Needs, `colors.peachDeep` = Wants, `colors.primaryAccent` = Savings/brand, `colors.lavenderDeep` = AI/insight accent, `colors.success`/`colors.danger` for positive/negative.

---

### Task 1: `classifyBudgetBucket` pure utility

**Files:**
- Create: `src/utils/budgetBucket.ts`
- Test: `__tests__/utils/budgetBucket.test.ts`

**Step 1: Write the failing test**

```typescript
import { classifyBudgetBucket } from '../../src/utils/budgetBucket';

describe('classifyBudgetBucket', () => {
  it('classifies essential-sounding names as needs', () => {
    expect(classifyBudgetBucket('Rent')).toBe('needs');
    expect(classifyBudgetBucket('Groceries')).toBe('needs');
    expect(classifyBudgetBucket('Health Insurance')).toBe('needs');
  });

  it('classifies investment/goal names as savings', () => {
    expect(classifyBudgetBucket('SIP Investment')).toBe('savings');
    expect(classifyBudgetBucket('Emergency Fund Goal')).toBe('savings');
  });

  it('defaults unmatched or lifestyle names to wants', () => {
    expect(classifyBudgetBucket('Dining Out')).toBe('wants');
    expect(classifyBudgetBucket('Random Custom Category')).toBe('wants');
  });

  it('is case-insensitive', () => {
    expect(classifyBudgetBucket('RENT')).toBe('needs');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/budgetBucket.test.ts`
Expected: FAIL — `Cannot find module '../../src/utils/budgetBucket'`

**Step 3: Write minimal implementation**

```typescript
export type BudgetBucket = 'needs' | 'wants' | 'savings';

const NEEDS_KEYWORDS = [
  'rent', 'mortgage', 'emi', 'grocer', 'utilit', 'insurance', 'electric',
  'water bill', 'gas bill', 'medical', 'health', 'loan', 'education', 'school',
  'tuition', 'fee', 'transport', 'fuel',
];

const SAVINGS_KEYWORDS = [
  'invest', 'saving', 'goal', 'mutual fund', 'sip', 'deposit', 'retirement', 'emergency fund',
];

/**
 * Best-effort default classification for existing/newly-created categories —
 * a starting point the user can always override in the category editor, not
 * a source of truth. Savings checked first since "Emergency Fund" contains
 * no needs keyword but should never fall through to needs/wants.
 */
export const classifyBudgetBucket = (categoryName: string): BudgetBucket => {
  const name = categoryName.toLowerCase();
  if (SAVINGS_KEYWORDS.some(k => name.includes(k))) return 'savings';
  if (NEEDS_KEYWORDS.some(k => name.includes(k))) return 'needs';
  return 'wants';
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/utils/budgetBucket.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/utils/budgetBucket.ts __tests__/utils/budgetBucket.test.ts
git commit -m "feat: add classifyBudgetBucket default-classification utility"
```

---

### Task 2: Migration 009 — `budget_bucket` column + backfill

**Files:**
- Create: `src/db/migrations/009_budget_bucket.ts`
- Modify: `src/db/migrations/index.ts`

**Step 1: Write the migration**

```typescript
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
```

**Step 2: Register in the migration runner**

In `src/db/migrations/index.ts`, add the import and a new version block:

```typescript
import { migrate009BudgetBucket } from './009_budget_bucket';
```

```typescript
  if (currentVersion < 9) {
    await migrate009BudgetBucket(db);
    await db.execute('PRAGMA user_version = 9;');
  }
```

**Step 3: Sanity-check migration runs**

There's no dedicated migration test harness in this repo (existing migrations 001–008 aren't unit tested either) — verify by running the app's existing DB-dependent test suite to confirm nothing broke:

Run: `npx jest __tests__/db`
Expected: PASS (no regressions in existing DB tests)

**Step 4: Commit**

```bash
git add src/db/migrations/009_budget_bucket.ts src/db/migrations/index.ts
git commit -m "feat: add budget_bucket column to categories with default backfill"
```

---

### Task 3: `CategoryData.budgetBucket` — type, hook, and edit-mode wiring

**Files:**
- Modify: `src/types/category.ts`
- Modify: `src/hooks/useCategoryIntelligence.ts`
- Modify: `__tests__/hooks/useCategoryIntelligence.test.ts`
- Modify: `src/components/modals/AddCategorySheet.tsx`

**Step 1: Write the failing test (hook passes through budget_bucket)**

Add to `__tests__/hooks/useCategoryIntelligence.test.ts`:

```typescript
  it('passes through the category\'s budget bucket', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ id: 'rent', name: 'Rent', icon: 'Home', color: null, budget_bucket: 'needs', usageCount: 1, currentMonthSpendPaise: 100000 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ avgSpendPaise: 0 }] });

    const { result } = renderHook(() => useCategoryIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories[0].budgetBucket).toBe('needs');
  });
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useCategoryIntelligence.test.ts`
Expected: FAIL — `result.current.categories[0].budgetBucket` is `undefined`

**Step 3: Add the field to `CategoryData` and wire it through**

In `src/types/category.ts`, add the import and field:

```typescript
import { BudgetBucket } from '../utils/budgetBucket';
```

```typescript
export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  color?: string;
  budgetBucket?: BudgetBucket;
  usageCount: number;
  monthlySpend: number;
  trailingAverageSpend: number;
  topMerchants: string[];
  trend: number[];
  health: CategoryHealth;
  isUnused: boolean;
}
```

In `src/hooks/useCategoryIntelligence.ts`, add `c.budget_bucket` to the SELECT and map it:

```typescript
      SELECT
        c.id,
        c.name,
        c.icon,
        c.color,
        c.budget_bucket,
        COUNT(t.id) as usageCount,
```

```typescript
        return {
          id: row.id,
          name: row.name,
          icon: row.icon || 'MoreHorizontal',
          color: row.color ?? undefined,
          budgetBucket: row.budget_bucket ?? undefined,
          usageCount,
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/hooks/useCategoryIntelligence.test.ts`
Expected: PASS (all tests, including the new one)

**Step 5: Add the bucket picker to `AddCategorySheet`**

In `src/components/modals/AddCategorySheet.tsx`:

```typescript
import { BudgetBucket, classifyBudgetBucket } from '../../utils/budgetBucket';
```

```typescript
const BUCKET_OPTIONS: { id: BudgetBucket; label: string }[] = [
  { id: 'needs', label: 'Needs' },
  { id: 'wants', label: 'Wants' },
  { id: 'savings', label: 'Savings' },
];
```

Add state, defaulting to the classifier's guess for brand-new categories so the picker is never blank:

```typescript
  const [selectedBucket, setSelectedBucket] = useState<BudgetBucket>('wants');
```

In the `visible` effect, alongside the existing `setName`/`setSelectedIcon`/`setSelectedColor` resets:

```typescript
      setSelectedBucket(editing?.budgetBucket ?? classifyBudgetBucket(editing?.name ?? ''));
```

In `handleSave`, add `budget_bucket` to both the INSERT and UPDATE:

```typescript
      if (editing) {
        await db.execute(
          'UPDATE categories SET name = ?, icon = ?, color = ?, budget_bucket = ? WHERE id = ?',
          [name.trim(), selectedIcon, selectedColor, selectedBucket, editing.id],
        );
      } else {
        const id = uuidv4();
        await db.execute(
          'INSERT INTO categories (id, name, icon, color, budget_bucket) VALUES (?, ?, ?, ?, ?)',
          [id, name.trim(), selectedIcon, selectedColor, selectedBucket],
        );
      }
```

Add a segmented control in the form, after the Color section and before the Icon section:

```tsx
            {/* Budget Bucket */}
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Budget Bucket</Text>
              <View style={styles.bucketRow}>
                {BUCKET_OPTIONS.map(opt => {
                  const isSelected = selectedBucket === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      testID={`bucket-option-${opt.id}`}
                      onPress={() => setSelectedBucket(opt.id)}
                      style={[
                        styles.bucketOption,
                        { backgroundColor: isSelected ? selectedColor : colors.chipBg, borderRadius: cardRadius },
                      ]}
                    >
                      <Text style={{ color: isSelected ? '#fff' : colors.textPrimary, fontFamily: 'Satoshi-Bold', fontSize: 13 }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
```

Add the row style next to `colorOption`:

```typescript
  bucketRow: { flexDirection: 'row', gap: 8 },
  bucketOption: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' },
```

**Step 6: Run the full category test suite**

Run: `npx jest __tests__/hooks/useCategoryIntelligence.test.ts __tests__/screens/CategoriesScreen.test.tsx`
Expected: PASS

**Step 7: Commit**

```bash
git add src/types/category.ts src/hooks/useCategoryIntelligence.ts __tests__/hooks/useCategoryIntelligence.test.ts src/components/modals/AddCategorySheet.tsx
git commit -m "feat: add editable budget bucket to category editor"
```

---

### Task 4: `moneyPlanIntelligence.ts` — score

**Files:**
- Create: `src/services/moneyPlanIntelligence.ts`
- Test: `__tests__/services/moneyPlanIntelligence.test.ts`

**Step 1: Write the failing test**

```typescript
import { computeMoneyPlanScore } from '../../src/services/moneyPlanIntelligence';

describe('computeMoneyPlanScore', () => {
  it('returns 0 with a single recommendation when no income is set', () => {
    const result = computeMoneyPlanScore({
      income: 0, needsPercent: 50, wantsPercent: 30, savingsPercent: 20, emergencyFundStarted: false,
    });
    expect(result.hasIncome).toBe(false);
    expect(result.score).toBe(0);
    expect(result.recommendations).toEqual(['Add your monthly income to calculate your Money Plan Score.']);
  });

  it('returns 100 with no recommendations when every criterion is met', () => {
    const result = computeMoneyPlanScore({
      income: 50000, needsPercent: 55, wantsPercent: 25, savingsPercent: 20, emergencyFundStarted: true,
    });
    expect(result.hasIncome).toBe(true);
    expect(result.score).toBe(100);
    expect(result.recommendations).toEqual([]);
  });

  it('deducts and recommends for each unmet criterion', () => {
    const result = computeMoneyPlanScore({
      income: 50000, needsPercent: 70, wantsPercent: 20, savingsPercent: 10, emergencyFundStarted: false,
    });
    // unbalanced total is fine here (100), but needs too high, savings too low, no fund progress = 3 of 5 applicable criteria met
    expect(result.score).toBe(40);
    expect(result.recommendations.length).toBe(3);
  });

  it('skips the emergency fund criterion when no goal exists', () => {
    const result = computeMoneyPlanScore({
      income: 50000, needsPercent: 55, wantsPercent: 25, savingsPercent: 20, emergencyFundStarted: null,
    });
    expect(result.score).toBe(100);
    expect(result.recommendations).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/moneyPlanIntelligence.test.ts`
Expected: FAIL — module doesn't exist

**Step 3: Write minimal implementation**

```typescript
export interface MoneyPlanScoreInput {
  income: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  /** true = goal has progress, false = goal exists but stalled, null = no Emergency Fund goal set up */
  emergencyFundStarted: boolean | null;
}

export interface MoneyPlanScoreResult {
  hasIncome: boolean;
  score: number;
  recommendations: string[];
}

const NEEDS_RANGE: [number, number] = [50, 60];
const WANTS_RANGE: [number, number] = [20, 30];
const MIN_SAVINGS_PERCENT = 20;

/**
 * Score is (criteria met / criteria applicable) × 100 — every criterion maps
 * to a real, currently-computable fact, never a vibe. The Emergency Fund
 * criterion only applies once the user has actually created that goal;
 * otherwise it would silently cap everyone's score at 80.
 */
export const computeMoneyPlanScore = (input: MoneyPlanScoreInput): MoneyPlanScoreResult => {
  if (input.income <= 0) {
    return {
      hasIncome: false,
      score: 0,
      recommendations: ['Add your monthly income to calculate your Money Plan Score.'],
    };
  }

  const criteria: { met: boolean; recommendation: string }[] = [
    {
      met: input.needsPercent >= NEEDS_RANGE[0] && input.needsPercent <= NEEDS_RANGE[1],
      recommendation: `Adjust Needs into the ${NEEDS_RANGE[0]}-${NEEDS_RANGE[1]}% range.`,
    },
    {
      met: input.wantsPercent >= WANTS_RANGE[0] && input.wantsPercent <= WANTS_RANGE[1],
      recommendation: `Adjust Wants into the ${WANTS_RANGE[0]}-${WANTS_RANGE[1]}% range.`,
    },
    {
      met: input.savingsPercent >= MIN_SAVINGS_PERCENT,
      recommendation: `Increase Savings to at least ${MIN_SAVINGS_PERCENT}%.`,
    },
    {
      met: input.needsPercent + input.wantsPercent + input.savingsPercent === 100,
      recommendation: 'Balance your allocation so it adds up to 100%.',
    },
  ];

  if (input.emergencyFundStarted !== null) {
    criteria.push({
      met: input.emergencyFundStarted,
      recommendation: 'Start contributing to your Emergency Fund goal.',
    });
  }

  const met = criteria.filter(c => c.met).length;
  const score = Math.round((met / criteria.length) * 100);

  return {
    hasIncome: true,
    score,
    recommendations: criteria.filter(c => !c.met).map(c => c.recommendation),
  };
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/moneyPlanIntelligence.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/services/moneyPlanIntelligence.ts __tests__/services/moneyPlanIntelligence.test.ts
git commit -m "feat: add computeMoneyPlanScore"
```

---

### Task 5: `moneyPlanIntelligence.ts` — preset outcomes and projections

**Files:**
- Modify: `src/services/moneyPlanIntelligence.ts`
- Modify: `__tests__/services/moneyPlanIntelligence.test.ts`

**Step 1: Write the failing tests**

Append to the test file:

```typescript
import { computePresetOutcome, computeProjection, computeBucketTrend, predictBucketPace } from '../../src/services/moneyPlanIntelligence';

describe('computePresetOutcome', () => {
  it('computes real rupee outcomes for a preset at a given income', () => {
    const outcome = computePresetOutcome({ income: 100000, needsPercent: 50, wantsPercent: 30, savingsPercent: 20 });
    expect(outcome.safeToSpend).toBe(80000);
    expect(outcome.monthlySavings).toBe(20000);
    expect(outcome.emergencyFundMonths).toBe(5); // ceil(100000 / 20000)
  });

  it('returns null emergencyFundMonths when savings is zero', () => {
    const outcome = computePresetOutcome({ income: 100000, needsPercent: 70, wantsPercent: 30, savingsPercent: 0 });
    expect(outcome.emergencyFundMonths).toBeNull();
  });
});

describe('computeProjection', () => {
  it('projects cumulative savings across the given horizons', () => {
    const points = computeProjection({ income: 50000, savingsPercent: 20, months: [3, 6, 12] });
    expect(points).toEqual([
      { months: 3, cumulativeSavings: 30000 },
      { months: 6, cumulativeSavings: 60000 },
      { months: 12, cumulativeSavings: 120000 },
    ]);
  });
});

describe('computeBucketTrend', () => {
  it('flags an increase over 2%', () => {
    expect(computeBucketTrend(11000, 10000).direction).toBe('up');
  });
  it('flags a decrease over 2%', () => {
    expect(computeBucketTrend(9000, 10000).direction).toBe('down');
  });
  it('treats small changes as flat', () => {
    expect(computeBucketTrend(10100, 10000).direction).toBe('flat');
  });
  it('is flat when there is no prior spend to compare against', () => {
    expect(computeBucketTrend(500, 0)).toEqual({ direction: 'flat', pct: 0 });
  });
});

describe('predictBucketPace', () => {
  it('projects month-end total from spend-so-far pace', () => {
    const result = predictBucketPace({ spendSoFar: 10000, daysElapsed: 10, daysInMonth: 30, budget: 30000 });
    expect(result.projectedTotal).toBe(30000);
    expect(result.onTrack).toBe(true);
  });
  it('flags off-track when projected total exceeds budget', () => {
    const result = predictBucketPace({ spendSoFar: 15000, daysElapsed: 10, daysInMonth: 30, budget: 30000 });
    expect(result.onTrack).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/moneyPlanIntelligence.test.ts`
Expected: FAIL — new exports don't exist

**Step 3: Write minimal implementation**

Append to `src/services/moneyPlanIntelligence.ts`:

```typescript
export interface PresetOutcomeInput {
  income: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
}

export interface PresetOutcome {
  safeToSpend: number;
  monthlySavings: number;
  emergencyFundMonths: number | null;
}

const EMERGENCY_FUND_TARGET = 100000;

export const computePresetOutcome = (input: PresetOutcomeInput): PresetOutcome => {
  const monthlySavings = Math.round(input.income * (input.savingsPercent / 100));
  return {
    safeToSpend: Math.round(input.income * ((input.needsPercent + input.wantsPercent) / 100)),
    monthlySavings,
    emergencyFundMonths: monthlySavings > 0 ? Math.ceil(EMERGENCY_FUND_TARGET / monthlySavings) : null,
  };
};

export interface ProjectionInput {
  income: number;
  savingsPercent: number;
  months: number[];
}

export interface ProjectionPoint {
  months: number;
  cumulativeSavings: number;
}

export const computeProjection = (input: ProjectionInput): ProjectionPoint[] => {
  const monthlySavings = Math.round(input.income * (input.savingsPercent / 100));
  return input.months.map(months => ({ months, cumulativeSavings: monthlySavings * months }));
};

export interface BucketTrend {
  direction: 'up' | 'down' | 'flat';
  pct: number;
}

const TREND_FLAT_THRESHOLD_PCT = 2;

export const computeBucketTrend = (currentSpend: number, previousSpend: number): BucketTrend => {
  if (previousSpend <= 0) return { direction: 'flat', pct: 0 };
  const pct = Math.round(((currentSpend - previousSpend) / previousSpend) * 100);
  if (pct > TREND_FLAT_THRESHOLD_PCT) return { direction: 'up', pct };
  if (pct < -TREND_FLAT_THRESHOLD_PCT) return { direction: 'down', pct };
  return { direction: 'flat', pct };
};

export interface PaceInput {
  spendSoFar: number;
  daysElapsed: number;
  daysInMonth: number;
  budget: number;
}

export interface PacePrediction {
  projectedTotal: number;
  onTrack: boolean;
}

export const predictBucketPace = (input: PaceInput): PacePrediction => {
  const projectedTotal = input.daysElapsed > 0 ? Math.round((input.spendSoFar / input.daysElapsed) * input.daysInMonth) : 0;
  return { projectedTotal, onTrack: projectedTotal <= input.budget };
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/moneyPlanIntelligence.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/services/moneyPlanIntelligence.ts __tests__/services/moneyPlanIntelligence.test.ts
git commit -m "feat: add preset outcome, projection, trend, and pace calculations"
```

---

### Task 6: `useMoneyPlanIntelligence` hook

**Files:**
- Create: `src/hooks/useMoneyPlanIntelligence.ts`
- Test: `__tests__/hooks/useMoneyPlanIntelligence.test.ts`

This hook owns everything that requires a DB round-trip: this month's income, each bucket's current/previous month spend and top-3 categories, and whether an Emergency Fund goal exists and has progress. It does **not** own the live needs/wants/savings percentages being dragged on screen — those stay as local state in the shell, same as today, so slider drags don't cause a DB refetch on every frame.

**Step 1: Write the failing test**

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useMoneyPlanIntelligence } from '../../src/hooks/useMoneyPlanIntelligence';

const mockExecute = jest.fn();
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

describe('useMoneyPlanIntelligence', () => {
  beforeEach(() => mockExecute.mockReset());

  it('loads income and per-bucket totals with top categories', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 5000000 }] }) // last month income (paise)
      .mockResolvedValueOnce({ rows: [{ total: 1500000 }] }) // needs: this month
      .mockResolvedValueOnce({ rows: [{ total: 1000000 }] }) // needs: previous month
      .mockResolvedValueOnce({ rows: [{ name: 'Rent', total: 1000000 }, { name: 'Groceries', total: 500000 }] }) // needs: top categories
      .mockResolvedValueOnce({ rows: [{ total: 800000 }] }) // wants: this month
      .mockResolvedValueOnce({ rows: [{ total: 800000 }] }) // wants: previous month
      .mockResolvedValueOnce({ rows: [{ name: 'Dining', total: 800000 }] }) // wants: top categories
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // savings: this month
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // savings: previous month
      .mockResolvedValueOnce({ rows: [] }) // savings: top categories
      .mockResolvedValueOnce({ rows: [] }); // emergency fund goal

    const { result } = renderHook(() => useMoneyPlanIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.income).toBe(50000);
    expect(result.current.buckets.needs.currentSpend).toBe(15000);
    expect(result.current.buckets.needs.previousSpend).toBe(10000);
    expect(result.current.buckets.needs.topCategories).toEqual(['Rent', 'Groceries']);
    expect(result.current.emergencyFundGoal).toBeNull();
  });

  it('surfaces the Emergency Fund goal when one exists', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'g1', targetAmount: 100000, currentAmount: 25000 }] });

    const { result } = renderHook(() => useMoneyPlanIntelligence());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.emergencyFundGoal).toEqual({ targetAmount: 100000, currentAmount: 25000 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useMoneyPlanIntelligence.test.ts`
Expected: FAIL — module doesn't exist

**Step 3: Write minimal implementation**

```typescript
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../store/database';
import { fromPaise } from '../utils/money';
import { BudgetBucket } from '../utils/budgetBucket';

export interface BucketIntelligence {
  currentSpend: number;
  previousSpend: number;
  topCategories: string[];
}

export interface EmergencyFundGoal {
  targetAmount: number;
  currentAmount: number;
}

export interface MoneyPlanIntelligence {
  income: number;
  buckets: Record<BudgetBucket, BucketIntelligence>;
  emergencyFundGoal: EmergencyFundGoal | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const BUCKETS: BudgetBucket[] = ['needs', 'wants', 'savings'];

const EMPTY_BUCKET: BucketIntelligence = { currentSpend: 0, previousSpend: 0, topCategories: [] };

export const useMoneyPlanIntelligence = (): MoneyPlanIntelligence => {
  const [income, setIncome] = useState(0);
  const [buckets, setBuckets] = useState<Record<BudgetBucket, BucketIntelligence>>({
    needs: EMPTY_BUCKET,
    wants: EMPTY_BUCKET,
    savings: EMPTY_BUCKET,
  });
  const [emergencyFundGoal, setEmergencyFundGoal] = useState<EmergencyFundGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const db = getDb();
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();

    const incomeResult = await db.execute(
      "SELECT SUM(amount_paise) as total FROM transactions WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?",
      [lastMonthStart, monthStart],
    );
    setIncome(fromPaise((incomeResult.rows?.[0] as any)?.total || 0));

    const nextBuckets: Record<BudgetBucket, BucketIntelligence> = { needs: EMPTY_BUCKET, wants: EMPTY_BUCKET, savings: EMPTY_BUCKET };
    for (const bucket of BUCKETS) {
      const [currentRes, previousRes, topRes] = await Promise.all([
        db.execute(
          `SELECT SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type = 'expense' AND t.occurred_at >= ?`,
          [bucket, monthStart],
        ),
        db.execute(
          `SELECT SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type = 'expense' AND t.occurred_at >= ? AND t.occurred_at < ?`,
          [bucket, lastMonthStart, monthStart],
        ),
        db.execute(
          `SELECT c.name as name, SUM(t.amount_paise) as total FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE c.budget_bucket = ? AND t.type = 'expense' AND t.occurred_at >= ?
           GROUP BY c.id ORDER BY total DESC LIMIT 3`,
          [bucket, monthStart],
        ),
      ]);

      nextBuckets[bucket] = {
        currentSpend: fromPaise((currentRes.rows?.[0] as any)?.total || 0),
        previousSpend: fromPaise((previousRes.rows?.[0] as any)?.total || 0),
        topCategories: ((topRes.rows ?? []) as any[]).map(r => r.name),
      };
    }
    setBuckets(nextBuckets);

    const goalResult = await db.execute("SELECT targetAmount, currentAmount FROM goals WHERE name = 'Emergency Fund' LIMIT 1;");
    const goalRow = goalResult.rows?.[0] as any;
    setEmergencyFundGoal(goalRow ? { targetAmount: goalRow.targetAmount, currentAmount: goalRow.currentAmount } : null);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { income, buckets, emergencyFundGoal, loading, reload: load };
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/hooks/useMoneyPlanIntelligence.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/hooks/useMoneyPlanIntelligence.ts __tests__/hooks/useMoneyPlanIntelligence.test.ts
git commit -m "feat: add useMoneyPlanIntelligence hook"
```

---

### Task 7: `MoneyPlanHero.tsx`

**Files:**
- Create: `src/components/budget/MoneyPlanHero.tsx`

Presentational only — receives everything as props, no DB access. Replaces the current inline hero + coach pill block in `BudgetScreen.tsx`.

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';

interface Props {
  safeToSpend: number;
  hasIncome: boolean;
  score: number;
  topRecommendation: string | null;
  isBalanced: boolean;
  onAddIncome: () => void;
  colors: any;
}

export const MoneyPlanHero: React.FC<Props> = ({
  safeToSpend, hasIncome, score, topRecommendation, isBalanced, onAddIncome, colors,
}) => {
  return (
    <View style={styles.wrapper}>
      <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase' }}>
        Safe To Spend
      </Text>
      <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 44, letterSpacing: -1, marginTop: 4 }}>
        ₹{safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>

      {!hasIncome ? (
        <View style={{ marginTop: 16 }}>
          <Text variant="body" style={{ color: colors.textSecondary, marginBottom: 12 }}>
            To calculate your personalized plan, add your monthly income.
          </Text>
          <PressableScale onPress={onAddIncome} style={[styles.addIncomeBtn, { backgroundColor: colors.primaryAccent }]}>
            <Text style={{ color: '#FFF', fontFamily: 'Satoshi-Bold' }}>Add Income</Text>
          </PressableScale>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <View style={styles.scoreRow}>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 20 }}>
              {score}%
            </Text>
            <Text variant="body" style={{ color: colors.textSecondary, marginLeft: 8 }}>Optimized</Text>
          </View>
          {topRecommendation ? (
            <Text variant="caption" style={{ color: isBalanced ? colors.primaryAccent : colors.danger, fontFamily: 'Satoshi-Bold', marginTop: 4 }}>
              {topRecommendation}
            </Text>
          ) : (
            <Text variant="caption" style={{ color: colors.success, fontFamily: 'Satoshi-Bold', marginTop: 4 }}>
              Plan fully optimized. Every rupee has a purpose.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  addIncomeBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, alignSelf: 'flex-start' },
});
```

**Commit**

```bash
git add src/components/budget/MoneyPlanHero.tsx
git commit -m "feat: add MoneyPlanHero component"
```

---

### Task 8: `MoneyFlowVisualizer.tsx` — real vertical flow

**Files:**
- Modify: `src/components/budget/MoneyFlowVisualizer.tsx`

Replace the horizontal decorative bar with a top-to-bottom flow that shows the actual rupee amount at each stage, still driven by the same `needs`/`wants`/`savings` percentages and now also `income`.

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from '../ui/Text';

interface Stage {
  label: string;
  amount: number;
  color: string;
  widthPercent: number;
}

interface Props {
  income: number;
  needs: number;
  wants: number;
  savings: number;
  safeToSpend: number;
  colors: any;
}

export const MoneyFlowVisualizer: React.FC<Props> = ({ income, needs, wants, savings, safeToSpend, colors }) => {
  const stages: Stage[] = [
    { label: 'Income', amount: income, color: colors.textPrimary, widthPercent: 100 },
    { label: 'Needs', amount: Math.round(income * (needs / 100)), color: colors.mintDeep, widthPercent: needs },
    { label: 'Wants', amount: Math.round(income * (wants / 100)), color: colors.peachDeep, widthPercent: wants },
    { label: 'Savings', amount: Math.round(income * (savings / 100)), color: colors.primaryAccent, widthPercent: savings },
    { label: 'Safe To Spend', amount: safeToSpend, color: colors.success, widthPercent: Math.min(100, needs + wants) },
  ];

  return (
    <View style={styles.container}>
      <Text variant="caption" style={[styles.label, { color: colors.textSecondary }]}>Money Flow</Text>
      {stages.map(stage => (
        <FlowRow key={stage.label} stage={stage} colors={colors} />
      ))}
    </View>
  );
};

const FlowRow: React.FC<{ stage: Stage; colors: any }> = ({ stage, colors }) => {
  const barStyle = useAnimatedStyle(() => ({ width: withSpring(`${Math.max(0, Math.min(100, stage.widthPercent))}%`, { damping: 20 }) }));

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>{stage.label}</Text>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
          ₹{stage.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.inputBg }]}>
        <Animated.View style={[styles.fill, { backgroundColor: stage.color }, barStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 40, paddingHorizontal: 24 },
  label: { fontFamily: 'Satoshi-Medium', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, fontSize: 11 },
  row: { marginBottom: 14 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
```

**Verify manually:** this component has no dedicated unit test today and its behavior is purely visual/animated — cover it via the `MoneyPlanShell` smoke test in Task 12 instead of a standalone test.

**Commit**

```bash
git add src/components/budget/MoneyFlowVisualizer.tsx
git commit -m "feat: rewrite MoneyFlowVisualizer as a real top-to-bottom flow"
```

---

### Task 9: `ExpandableCategoryCard.tsx` — real top spending, trend, prediction

**Files:**
- Modify: `src/components/budget/ExpandableCategoryCard.tsx`

Add three optional new props — `topCategories: string[]`, `trend: { direction: 'up'|'down'|'flat'; pct: number }`, `pacePrediction: { projectedTotal: number; onTrack: boolean } | null` — rendered in the existing `insightsBox` section, above the existing AI tip. Keep all existing props and behavior (drag slider, +/- buttons) unchanged.

**Step 1: Extend the props interface**

```typescript
interface Props {
  icon: React.ReactNode;
  name: string;
  percentage: number;
  rupees: number;
  recommendedRange: string;
  color: string;
  onChange: (newPercent: number) => void;
  insights: string;
  includedExpenses: string;
  topCategories?: string[];
  trend?: { direction: 'up' | 'down' | 'flat'; pct: number };
  pacePrediction?: { projectedTotal: number; onTrack: boolean } | null;
}
```

Destructure the new props in the component signature alongside the existing ones.

**Step 2: Render real top spending + trend + prediction, above the existing `aiTip` block**

```tsx
          {topCategories && topCategories.length > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                Top Spending
              </Text>
              <Text variant="caption" style={{ color: colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: 16 }}>
                {topCategories.join(', ')}
              </Text>
            </View>
          )}

          {trend && trend.direction !== 'flat' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                Trend
              </Text>
              <Text variant="caption" style={{ color: trend.direction === 'up' ? colors.danger : colors.success, fontFamily: 'Satoshi-Bold' }}>
                {trend.direction === 'up' ? '▲' : '▼'} {Math.abs(trend.pct)}% vs last month
              </Text>
            </View>
          )}

          {pacePrediction && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                Prediction
              </Text>
              <Text variant="caption" style={{ color: pacePrediction.onTrack ? colors.success : colors.danger, flex: 1, textAlign: 'right', marginLeft: 16 }}>
                {pacePrediction.onTrack ? 'On track to finish ' : "Trending over pace to "}
                ₹{pacePrediction.projectedTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month
              </Text>
            </View>
          )}
```

**Verify:** no existing unit test targets this component; confirm nothing broke by running the full test suite at the end of Task 12.

**Commit**

```bash
git add src/components/budget/ExpandableCategoryCard.tsx
git commit -m "feat: show real top spending, trend, and pace prediction in category cards"
```

---

### Task 10: `LifestyleProfileCard.tsx` — outcome-based presets

**Files:**
- Create: `src/components/budget/LifestyleProfileCard.tsx`

```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { computePresetOutcome } from '../../services/moneyPlanIntelligence';

interface Preset {
  id: string;
  name: string;
  n: number;
  w: number;
  s: number;
  icon: React.ReactNode;
}

interface Props {
  preset: Preset;
  income: number;
  onSelect: (n: number, w: number, s: number) => void;
  colors: any;
  cardRadius: number;
}

export const LifestyleProfileCard: React.FC<Props> = ({ preset, income, onSelect, colors, cardRadius }) => {
  const outcome = computePresetOutcome({ income, needsPercent: preset.n, wantsPercent: preset.w, savingsPercent: preset.s });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: cardRadius }]}
      onPress={() => onSelect(preset.n, preset.w, preset.s)}
      activeOpacity={0.8}
    >
      <View style={[styles.icon, { backgroundColor: colors.primaryAccent }]}>{preset.icon}</View>
      <Text variant="h3" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', marginBottom: 12 }}>{preset.name}</Text>

      <View style={styles.outcomeRow}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>Safe to Spend</Text>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
          ₹{outcome.safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      <View style={styles.outcomeRow}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>Savings</Text>
        <Text variant="caption" style={{ color: colors.success, fontFamily: 'Satoshi-Bold' }}>
          ₹{outcome.monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      <View style={styles.outcomeRow}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>Emergency Fund</Text>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
          {outcome.emergencyFundMonths ? `${outcome.emergencyFundMonths} mos` : '—'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { width: 180, padding: 20, borderWidth: 1, marginRight: 16 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  outcomeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
});
```

**Commit**

```bash
git add src/components/budget/LifestyleProfileCard.tsx
git commit -m "feat: add outcome-based LifestyleProfileCard"
```

---

### Task 11: `MoneyPlanProjection.tsx`

**Files:**
- Create: `src/components/budget/MoneyPlanProjection.tsx`

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { computeProjection } from '../../services/moneyPlanIntelligence';

interface Props {
  income: number;
  savingsPercent: number;
  emergencyFundTarget: number;
  emergencyFundCurrent: number;
  monthlySavings: number;
  colors: any;
  cardRadius: number;
}

const HORIZONS = [3, 6, 12];

export const MoneyPlanProjection: React.FC<Props> = ({
  income, savingsPercent, emergencyFundTarget, emergencyFundCurrent, monthlySavings, colors, cardRadius,
}) => {
  const [horizon, setHorizon] = useState(12);
  const points = computeProjection({ income, savingsPercent, months: HORIZONS });
  const selected = points.find(p => p.months === horizon)!;

  const remaining = Math.max(0, emergencyFundTarget - emergencyFundCurrent);
  const emergencyFundLabel = monthlySavings > 0 ? `Ready in ${Math.ceil(remaining / monthlySavings)} mos` : 'Add savings to start';

  return (
    <View>
      <View style={styles.horizonRow}>
        {HORIZONS.map(h => (
          <TouchableOpacity
            key={h}
            onPress={() => setHorizon(h)}
            style={[styles.horizonBtn, { backgroundColor: horizon === h ? colors.primaryAccent : colors.chipBg, borderRadius: 999 }]}
          >
            <Text variant="caption" style={{ color: horizon === h ? '#FFF' : colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
              {h} mo
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: cardRadius }]}>
        <View style={styles.row}>
          <Text variant="body" style={{ color: colors.textSecondary }}>Projected Savings</Text>
          <Text variant="h3" style={{ color: colors.success }}>
            +₹{selected.cumulativeSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text variant="body" style={{ color: colors.textSecondary }}>Emergency Fund</Text>
          <Text variant="h3" style={{ color: colors.textPrimary }}>{emergencyFundLabel}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  horizonRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  horizonBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  box: { padding: 20, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 16 },
});
```

**Commit**

```bash
git add src/components/budget/MoneyPlanProjection.tsx
git commit -m "feat: add MoneyPlanProjection panel with 3/6/12-month horizons"
```

---

### Task 12: `MoneyPlanSaveBar.tsx`

**Files:**
- Create: `src/components/budget/MoneyPlanSaveBar.tsx`

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

interface Props {
  hasChanges: boolean;
  isBalanced: boolean;
  isLoading: boolean;
  safeToSpend: number;
  monthlySavings: number;
  onApply: () => void;
  colors: any;
  paddingBottom: number;
}

export const MoneyPlanSaveBar: React.FC<Props> = ({
  hasChanges, isBalanced, isLoading, safeToSpend, monthlySavings, onApply, colors, paddingBottom,
}) => {
  return (
    <View style={[styles.footer, { paddingBottom, backgroundColor: colors.background }]}>
      {hasChanges && (
        <View style={styles.diffRow}>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            Safe to Spend ₹{safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · Savings ₹{monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
          </Text>
        </View>
      )}
      <Button title="Apply Plan" onPress={onApply} disabled={!isBalanced || isLoading} loading={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.05)' },
  diffRow: { marginBottom: 12, alignItems: 'center' },
});
```

**Commit**

```bash
git add src/components/budget/MoneyPlanSaveBar.tsx
git commit -m "feat: add MoneyPlanSaveBar with change summary"
```

---

### Task 13: `MoneyPlanShell.tsx` — compose everything

**Files:**
- Create: `src/components/budget/MoneyPlanShell.tsx`
- Modify: `src/screens/user/BudgetScreen.tsx`
- Create: `__tests__/components/budget/MoneyPlanShell.test.tsx`

This is the biggest task: move all the live state and logic out of `BudgetScreen.tsx` into `MoneyPlanShell.tsx`, wire in `useMoneyPlanIntelligence`, and replace the old preset/simulator/footer blocks with the new components from Tasks 7–12.

**Step 1: Write the failing smoke test**

```typescript
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MoneyPlanShell } from '../../../src/components/budget/MoneyPlanShell';

const mockExecute = jest.fn();
jest.mock('../../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

const navigation = { goBack: jest.fn() } as any;

describe('MoneyPlanShell', () => {
  beforeEach(() => mockExecute.mockReset());

  it('shows the income onboarding CTA when there is no income yet', async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const { findByText } = render(<MoneyPlanShell navigation={navigation} />);

    expect(await findByText('Add Income')).toBeTruthy();
  });

  it('shows Safe To Spend once income exists', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (String(sql).includes("type = 'income'")) return Promise.resolve({ rows: [{ total: 5000000 }] });
      return Promise.resolve({ rows: [] });
    });

    const { findByText } = render(<MoneyPlanShell navigation={navigation} />);

    // Default 50/30/20 split of ₹50,000 -> Safe to Spend = ₹40,000
    expect(await findByText('₹40,000')).toBeTruthy();
  });
});
```

Note: `budgetStore` and `db/database.getDb` (from `src/store/database`) are what everything in this screen ultimately calls through — both the hook and `budgetStore`/`getDb()` calls in the shell resolve to the same mocked `mockExecute`.

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/budget/MoneyPlanShell.test.tsx`
Expected: FAIL — module doesn't exist

**Step 3: Write `MoneyPlanShell.tsx`**

Move the full body of the current `BudgetScreen.tsx` (lines 29–337 minus the header/back button, which stays in the thin screen wrapper only if you prefer — simplest is to move everything and have `BudgetScreen.tsx` just pass `navigation` through) into `src/components/budget/MoneyPlanShell.tsx`, then apply these changes on top of the moved code:

1. Import and call the new hook:

```typescript
import { useMoneyPlanIntelligence } from '../../hooks/useMoneyPlanIntelligence';
import {
  computeMoneyPlanScore,
  computeBucketTrend,
  predictBucketPace,
} from '../../services/moneyPlanIntelligence';
import { MoneyPlanHero } from './MoneyPlanHero';
import { LifestyleProfileCard } from './LifestyleProfileCard';
import { MoneyPlanProjection } from './MoneyPlanProjection';
import { MoneyPlanSaveBar } from './MoneyPlanSaveBar';
```

```typescript
  const { buckets, emergencyFundGoal, loading: intelligenceLoading, reload: reloadIntelligence } = useMoneyPlanIntelligence();
```

2. Replace the old `useEffect` that fetches income directly with just using `useMoneyPlanIntelligence`'s `income` — drop the local `fetchIncome` effect and `income` state entirely; use the hook's `income` value instead (rename the destructured field to avoid clashing with the local editable slider state, which is unrelated).

3. Compute score and per-bucket derived data each render (cheap, pure):

```typescript
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysElapsed = today.getDate();

  const scoreResult = computeMoneyPlanScore({
    income,
    needsPercent: needs,
    wantsPercent: wants,
    savingsPercent: savings,
    emergencyFundStarted: emergencyFundGoal ? emergencyFundGoal.currentAmount > 0 : null,
  });

  const bucketView = (bucket: 'needs' | 'wants' | 'savings', percent: number) => {
    const data = buckets[bucket];
    const budgetForBucket = income * (percent / 100);
    return {
      topCategories: data.topCategories,
      trend: computeBucketTrend(data.currentSpend, data.previousSpend),
      pacePrediction: budgetForBucket > 0 ? predictBucketPace({ spendSoFar: data.currentSpend, daysElapsed, daysInMonth, budget: budgetForBucket }) : null,
    };
  };
```

4. Pass `bucketView('needs', needs)` etc. into each `ExpandableCategoryCard` as the new `topCategories`/`trend`/`pacePrediction` props.

5. Replace the hero + coach pill JSX block with:

```tsx
          <MoneyPlanHero
            safeToSpend={safeToSpend}
            hasIncome={income > 0}
            score={scoreResult.score}
            topRecommendation={scoreResult.recommendations[0] ?? null}
            isBalanced={isBalanced}
            onAddIncome={() => navigation.navigate('Add')}
            colors={colors}
          />
```

6. Update `MoneyFlowVisualizer` usage to the new prop shape: `<MoneyFlowVisualizer income={income} needs={needs} wants={wants} savings={savings} safeToSpend={safeToSpend} colors={colors} />`.

7. Replace the `PRESETS.map(...)` `TouchableOpacity` block with:

```tsx
                {PRESETS.map(p => (
                  <LifestyleProfileCard
                    key={p.id}
                    preset={p}
                    income={income}
                    onSelect={applyPreset}
                    colors={colors}
                    cardRadius={cardRadius}
                  />
                ))}
```

8. Replace the `simulatorBox` block with:

```tsx
              <MoneyPlanProjection
                income={income}
                savingsPercent={savings}
                emergencyFundTarget={emergencyFundGoal?.targetAmount ?? 100000}
                emergencyFundCurrent={emergencyFundGoal?.currentAmount ?? 0}
                monthlySavings={estimatedSavings}
                colors={colors}
                cardRadius={cardRadius}
              />
```

9. Replace the footer `<Button ... />` with:

```tsx
      <MoneyPlanSaveBar
        hasChanges={needs !== settings.needsPercent || wants !== settings.wantsPercent || savings !== settings.savingsPercent}
        isBalanced={isBalanced}
        isLoading={isLoading}
        safeToSpend={safeToSpend}
        monthlySavings={estimatedSavings}
        onApply={handleSave}
        colors={colors}
        paddingBottom={insets.bottom + 16}
      />
```

10. In `handleSave`, after a successful save, call `reloadIntelligence()` alongside the existing success-modal logic so bucket totals reflect the just-saved plan if the user reopens the screen.

11. Export the component as `MoneyPlanShell` (props: `{ navigation }`) instead of `BudgetScreen`.

**Step 4: Reduce `BudgetScreen.tsx` to a thin wrapper**

```tsx
import React from 'react';
import { MoneyPlanShell } from '../../components/budget/MoneyPlanShell';

export const BudgetScreen = ({ navigation }: any) => {
  return <MoneyPlanShell navigation={navigation} />;
};

export default BudgetScreen;
```

**Step 5: Run the smoke test**

Run: `npx jest __tests__/components/budget/MoneyPlanShell.test.tsx`
Expected: PASS (both tests)

**Step 6: Run the full test suite to catch regressions**

Run: `npx jest`
Expected: PASS — no regressions in `CategoriesScreen`, `useCategoryIntelligence`, or anywhere else touched by Tasks 1–12

**Step 7: Commit**

```bash
git add src/components/budget/MoneyPlanShell.tsx src/screens/user/BudgetScreen.tsx __tests__/components/budget/MoneyPlanShell.test.tsx
git commit -m "feat: rewrite Money Plan screen as MoneyPlanShell with real intelligence"
```

---

### Task 14: Manual verification pass

Not a code change — run the app and walk the real flow before calling this done, per this repo's rule that UI work must be checked in the running app, not just unit tests.

**Steps:**
1. Start Metro / run the app on a simulator (`npm run ios` or `npm run android`, whichever this machine is set up for).
2. With no income recorded: confirm the "Add Income" CTA appears and `safeToSpend` reads ₹0.
3. Navigate to Add, record an income transaction, return to Money Plan: confirm Safe to Spend, score, and Money Flow all update.
4. Drag a category slider: confirm Money Flow, the score/recommendation line in the hero, and the projection panel all update live.
5. Open a category card: confirm "Top Spending" shows real category names (or is empty, not fake placeholders, if no spend yet in that bucket).
6. Tap a Lifestyle Profile card: confirm sliders jump to that preset and all downstream numbers recompute.
7. Edit a category in Settings → Categories, change its Budget Bucket, save, and confirm Money Plan's bucket totals reflect the change on next load.
8. Save the plan when balanced: confirm the success modal and `MoneyPlanSaveBar` behave correctly, and that reopening the screen shows updated data.

If anything in this pass reveals a wrong number, fix it before considering the redesign complete — a broken live app is not offset by green unit tests.
