# Goals Financial-Planning Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the Goals screen from a jar tracker into a financial decision system that tells the user which goal to fund today, whether they can afford it, when they'll hit it, and whether it's at risk — backed by one shared intelligence service instead of duplicated math scattered across components.

**Architecture:** A new pure-function service (`src/services/goalIntelligence.ts`, no DB access) owns all goal scoring/ETA/priority/affordability math, mirroring the existing `moneyPlanIntelligence.ts` pattern. A new hook (`src/hooks/useGoalIntelligence.ts`, mirroring `useMoneyPlanIntelligence.ts`) fetches goals + their linked contribution history + savings capacity and feeds them through the pure functions, producing a ranked list the Goals screen renders directly. Contribution history becomes queryable per-goal by adding a real `goal_id` foreign key to `transactions` (migration 015), replacing today's fragile `description = 'Transfer to ' || name` string match.

**Tech Stack:** React Native 0.80.2, TypeScript, Zustand, `@op-engineering/op-sqlite`, Jest + `@testing-library/react-native`, Reanimated v3, `@react-native-community/datetimepicker` (already installed, currently unused).

**Design doc:** `docs/plans/2026-08-07-goals-financial-planning-redesign-design.md` — read this first for the product/UX rationale behind each decision below.

---

## Before you start

Run the existing suite once to get a clean baseline:

```bash
npx jest __tests__/store/goalStore.test.ts __tests__/services/insightsEngine.test.ts __tests__/services/moneyPlanIntelligence.test.ts
```

Expected: all passing. If anything is already red, stop and flag it before continuing — don't build on top of a broken baseline.

---

## Task 1: Fix the emergency-fund unit bug

**Files:**
- Modify: `src/store/goalStore.ts:128-168` (`getEmergencyFundTarget`)
- Test: `__tests__/store/goalStore.test.ts:29-71`

The bug: `targetAmount` is stored in paise everywhere else in the app, but `getEmergencyFundTarget()` divides the paise sum by 100 before storing it, so the emergency fund's target ends up 100x too small relative to `currentAmount`. The two existing tests currently assert the *buggy* behavior — they need to be corrected to assert paise-in/paise-out before the fix, following TDD (red first).

**Step 1: Update the existing tests to assert correct (paise) behavior**

Replace `__tests__/store/goalStore.test.ts:29-71` with:

```typescript
  it('calculates emergency fund target from last 6 months of expenses, staying in paise', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 60000000 }] // ₹6,00,000 in paise
    });
    mockExecute.mockResolvedValueOnce({}); // INSERT

    await useGoalStore.getState().getEmergencyFundTarget();

    // targetAmount must stay in paise, like currentAmount — no /100 anywhere.
    expect(useGoalStore.getState().goals[0]).toEqual(expect.objectContaining({
      name: 'Emergency Fund',
      targetAmount: 60000000,
      currentAmount: 0,
    }));
  });

  it('floors the target at ₹50,000 (5000000 paise) when expenses are low', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 1200000 }] // ₹12,000 in paise — below the floor
    });
    mockExecute.mockResolvedValueOnce({}); // INSERT

    await useGoalStore.getState().getEmergencyFundTarget();

    expect(useGoalStore.getState().goals[0].targetAmount).toBe(5000000);
  });

  it('updates existing emergency fund target, staying in paise', async () => {
    useGoalStore.setState({
      goals: [{ id: 'ef1', name: 'Emergency Fund', targetAmount: 10000000, currentAmount: 0, isEmergencyFund: true }],
    });

    mockExecute.mockResolvedValueOnce({
      rows: [{ total: 120000000 }] // ₹12,00,000 in paise
    });
    mockExecute.mockResolvedValueOnce({}); // UPDATE

    await useGoalStore.getState().getEmergencyFundTarget();

    expect(useGoalStore.getState().goals[0]).toEqual(expect.objectContaining({
      name: 'Emergency Fund',
      targetAmount: 120000000,
    }));
    expect(mockExecute).toHaveBeenCalledWith(
      'UPDATE goals SET targetAmount = ? WHERE id = ?',
      [120000000, 'ef1']
    );
  });
```

**Step 2: Run the tests to confirm they fail against the current buggy code**

Run: `npx jest __tests__/store/goalStore.test.ts -t "emergency fund"`
Expected: FAIL — actual `targetAmount` will be 1/100th of the new expected values (e.g. `600000` instead of `60000000`).

**Step 3: Fix the implementation**

In `src/store/goalStore.ts`, inside `getEmergencyFundTarget` (around line 144), change:

```typescript
      const totalPaise = (expenseResult.rows?.[0] as any)?.total || 0;
      // Convert to rupees and divide by 6 months, then multiply by 6 for the fund
      // Which essentially just means the total spent in last 6 months is the target!
      const targetAmount = Math.max(totalPaise / 100, 50000); // Floor of 50k
```

to:

```typescript
      const totalPaise = (expenseResult.rows?.[0] as any)?.total || 0;
      // targetAmount stays in paise, same unit as currentAmount — this used to
      // divide by 100 (rupees) while currentAmount stayed in paise, silently
      // making every emergency fund's progress math 100x wrong.
      const targetAmount = Math.max(totalPaise, 5000000); // Floor of ₹50,000
```

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/store/goalStore.test.ts`
Expected: PASS (all tests in the file, including the two unrelated ones you didn't touch).

**Step 5: Commit**

```bash
git add src/store/goalStore.ts __tests__/store/goalStore.test.ts
git commit -m "fix: emergency fund target stays in paise instead of dividing by 100"
```

---

## Task 2: Add `goal_id` to `transactions` (migration 015)

**Files:**
- Create: `src/db/migrations/015_goal_contribution_link.ts`
- Modify: `src/db/migrations/index.ts`

Per the existing convention (`__tests__/db/migrations.test.ts`'s trailing comment), migrations that run real SQL against `op-sqlite` aren't unit-tested under Jest — the native module doesn't resolve under Node. Only the pure-function migration *transforms* get unit tests. This migration has no transform logic worth extracting (it's a straight `ALTER TABLE` + best-effort backfill), so no test file is needed here — verify it manually on-device per Task 20.

**Step 1: Write the migration**

Create `src/db/migrations/015_goal_contribution_link.ts`:

```typescript
import type { DB } from '@op-engineering/op-sqlite';

/**
 * transactions.goal_id replaces the fragile `description = 'Transfer to ' ||
 * goals.name` string match used by FinancialIntelligenceEngine's transfer
 * report query — that match breaks on goal rename and collides when two
 * goals share a name. It's also the only way to query a single goal's
 * contribution history reliably, which the new goal intelligence layer
 * (velocity/ETA/stall detection) needs.
 */
export const migrate015GoalContributionLink = async (db: DB): Promise<void> => {
  const result = await db.execute("PRAGMA table_info('transactions');");
  const existingColumns = (result.rows || []).map((col: any) => col.name);

  if (!existingColumns.includes('goal_id')) {
    await db.execute('ALTER TABLE transactions ADD COLUMN goal_id TEXT REFERENCES goals(id);');
  }

  // Best-effort backfill for existing transfer_to_goal rows, using the same
  // string match the join used to rely on — one-time, not load-bearing going
  // forward since fundGoal() writes goal_id directly from here on.
  await db.execute(`
    UPDATE transactions
    SET goal_id = (
      SELECT g.id FROM goals g WHERE transactions.description = 'Transfer to ' || g.name
      LIMIT 1
    )
    WHERE type = 'transfer_to_goal' AND goal_id IS NULL;
  `);
};
```

**Step 2: Register it**

In `src/db/migrations/index.ts`, add the import near the other migration imports (after line 15):

```typescript
import { migrate015GoalContributionLink } from './015_goal_contribution_link';
```

And add the version block at the end of `runMigrations`, after the `currentVersion < 14` block (after line 95):

```typescript

  if (currentVersion < 15) {
    await migrate015GoalContributionLink(db);
    await db.execute('PRAGMA user_version = 15;');
  }
```

**Step 3: Commit**

```bash
git add src/db/migrations/015_goal_contribution_link.ts src/db/migrations/index.ts
git commit -m "feat: add goal_id column to transactions for reliable per-goal contribution history"
```

---

## Task 3: `FinancialLedgerService.fundGoal` writes `goal_id`

**Files:**
- Modify: `src/services/FinancialLedgerService.ts:98-123`

No dedicated test file exists yet for this service — this task creates one, scoped to just the two methods this plan touches.

**Step 1: Write the failing test**

Create `__tests__/services/FinancialLedgerService.test.ts`:

```typescript
const mockExecute = jest.fn();
const mockTransaction = jest.fn(async (cb: (tx: { execute: jest.Mock }) => Promise<void>) => {
  await cb({ execute: mockExecute });
});
jest.mock('../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute, transaction: mockTransaction }),
}));
jest.mock('../../src/store/transactionStore', () => ({
  resolveCategoryId: jest.fn().mockResolvedValue('cat-savings'),
}));
jest.mock('../../src/services/EventBus', () => ({
  financialEventBus: { emit: jest.fn(), subscribe: jest.fn() },
}));

import { FinancialLedgerService } from '../../src/services/FinancialLedgerService';

describe('FinancialLedgerService.fundGoal', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockTransaction.mockClear();
  });

  it('writes goal_id on the transfer transaction it inserts', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('SELECT * FROM goals')) {
        return Promise.resolve({ rows: [{ id: 'g1', name: 'Car', currentAmount: 10000, targetAmount: 500000 }] });
      }
      return Promise.resolve({});
    });

    await FinancialLedgerService.fundGoal('g1', 5000);

    const insertCall = mockExecute.mock.calls.find(([sql]: [string]) => sql.includes('INSERT INTO transactions'));
    expect(insertCall).toBeDefined();
    const [sql, args] = insertCall as [string, unknown[]];
    expect(sql).toContain('goal_id');
    // args order must match the column list in the INSERT
    expect(args).toContain('g1');
  });
});
```

**Step 2: Run it to confirm it fails**

Run: `npx jest __tests__/services/FinancialLedgerService.test.ts`
Expected: FAIL — current INSERT has no `goal_id` column, so `sql).toContain('goal_id')` fails.

**Step 3: Update the implementation**

In `src/services/FinancialLedgerService.ts`, replace the `fundGoal` body (lines 98-123):

```typescript
  async fundGoal(goalId: string, amountPaise: number): Promise<void> {
    const db = getDb();
    const newTxId = generateTxId();

    await db.transaction(async (sqlTx: any) => {
      const goalRow = await sqlTx.execute('SELECT * FROM goals WHERE id = ?;', [goalId]);
      const goal = goalRow.rows?.[0] as any;
      if (!goal) throw new Error('Goal not found');

      // 1. Update the Goal
      const newAmount = goal.currentAmount + amountPaise;
      await sqlTx.execute('UPDATE goals SET currentAmount = ? WHERE id = ?;', [newAmount, goalId]);

      // 2. Insert the Ledger Expense (Transfer)
      // Force it to a "Savings" category name so the budget_bucket matcher assigns it to savings.
      const categoryId = await resolveCategoryId(sqlTx, 'Savings Transfer', 'bank-transfer');
      await sqlTx.execute(
        `INSERT INTO transactions
           (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash, goal_id)
         VALUES (?, ?, 'transfer_to_goal', ?, NULL, ?, ?, 'Transfer', NULL, NULL, ?)`,
        [newTxId, amountPaise, categoryId, `Transfer to ${goal.name}`, Date.now(), goalId],
      );
    });

    financialEventBus.emit();
  },
```

**Step 4: Run the test to confirm it passes**

Run: `npx jest __tests__/services/FinancialLedgerService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/FinancialLedgerService.ts __tests__/services/FinancialLedgerService.test.ts
git commit -m "feat: fundGoal writes goal_id on the transfer transaction"
```

---

## Task 4: `FinancialLedgerService.getGoalContributions`

**Files:**
- Modify: `src/services/FinancialLedgerService.ts` (add new method)
- Test: `__tests__/services/FinancialLedgerService.test.ts` (extend from Task 3)

This is the read-side counterpart Task 3 set up — it's what `useGoalIntelligence` (Task 12) will call to build each goal's contribution history for velocity/ETA/stall math.

**Step 1: Write the failing test**

Add to `__tests__/services/FinancialLedgerService.test.ts`:

```typescript
describe('FinancialLedgerService.getGoalContributions', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('returns contributions ordered oldest to newest, mapped to amount/date pairs', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { amount_paise: 5000, occurred_at: 1000 },
        { amount_paise: 3000, occurred_at: 2000 },
      ],
    });

    const result = await FinancialLedgerService.getGoalContributions('g1');

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE goal_id = ?'),
      ['g1'],
    );
    expect(result).toEqual([
      { amountPaise: 5000, occurredAtMs: 1000 },
      { amountPaise: 3000, occurredAtMs: 2000 },
    ]);
  });
});
```

**Step 2: Run it to confirm it fails**

Run: `npx jest __tests__/services/FinancialLedgerService.test.ts -t "getGoalContributions"`
Expected: FAIL — `getGoalContributions` doesn't exist yet.

**Step 3: Implement it**

In `src/services/FinancialLedgerService.ts`, add this method inside the `FinancialLedgerService` object, after `fundGoal`:

```typescript
  /** Ordered oldest-to-newest — goalIntelligence's velocity/ETA math reads it front-to-back. */
  async getGoalContributions(goalId: string): Promise<{ amountPaise: number; occurredAtMs: number }[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT amount_paise, occurred_at FROM transactions
       WHERE goal_id = ? AND type = 'transfer_to_goal'
       ORDER BY occurred_at ASC;`,
      [goalId],
    );
    return ((result.rows || []) as any[]).map(row => ({
      amountPaise: row.amount_paise,
      occurredAtMs: row.occurred_at,
    }));
  },
```

**Step 4: Run the test to confirm it passes**

Run: `npx jest __tests__/services/FinancialLedgerService.test.ts`
Expected: PASS (both describe blocks)

**Step 5: Commit**

```bash
git add src/services/FinancialLedgerService.ts __tests__/services/FinancialLedgerService.test.ts
git commit -m "feat: add FinancialLedgerService.getGoalContributions for per-goal history"
```

---

## Task 5: Fix the fragile join in `FinancialIntelligenceEngine`

**Files:**
- Modify: `src/services/FinancialIntelligenceEngine.ts:233-238`

No existing test file covers `FinancialIntelligenceEngine`; this is a small, surgical fix, so this task changes the query without adding a new full test harness for the whole file (out of scope for this plan — flag to the user afterward if broader coverage is wanted).

**Step 1: Update the query**

In `src/services/FinancialIntelligenceEngine.ts`, replace the transfer-details query (around lines 233-238):

```typescript
      db.execute(
        `SELECT t.id, t.amount_paise, t.occurred_at, g.name as goalName, g.targetAmount, g.currentAmount, g.deadline
         FROM transactions t
         LEFT JOIN goals g ON t.description = 'Transfer to ' || g.name
         WHERE t.type = 'transfer_to_goal' AND t.occurred_at >= ? AND t.occurred_at < ?
         ORDER BY t.occurred_at DESC`,
        [monthStart, nextMonthStart]
      )
```

with:

```typescript
      db.execute(
        `SELECT t.id, t.amount_paise, t.occurred_at, g.name as goalName, g.targetAmount, g.currentAmount, g.deadline
         FROM transactions t
         LEFT JOIN goals g ON t.goal_id = g.id
         WHERE t.type = 'transfer_to_goal' AND t.occurred_at >= ? AND t.occurred_at < ?
         ORDER BY t.occurred_at DESC`,
        [monthStart, nextMonthStart]
      )
```

The `r.goalName || r.description?.replace('Transfer to ', '')` fallback a few lines below (in the `transferDetails` map) can stay as-is — it's a reasonable last-resort display fallback for the rare pre-migration-015 row the backfill couldn't match, not something to remove.

**Step 2: Manual verification**

This file has no test harness to run automatically (see note above). Verify on-device per Task 20 by confirming a fresh goal contribution still appears correctly in Reports.

**Step 3: Commit**

```bash
git add src/services/FinancialIntelligenceEngine.ts
git commit -m "fix: join goal transfers on goal_id instead of a description string match"
```

---

## Task 6: `goalIntelligence.ts` — `computeProgress`

**Files:**
- Create: `src/services/goalIntelligence.ts`
- Test: `__tests__/services/goalIntelligence.test.ts`

This is the shared math the three duplicated `Math.min(100, Math.round(...))` call sites (`FocusGoalHeroCard`, `SecondaryGoalCard`, `GoalsHeroDashboard`) will import instead of recomputing.

**Step 1: Write the failing test**

Create `__tests__/services/goalIntelligence.test.ts`:

```typescript
import { computeProgress } from '../../src/services/goalIntelligence';

describe('computeProgress', () => {
  it('returns a rounded percentage, capped at 100', () => {
    expect(computeProgress(25000, 100000)).toBe(25);
    expect(computeProgress(150000, 100000)).toBe(100);
  });

  it('returns 0 when target is zero or negative instead of dividing by zero', () => {
    expect(computeProgress(5000, 0)).toBe(0);
    expect(computeProgress(5000, -100)).toBe(0);
  });

  it('returns 0 for a brand-new goal with no contributions', () => {
    expect(computeProgress(0, 100000)).toBe(0);
  });
});
```

**Step 2: Run it to confirm it fails**

Run: `npx jest __tests__/services/goalIntelligence.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement it**

Create `src/services/goalIntelligence.ts`:

```typescript
import { Goal } from '../store/goalStore';
import { Money } from '../utils/money';

export const computeProgress = (currentAmountPaise: number, targetAmountPaise: number): number => {
  if (targetAmountPaise <= 0) return 0;
  return Math.min(100, Math.round((currentAmountPaise / targetAmountPaise) * 100));
};
```

**Step 4: Run the test to confirm it passes**

Run: `npx jest __tests__/services/goalIntelligence.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/goalIntelligence.ts __tests__/services/goalIntelligence.test.ts
git commit -m "feat: add goalIntelligence service with shared progress math"
```

---

## Task 7: `goalIntelligence.ts` — `computeGoalHealth`

**Files:**
- Modify: `src/services/goalIntelligence.ts`
- Test: `__tests__/services/goalIntelligence.test.ts`

This is the core of the redesign: velocity, ETA, stall detection, and at-risk/overdue state, all from one function so the UI never has to re-derive it.

**Step 1: Write the failing tests**

Add to `__tests__/services/goalIntelligence.test.ts`:

```typescript
import { computeGoalHealth, GoalContribution } from '../../src/services/goalIntelligence';
import { Goal } from '../../src/store/goalStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-07T00:00:00Z').getTime();

const baseGoal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 40000 };

describe('computeGoalHealth', () => {
  it('marks a fully-funded goal as completed regardless of pace', () => {
    const health = computeGoalHealth({ ...baseGoal, currentAmount: 100000 }, [], NOW);
    expect(health.state).toBe('completed');
    expect(health.score).toBe(100);
    expect(health.etaLabel).toBeNull();
  });

  it('marks a goal with no contributions in 21+ days as stalled', () => {
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 30 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.state).toBe('stalled');
    expect(health.daysSinceLastContribution).toBe(30);
  });

  it('marks a goal with a recent contribution and no deadline as healthy', () => {
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 5 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.state).toBe('healthy');
    expect(health.daysSinceLastContribution).toBe(5);
  });

  it('projects a velocity-based ETA in months when there is no deadline', () => {
    // ₹10,000/month average over the trailing 3 months, ₹60,000 remaining -> 6 months
    const contributions: GoalContribution[] = [
      { amountPaise: 10000, occurredAtMs: NOW - 10 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 40 * DAY_MS },
      { amountPaise: 10000, occurredAtMs: NOW - 70 * DAY_MS },
    ];
    const health = computeGoalHealth(baseGoal, contributions, NOW);
    expect(health.etaLabel).toBe('~6 months at current pace');
  });

  it('flags at_risk when pace is behind a set deadline', () => {
    const goalWithDeadline: Goal = {
      ...baseGoal,
      deadline: new Date(NOW + 30 * DAY_MS).toISOString(), // 1 month away
    };
    // Only ₹5,000 saved this trailing period against a ₹60,000 gap in 1 month — way behind.
    const contributions: GoalContribution[] = [
      { amountPaise: 5000, occurredAtMs: NOW - 10 * DAY_MS },
    ];
    const health = computeGoalHealth(goalWithDeadline, contributions, NOW);
    expect(health.state).toBe('at_risk');
    expect(health.isPaceBehindDeadline).toBe(true);
  });

  it('flags overdue when the deadline has already passed and the goal is incomplete', () => {
    const goalWithPastDeadline: Goal = {
      ...baseGoal,
      deadline: new Date(NOW - 5 * DAY_MS).toISOString(),
    };
    const health = computeGoalHealth(goalWithPastDeadline, [], NOW);
    expect(health.state).toBe('overdue');
  });

  it('never contributed yet reports Infinity days since last contribution', () => {
    const health = computeGoalHealth(baseGoal, [], NOW);
    expect(health.daysSinceLastContribution).toBe(Infinity);
    expect(health.state).toBe('stalled');
  });
});
```

**Step 2: Run to confirm failure**

Run: `npx jest __tests__/services/goalIntelligence.test.ts -t "computeGoalHealth"`
Expected: FAIL — `computeGoalHealth` and `GoalContribution` don't exist yet.

**Step 3: Implement it**

Append to `src/services/goalIntelligence.ts`:

```typescript
export interface GoalContribution {
  amountPaise: number;
  occurredAtMs: number;
}

export type GoalState = 'healthy' | 'stalled' | 'at_risk' | 'overdue' | 'completed';

export interface GoalHealth {
  state: GoalState;
  score: number; // 0-100
  progressPercent: number; // 0-100
  monthlyVelocityPaise: number; // trailing 3-month average contribution, paise/month
  etaLabel: string | null;
  daysSinceLastContribution: number; // Infinity if never contributed
  isPaceBehindDeadline: boolean;
}

const STALL_DAYS_THRESHOLD = 21;
const VELOCITY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // trailing 3 months
const DAY_MS = 24 * 60 * 60 * 1000;

const monthsBetween = (fromMs: number, toMs: number): number =>
  Math.max(0, (toMs - fromMs) / (30 * DAY_MS));

/**
 * Averages over a fixed 3-month window (not "however many months of history
 * exist") so a goal funded once 2 years ago doesn't look like it still has
 * live momentum today — dividing by 3 always, not by however many
 * contributions fall in the window.
 */
const computeMonthlyVelocity = (contributions: GoalContribution[], nowMs: number): number => {
  const windowStart = nowMs - VELOCITY_WINDOW_MS;
  const recentTotal = contributions
    .filter(c => c.occurredAtMs >= windowStart)
    .reduce((sum, c) => sum + c.amountPaise, 0);
  return Math.round(recentTotal / 3);
};

export const computeGoalHealth = (
  goal: Goal,
  contributions: GoalContribution[],
  nowMs: number,
): GoalHealth => {
  const progressPercent = computeProgress(goal.currentAmount, goal.targetAmount);
  const completed = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;

  const lastContributionMs = contributions.length
    ? Math.max(...contributions.map(c => c.occurredAtMs))
    : null;
  const daysSinceLastContribution = lastContributionMs === null
    ? Infinity
    : Math.floor((nowMs - lastContributionMs) / DAY_MS);

  if (completed) {
    return {
      state: 'completed',
      score: 100,
      progressPercent: 100,
      monthlyVelocityPaise: computeMonthlyVelocity(contributions, nowMs),
      etaLabel: null,
      daysSinceLastContribution,
      isPaceBehindDeadline: false,
    };
  }

  const monthlyVelocityPaise = computeMonthlyVelocity(contributions, nowMs);
  const remainingPaise = goal.targetAmount - goal.currentAmount;
  const deadlineMs = goal.deadline ? new Date(goal.deadline).getTime() : null;
  const isOverdue = deadlineMs !== null && deadlineMs < nowMs;

  let etaLabel: string | null = null;
  let isPaceBehindDeadline = false;

  if (deadlineMs !== null && !isOverdue) {
    const monthsUntilDeadline = monthsBetween(nowMs, deadlineMs);
    const requiredMonthlyPaise = monthsUntilDeadline > 0 ? remainingPaise / monthsUntilDeadline : remainingPaise;
    isPaceBehindDeadline = monthlyVelocityPaise < requiredMonthlyPaise;
    const deadlineDate = new Date(deadlineMs);
    etaLabel = `by ${deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else if (deadlineMs === null && monthlyVelocityPaise > 0) {
    const monthsToGo = Math.ceil(remainingPaise / monthlyVelocityPaise);
    etaLabel = `~${monthsToGo} month${monthsToGo === 1 ? '' : 's'} at current pace`;
  }

  const isStalled = daysSinceLastContribution >= STALL_DAYS_THRESHOLD;

  let state: GoalState;
  if (isOverdue) state = 'overdue';
  else if (isPaceBehindDeadline) state = 'at_risk';
  else if (isStalled) state = 'stalled';
  else state = 'healthy';

  let score = progressPercent;
  if (state === 'overdue') score = Math.max(0, score - 40);
  else if (state === 'at_risk') score = Math.max(0, score - 30);
  else if (state === 'stalled') score = Math.max(0, score - 20);

  return {
    state,
    score,
    progressPercent,
    monthlyVelocityPaise,
    etaLabel,
    daysSinceLastContribution,
    isPaceBehindDeadline,
  };
};
```

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/services/goalIntelligence.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/goalIntelligence.ts __tests__/services/goalIntelligence.test.ts
git commit -m "feat: add computeGoalHealth with velocity, ETA, stall, and at-risk detection"
```

---

## Task 8: `goalIntelligence.ts` — `rankGoalPriority`

**Files:**
- Modify: `src/services/goalIntelligence.ts`
- Test: `__tests__/services/goalIntelligence.test.ts`

This becomes the **one** definition of "primary goal" — both the Goals screen (Task 19) and `insightsEngine.getPrimaryGoal()` (Task 10) call it instead of each keeping their own logic.

**Step 1: Write the failing tests**

Add to `__tests__/services/goalIntelligence.test.ts`:

```typescript
import { rankGoalPriority } from '../../src/services/goalIntelligence';

describe('rankGoalPriority', () => {
  const health = (overrides: Partial<import('../../src/services/goalIntelligence').GoalHealth> = {}) => ({
    state: 'healthy' as const,
    score: 50,
    progressPercent: 50,
    monthlyVelocityPaise: 1000,
    etaLabel: null,
    daysSinceLastContribution: 1,
    isPaceBehindDeadline: false,
    ...overrides,
  });

  it('always ranks the emergency fund first regardless of other goals\' urgency', () => {
    const entries = [
      { goal: { id: 'a', name: 'Car', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'overdue', score: 10 }) },
      { goal: { id: 'ef', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 10000, isEmergencyFund: true }, health: health({ score: 30 }) },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked[0].goal.id).toBe('ef');
  });

  it('ranks overdue and at_risk goals above merely stalled or healthy ones', () => {
    const entries = [
      { goal: { id: 'healthy', name: 'A', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'healthy' }) },
      { goal: { id: 'atrisk', name: 'B', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'at_risk' }) },
      { goal: { id: 'stalled', name: 'C', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'stalled' }) },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked.map(r => r.goal.id)).toEqual(['atrisk', 'stalled', 'healthy']);
  });

  it('sinks completed goals to the bottom', () => {
    const entries = [
      { goal: { id: 'done', name: 'Done', targetAmount: 100000, currentAmount: 100000 }, health: health({ state: 'completed', score: 100 }) },
      { goal: { id: 'active', name: 'Active', targetAmount: 100000, currentAmount: 0 }, health: health({ state: 'stalled' }) },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked[ranked.length - 1].goal.id).toBe('done');
  });

  it('assigns 1-based priorityRank and a human-readable priorityReason', () => {
    const entries = [
      { goal: { id: 'ef', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 0, isEmergencyFund: true }, health: health() },
    ];
    const ranked = rankGoalPriority(entries);
    expect(ranked[0].priorityRank).toBe(1);
    expect(typeof ranked[0].priorityReason).toBe('string');
    expect(ranked[0].priorityReason.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run to confirm failure**

Run: `npx jest __tests__/services/goalIntelligence.test.ts -t "rankGoalPriority"`
Expected: FAIL — `rankGoalPriority` doesn't exist yet.

**Step 3: Implement it**

Append to `src/services/goalIntelligence.ts`:

```typescript
export interface RankedGoal {
  goal: Goal;
  health: GoalHealth;
  priorityRank: number; // 1-based
  priorityReason: string;
}

const priorityReasonFor = (goal: Goal, health: GoalHealth): string => {
  if (goal.isEmergencyFund) return 'Emergency fund always comes first';
  if (health.state === 'overdue') return 'Past its deadline';
  if (health.state === 'at_risk') return 'Behind pace for its deadline';
  if (health.state === 'stalled') return `No contribution in ${health.daysSinceLastContribution} days`;
  if (health.state === 'completed') return 'Already complete';
  return health.progressPercent >= 50 ? 'Closest to completion' : 'On track';
};

const URGENCY_WEIGHT: Record<GoalState, number> = {
  overdue: 300,
  at_risk: 200,
  stalled: 100,
  healthy: 0,
  completed: -1000, // sinks below every active goal
};

export const rankGoalPriority = (
  entries: { goal: Goal; health: GoalHealth }[],
): RankedGoal[] => {
  const scored = entries.map(entry => {
    const emergencyBonus = entry.goal.isEmergencyFund ? 1000 : 0;
    const urgencyScore = URGENCY_WEIGHT[entry.health.state];
    // Small tiebreak toward closer-to-completion within the same urgency tier.
    const priorityScore = emergencyBonus + urgencyScore + entry.health.progressPercent;
    return { ...entry, priorityScore };
  });

  scored.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.goal.id.localeCompare(b.goal.id); // deterministic tiebreak
  });

  return scored.map((entry, index) => ({
    goal: entry.goal,
    health: entry.health,
    priorityRank: index + 1,
    priorityReason: priorityReasonFor(entry.goal, entry.health),
  }));
};
```

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/services/goalIntelligence.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/goalIntelligence.ts __tests__/services/goalIntelligence.test.ts
git commit -m "feat: add rankGoalPriority as the single primary-goal definition"
```

---

## Task 9: `goalIntelligence.ts` — affordability, what-if, and recommendation copy

**Files:**
- Modify: `src/services/goalIntelligence.ts`
- Test: `__tests__/services/goalIntelligence.test.ts`

**Step 1: Write the failing tests**

Add to `__tests__/services/goalIntelligence.test.ts`:

```typescript
import { checkAffordability, simulateWhatIf, recommendContribution, generateRecommendationCopy } from '../../src/services/goalIntelligence';

describe('checkAffordability', () => {
  it('is affordable when the amount fits within remaining savings budget this month', () => {
    const result = checkAffordability(20000, 30000, 100000); // want ₹200, already put in ₹300 of a ₹1000 budget
    expect(result.affordable).toBe(true);
    expect(result.remainingPaise).toBe(70000);
  });

  it('warns (not blocks) when the amount exceeds remaining budget', () => {
    const result = checkAffordability(90000, 30000, 100000); // want ₹900, only ₹700 left
    expect(result.affordable).toBe(false);
    expect(result.remainingPaise).toBe(70000);
    expect(result.message).toMatch(/more than/i);
  });

  it('treats a zero or unknown savings budget as "can\'t evaluate" rather than always-unaffordable', () => {
    const result = checkAffordability(10000, 0, 0);
    expect(result.affordable).toBe(true);
    expect(result.message).toMatch(/set your income/i);
  });
});

describe('simulateWhatIf', () => {
  it('recomputes ETA with extra monthly velocity added', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 120000, currentAmount: 0 };
    const health = computeGoalHealth(goal, [], NOW); // 0 velocity, no ETA
    const result = simulateWhatIf(goal, health, 20000); // +₹200/month
    expect(result.etaLabel).toBe('~6 months at current pace');
  });

  it('returns null ETA when even the hypothetical velocity is zero', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 120000, currentAmount: 0 };
    const health = computeGoalHealth(goal, [], NOW);
    const result = simulateWhatIf(goal, health, 0);
    expect(result.etaLabel).toBeNull();
  });
});

describe('recommendContribution', () => {
  it('suggests the amount needed to hit a set deadline, capped by what is affordable', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 120000, currentAmount: 0, deadline: new Date(NOW + 60 * DAY_MS).toISOString() };
    const health = computeGoalHealth(goal, [], NOW);
    const suggestion = recommendContribution(goal, health, 30000); // only ₹300 affordable this month
    expect(suggestion).toBe(30000); // capped, even though ₹60,000 would be needed for the deadline
  });

  it('suggests a fraction of the remaining gap when there is no deadline', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 0 };
    const health = computeGoalHealth(goal, [], NOW);
    const suggestion = recommendContribution(goal, health, 1000000); // affordability isn't the constraint here
    expect(suggestion).toBe(10000); // 10% of the ₹1,00,000 gap
  });
});

describe('generateRecommendationCopy', () => {
  it('produces a sentence that mentions the priority reason for the top-ranked goal', () => {
    const goal: Goal = { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 50000 };
    const health = computeGoalHealth(goal, [{ amountPaise: 5000, occurredAtMs: NOW - 40 * DAY_MS }], NOW);
    const copy = generateRecommendationCopy(goal, health, 'No contribution in 40 days');
    expect(copy).toContain('Laptop');
    expect(copy.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run to confirm failure**

Run: `npx jest __tests__/services/goalIntelligence.test.ts -t "checkAffordability|simulateWhatIf|recommendContribution|generateRecommendationCopy"`
Expected: FAIL — none of these exist yet.

**Step 3: Implement**

Append to `src/services/goalIntelligence.ts`:

```typescript
export interface AffordabilityCheck {
  affordable: boolean;
  remainingPaise: number;
  message: string;
}

export const checkAffordability = (
  amountPaise: number,
  monthlyContributedSoFarPaise: number,
  savingsBudgetPaise: number,
): AffordabilityCheck => {
  if (savingsBudgetPaise <= 0) {
    return {
      affordable: true,
      remainingPaise: 0,
      message: 'Set your income in Money Plan to see how this fits your monthly budget.',
    };
  }

  const remainingPaise = Math.max(0, savingsBudgetPaise - monthlyContributedSoFarPaise);
  const affordable = amountPaise <= remainingPaise;

  return {
    affordable,
    remainingPaise,
    message: affordable
      ? `Within your ${Money.format(remainingPaise, { zeroDecimals: true })} remaining savings budget this month.`
      : `This is ${Money.format(amountPaise - remainingPaise, { zeroDecimals: true })} more than your remaining savings budget this month.`,
  };
};

export const simulateWhatIf = (
  goal: Goal,
  health: GoalHealth,
  extraMonthlyPaise: number,
): { etaLabel: string | null } => {
  const hypotheticalVelocity = health.monthlyVelocityPaise + extraMonthlyPaise;
  const remainingPaise = goal.targetAmount - goal.currentAmount;

  if (hypotheticalVelocity <= 0 || remainingPaise <= 0) {
    return { etaLabel: null };
  }

  const monthsToGo = Math.ceil(remainingPaise / hypotheticalVelocity);
  return { etaLabel: `~${monthsToGo} month${monthsToGo === 1 ? '' : 's'} at current pace` };
};

/**
 * Deadline-driven amount when a deadline exists (what closes the pace gap),
 * otherwise 10% of the remaining gap as a reasonable default nudge — either
 * way capped by what's actually affordable this month, never a number the
 * user can't act on.
 */
export const recommendContribution = (
  goal: Goal,
  health: GoalHealth,
  remainingAffordablePaise: number,
): number => {
  const remainingGapPaise = Math.max(0, goal.targetAmount - goal.currentAmount);
  if (remainingGapPaise === 0) return 0;

  let idealPaise: number;
  if (goal.deadline) {
    const monthsUntilDeadline = monthsBetween(Date.now(), new Date(goal.deadline).getTime());
    idealPaise = monthsUntilDeadline > 0 ? Math.ceil(remainingGapPaise / monthsUntilDeadline) : remainingGapPaise;
  } else {
    idealPaise = Math.ceil(remainingGapPaise * 0.1);
  }

  return Math.max(0, Math.min(idealPaise, remainingAffordablePaise, remainingGapPaise));
};

export const generateRecommendationCopy = (
  goal: Goal,
  health: GoalHealth,
  priorityReason: string,
): string => {
  if (health.state === 'completed') return `${goal.name} is fully funded — nice work.`;
  if (health.state === 'overdue') return `${goal.name} passed its deadline. Update the date or add funds to get back on track.`;
  if (health.state === 'at_risk') return `${goal.name} is behind pace — ${priorityReason.toLowerCase()}.`;
  if (health.state === 'stalled') return `${goal.name} hasn't moved in ${health.daysSinceLastContribution} days.`;
  return health.etaLabel
    ? `${goal.name} is on track — ${health.etaLabel}.`
    : `${goal.name} is on track.`;
};
```

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/services/goalIntelligence.test.ts`
Expected: PASS (full file — re-run the whole suite to make sure nothing upstream broke)

**Step 5: Commit**

```bash
git add src/services/goalIntelligence.ts __tests__/services/goalIntelligence.test.ts
git commit -m "feat: add affordability, what-if, and recommendation copy to goalIntelligence"
```

---

## Task 10: `insightsEngine.getPrimaryGoal()` delegates to `rankGoalPriority`

**Files:**
- Modify: `src/services/insightsEngine.ts:77-98` (`getPrimaryGoal`)
- Test: `__tests__/services/insightsEngine.test.ts`

This removes the second, conflicting definition of "primary goal" — the milestone-notification code path (line ~243) keeps working unchanged since `getPrimaryGoal()`'s external signature doesn't change.

**Step 1: Write the failing test**

Add to `__tests__/services/insightsEngine.test.ts` (adjust the mock setup at the top if needed to also mock `FinancialLedgerService`):

```typescript
jest.mock('../../src/services/FinancialLedgerService', () => ({
  FinancialLedgerService: { getGoalContributions: jest.fn().mockResolvedValue([]) },
}));

import { getPrimaryGoal } from '../../src/services/insightsEngine';

describe('getPrimaryGoal', () => {
  it('returns the emergency fund even when another goal is closer to completion', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        { id: 'car', name: 'Car', targetAmount: 100000, currentAmount: 90000, is_emergency_fund: 0 },
        { id: 'ef', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 1000, is_emergency_fund: 1 },
      ],
    });

    const result = await getPrimaryGoal();

    expect(result?.id).toBe('ef');
  });

  it('returns null when there are no goals', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    expect(await getPrimaryGoal()).toBeNull();
  });
});
```

**Step 2: Run to confirm current behavior differs (or passes coincidentally)**

Run: `npx jest __tests__/services/insightsEngine.test.ts -t "getPrimaryGoal"`
Expected: The first test should already pass today by coincidence (emergency fund is already first in the old `ORDER BY` too) — that's fine, this is a refactor-with-safety-net, not a behavior-fixing test. Confirm it passes before *and* after the refactor in Step 4, so you know the refactor didn't silently change behavior.

**Step 3: Refactor the implementation**

In `src/services/insightsEngine.ts`, replace `getPrimaryGoal` (lines 77-98):

```typescript
export const getPrimaryGoal = async (): Promise<Goal | null> => {
  const db = getDb();

  try {
    const result = await db.execute(`
      SELECT id, name, targetAmount, currentAmount
      FROM goals
      ORDER BY
        CASE WHEN is_emergency_fund = 1 THEN 0 ELSE 1 END,
        (currentAmount * 1.0 / NULLIF(targetAmount, 0)) DESC
      LIMIT 1
    `);
    if (!result.rows || result.rows.length === 0) return null;

    const row = result.rows[0] as any;
    return {
      id: row.id,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
    };
```

with:

```typescript
export const getPrimaryGoal = async (): Promise<Goal | null> => {
  const db = getDb();

  try {
    const result = await db.execute(
      'SELECT id, name, targetAmount, currentAmount, deadline, is_emergency_fund FROM goals;',
    );
    const rows = (result.rows || []) as any[];
    if (rows.length === 0) return null;

    const goals: Goal[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
      deadline: row.deadline || undefined,
      isEmergencyFund: row.is_emergency_fund === 1,
    }));

    const now = Date.now();
    const entries = await Promise.all(
      goals.map(async goal => ({
        goal,
        health: computeGoalHealth(goal, await FinancialLedgerService.getGoalContributions(goal.id), now),
      })),
    );

    return rankGoalPriority(entries)[0]?.goal ?? null;
```

Add the two new imports at the top of `src/services/insightsEngine.ts`:

```typescript
import { computeGoalHealth, rankGoalPriority } from './goalIntelligence';
import { FinancialLedgerService } from './FinancialLedgerService';
```

Leave the rest of the `try`/`catch` (the closing brace and error handling) as-is — only the body of the `try` block changes.

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/services/insightsEngine.test.ts`
Expected: PASS (full file)

**Step 5: Commit**

```bash
git add src/services/insightsEngine.ts __tests__/services/insightsEngine.test.ts
git commit -m "refactor: getPrimaryGoal delegates to rankGoalPriority, removing the second primary-goal definition"
```

---

## Task 11: `useGoalIntelligence` hook

**Files:**
- Create: `src/hooks/useGoalIntelligence.ts`
- Test: `__tests__/hooks/useGoalIntelligence.test.ts`

Mirrors `useMoneyPlanIntelligence.ts`'s shape: a hook that loads real data and hands back the pure-function results, so `GoalsScreen` never touches the DB or the scoring math directly. It combines: goals from `useGoalStore`, per-goal contribution history from `FinancialLedgerService`, and this month's savings capacity from `FinancialIntelligenceEngine`.

**Step 1: Check what `FinancialIntelligenceEngine` exports for savings capacity**

Before writing the test, confirm the exact function/field name — run:

```bash
grep -n "export const\|savingsBudget" src/services/FinancialIntelligenceEngine.ts | head -20
```

Use whatever the snapshot-building function is called (per the earlier audit, it returns `IntelligenceSnapshot` with a `savingsBudget: number` field, paise) — reference that exact name in the hook.

**Step 2: Write the failing test**

Create `__tests__/hooks/useGoalIntelligence.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../src/services/FinancialLedgerService', () => ({
  FinancialLedgerService: { getGoalContributions: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../../src/services/FinancialIntelligenceEngine', () => ({
  FinancialIntelligenceEngine: {
    getSnapshot: jest.fn().mockResolvedValue({ savingsBudget: 500000 }),
  },
}));
jest.mock('../../src/store/goalStore', () => ({
  useGoalStore: jest.fn(),
}));

import { useGoalStore } from '../../src/store/goalStore';
import { FinancialLedgerService } from '../../src/services/FinancialLedgerService';
import { useGoalIntelligence } from '../../src/hooks/useGoalIntelligence';

describe('useGoalIntelligence', () => {
  beforeEach(() => {
    (useGoalStore as unknown as jest.Mock).mockReturnValue({
      goals: [
        { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 20000 },
      ],
    });
  });

  it('returns a ranked list with health attached for each goal', async () => {
    (FinancialLedgerService.getGoalContributions as jest.Mock).mockResolvedValue([
      { amountPaise: 5000, occurredAtMs: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    ]);

    const { result } = renderHook(() => useGoalIntelligence());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rankedGoals).toHaveLength(1);
    expect(result.current.rankedGoals[0].goal.id).toBe('g1');
    expect(result.current.rankedGoals[0].health.state).toBe('healthy');
    expect(result.current.savingsBudgetRemainingPaise).toBe(500000);
  });
});
```

**Step 3: Run to confirm it fails**

Run: `npx jest __tests__/hooks/useGoalIntelligence.test.ts`
Expected: FAIL — module doesn't exist.

**Step 4: Implement the hook**

Create `src/hooks/useGoalIntelligence.ts`. Adjust the `FinancialIntelligenceEngine` call to match whatever you found in Step 1 (function name, and whether it needs the current month passed in — follow the existing call convention used elsewhere in the codebase, e.g. in `ReportsScreen.tsx` or `FinancialContextService.ts`):

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useGoalStore } from '../store/goalStore';
import { FinancialLedgerService } from '../services/FinancialLedgerService';
import { FinancialIntelligenceEngine } from '../services/FinancialIntelligenceEngine';
import { computeGoalHealth, rankGoalPriority, RankedGoal } from '../services/goalIntelligence';
import { financialEventBus } from '../services/EventBus';

export interface GoalIntelligence {
  rankedGoals: RankedGoal[];
  savingsBudgetRemainingPaise: number;
  loading: boolean;
  reload: () => Promise<void>;
}

export const useGoalIntelligence = (): GoalIntelligence => {
  const { goals } = useGoalStore();
  const [rankedGoals, setRankedGoals] = useState<RankedGoal[]>([]);
  const [savingsBudgetRemainingPaise, setSavingsBudgetRemainingPaise] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const now = Date.now();

    const [snapshot, contributionsByGoal] = await Promise.all([
      FinancialIntelligenceEngine.getSnapshot(),
      Promise.all(goals.map(goal => FinancialLedgerService.getGoalContributions(goal.id))),
    ]);

    const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const contributedThisMonthPaise = contributionsByGoal
      .flat()
      .filter(c => c.occurredAtMs >= monthStart)
      .reduce((sum, c) => sum + c.amountPaise, 0);

    const entries = goals.map((goal, index) => ({
      goal,
      health: computeGoalHealth(goal, contributionsByGoal[index], now),
    }));

    setRankedGoals(rankGoalPriority(entries));
    setSavingsBudgetRemainingPaise(Math.max(0, snapshot.savingsBudget - contributedThisMonthPaise));
    setLoading(false);
  }, [goals]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = financialEventBus.subscribe(load);
    return () => unsubscribe?.();
  }, [load]);

  return { rankedGoals, savingsBudgetRemainingPaise, loading, reload: load };
};
```

Check `EventBus.ts`'s `subscribe` return type before finalizing — if it doesn't return an unsubscribe function (the earlier `financialEventBus.subscribe(() => useGoalStore.getState().loadGoals())` call site in `goalStore.ts` doesn't capture a return value), drop the `return () => unsubscribe?.()` cleanup and leave the effect without cleanup, matching the existing pattern.

**Step 5: Run the test to confirm it passes**

Run: `npx jest __tests__/hooks/useGoalIntelligence.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/hooks/useGoalIntelligence.ts __tests__/hooks/useGoalIntelligence.test.ts
git commit -m "feat: add useGoalIntelligence hook wiring goals, contributions, and savings capacity"
```

---

## Task 12: `AddGoalSheet` — deadline input

**Files:**
- Modify: `src/components/modals/AddGoalSheet.tsx`

No existing test file for this component; this is a small additive UI change (one optional field), verified manually per Task 20 rather than with a new RTL harness — consistent with there being no prior test coverage on this file to extend.

**Step 1: Add state and the picker**

In `src/components/modals/AddGoalSheet.tsx`:

- Import at the top: `import DateTimePicker from '@react-native-community/datetimepicker';`
- Add state near the existing `name`/`target` state (around line 45): `const [deadline, setDeadline] = useState<Date | null>(null);` and `const [showPicker, setShowPicker] = useState(false);`
- In `handleSubmit`, change the call signature so `onSubmit` also receives the deadline: `await onSubmit(name, target, deadline ? deadline.toISOString() : undefined);` and reset `setDeadline(null)` alongside the existing `setName('')`/`setTarget('')` resets.
- Update the `Props` interface: `onSubmit: (name: string, targetAmount: string, deadline?: string) => Promise<void>;`
- After the existing target-amount `TextInput` (around line 127-140), add a pressable row that opens the picker:

```tsx
              <PressableScale onPress={() => setShowPicker(true)} style={[styles.deadlineRow, { backgroundColor: colors.inputBg, borderRadius: 16 }]}>
                <Text style={{ color: deadline ? colors.textPrimary : colors.textSecondary, fontFamily: 'Satoshi-Medium', fontSize: 15 }}>
                  {deadline ? deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Set a deadline (optional)'}
                </Text>
              </PressableScale>
              {showPicker && (
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_event, selectedDate) => {
                    setShowPicker(false);
                    if (selectedDate) setDeadline(selectedDate);
                  }}
                />
              )}
```

- Add to the `StyleSheet.create` block: `deadlineRow: { paddingHorizontal: 16, paddingVertical: 14, marginTop: 12 },`

**Step 2: Update the caller**

In `src/screens/user/GoalsScreen.tsx`, `handleAddGoal` (lines 37-50) needs the new parameter:

```typescript
  const handleAddGoal = async (goalName: string, targetStr: string, deadline?: string) => {
    const targetAmountPaise = Money.toPaise(targetStr);
    if (targetAmountPaise <= 0) {
      throw new Error('Invalid amount');
    }

    await addGoal({
      name: goalName,
      targetAmount: targetAmountPaise,
      currentAmount: 0,
      deadline,
    });

    setShowAdd(false);
  };
```

**Step 3: Manual verification**

Run the app (Android — this project has no iOS build, per `PRODUCT.md`), open Goals → + → confirm the deadline row opens a native date picker, a chosen date displays formatted, and creating the goal without touching the field still works (it stays optional).

**Step 4: Commit**

```bash
git add src/components/modals/AddGoalSheet.tsx src/screens/user/GoalsScreen.tsx
git commit -m "feat: add optional deadline input to AddGoalSheet"
```

---

## Task 13: `AddFundsSheet` — affordability line and what-if chips

**Files:**
- Modify: `src/components/modals/AddFundsSheet.tsx`

**Step 1: Extend props**

Update the `Props` interface to accept the data `GoalsScreen` already has from `useGoalIntelligence`:

```typescript
interface Props {
  visible: boolean;
  goalName?: string;
  goal?: Goal;
  health?: GoalHealth;
  savingsBudgetRemainingPaise?: number;
  onClose: () => void;
  onSubmit: (amount: string) => Promise<void>;
}
```

Add imports: `import { Goal } from '../../store/goalStore';`, `import { GoalHealth, checkAffordability, simulateWhatIf } from '../../services/goalIntelligence';`, `import { Money } from '../../utils/money';`.

**Step 2: Compute and render affordability + what-if live as the user types**

Inside the component, after the existing `amount` state:

```typescript
  const amountPaise = Money.toPaise(amount || '0');
  const affordability = goal && health && savingsBudgetRemainingPaise !== undefined
    ? checkAffordability(amountPaise, 0, savingsBudgetRemainingPaise)
    : null;

  const whatIfChips = [50000, 100000, 200000]; // ₹500 / ₹1,000 / ₹2,000, in paise
```

Note: `checkAffordability`'s second argument (`monthlyContributedSoFarPaise`) should be `0` here since `savingsBudgetRemainingPaise` passed down from `useGoalIntelligence` is *already* net of this month's contributions (see Task 11) — don't subtract it twice.

Render, below the existing amount `TextInput` and before the submit button:

```tsx
              {affordability && (
                <Text
                  variant="caption"
                  style={{ color: affordability.affordable ? colors.textSecondary : colors.danger, marginTop: 8 }}
                >
                  {affordability.message}
                </Text>
              )}

              {goal && health && (
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
                  {whatIfChips.map(extraPaise => {
                    const preview = simulateWhatIf(goal, health, extraPaise);
                    if (!preview.etaLabel) return null;
                    return (
                      <PressableScale key={extraPaise} onPress={() => setAmount(String(extraPaise / 100))}>
                        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.chipBg }}>
                          <Text variant="caption" style={{ color: colors.textPrimary }}>
                            +₹{extraPaise / 100} → {preview.etaLabel}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              )}
```

This uses `Text` (already imported as the custom `Text` component in this file? Check — `AddFundsSheet.tsx` currently imports `Text` from `react-native` directly, not the themed `../ui/Text`). Since this file uses the raw RN `Text`, either switch the two new `Text` usages to the app's themed component (`import { Text } from '../ui/Text';`, aliasing the RN one if still needed elsewhere in the file) or apply the `variant`-equivalent styles manually with the raw RN `Text`. Prefer switching to the themed `Text` for consistency with DESIGN.md's typography scale (§3) — check the rest of the file for any raw-`Text`-specific styling that would need to move to `style` props on the themed version first.

Confirm the affordability check never blocks submit — `handleSubmit`/`isDisabled` in this file must stay unchanged except for the new optional props; do not add `!affordability.affordable` to the disabled condition (per the design doc's warn-don't-block decision).

**Step 3: Update the caller**

In `src/screens/user/GoalsScreen.tsx`, pass the new props through from the ranked-goal data (wired fully in Task 19):

```tsx
      <AddFundsSheet 
        visible={!!selectedGoal}
        goalName={selectedGoal?.name}
        goal={selectedRankedGoal?.goal}
        health={selectedRankedGoal?.health}
        savingsBudgetRemainingPaise={savingsBudgetRemainingPaise}
        onClose={() => setSelectedGoal(null)}
        onSubmit={handleAddProgress}
      />
```

(`selectedRankedGoal` and `savingsBudgetRemainingPaise` come from `useGoalIntelligence` — defined fully in Task 19; this task can stub it as `undefined` if Task 19 hasn't landed yet, since every new prop is optional.)

**Step 4: Manual verification**

Open a goal's Add Funds sheet, type an amount larger than the remaining monthly savings budget, confirm the warning appears in `danger` color but Submit stays enabled. Tap a what-if chip, confirm it prefills the amount field.

**Step 5: Commit**

```bash
git add src/components/modals/AddFundsSheet.tsx
git commit -m "feat: add affordability warning and what-if chips to AddFundsSheet"
```

---

## Task 14: `FocusGoalHeroCard` — health states

**Files:**
- Modify: `src/components/insights/FocusGoalHeroCard.tsx`
- Test: `__tests__/components/insights/FocusGoalHeroCard.test.tsx` (new)

**Step 1: Write a failing test for the new health-driven states**

Create `__tests__/components/insights/FocusGoalHeroCard.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { FocusGoalHeroCard } from '../../../src/components/insights/FocusGoalHeroCard';
import { GoalHealth } from '../../../src/services/goalIntelligence';

const baseProps = {
  name: 'Laptop',
  targetAmount: 100000,
  currentAmount: 50000,
  tint: '#D8E2FA',
  deep: '#1565C0',
  onAddFunds: jest.fn(),
  onPress: jest.fn(),
};

const healthOf = (overrides: Partial<GoalHealth>): GoalHealth => ({
  state: 'healthy',
  score: 50,
  progressPercent: 50,
  monthlyVelocityPaise: 1000,
  etaLabel: '~4 months at current pace',
  daysSinceLastContribution: 2,
  isPaceBehindDeadline: false,
  ...overrides,
});

describe('FocusGoalHeroCard', () => {
  it('shows the ETA label when healthy', () => {
    const { getByText } = render(<FocusGoalHeroCard {...baseProps} health={healthOf({})} priorityRank={1} />);
    expect(getByText('~4 months at current pace')).toBeTruthy();
  });

  it('shows a stalled message instead of the percentage line when stalled', () => {
    const { getByText } = render(
      <FocusGoalHeroCard {...baseProps} health={healthOf({ state: 'stalled', daysSinceLastContribution: 34, etaLabel: null })} priorityRank={1} />,
    );
    expect(getByText(/No contribution in 34 days/)).toBeTruthy();
  });

  it('shows an at-risk indicator when pace is behind the deadline', () => {
    const { getByText } = render(
      <FocusGoalHeroCard {...baseProps} health={healthOf({ state: 'at_risk', isPaceBehindDeadline: true })} priorityRank={1} />,
    );
    expect(getByText(/Behind pace/)).toBeTruthy();
  });

  it('shows the priority badge only when priorityRank is 1', () => {
    const { queryByText, rerender } = render(<FocusGoalHeroCard {...baseProps} health={healthOf({})} priorityRank={1} />);
    expect(queryByText('#1 Priority')).toBeTruthy();

    rerender(<FocusGoalHeroCard {...baseProps} health={healthOf({})} priorityRank={2} />);
    expect(queryByText('#1 Priority')).toBeNull();
  });
});
```

**Step 2: Run to confirm failure**

Run: `npx jest __tests__/components/insights/FocusGoalHeroCard.test.tsx`
Expected: FAIL — component doesn't accept `health`/`priorityRank` props yet, and none of the new copy exists.

**Step 3: Implement**

In `src/components/insights/FocusGoalHeroCard.tsx`:

- Add imports: `import { GoalHealth } from '../../services/goalIntelligence';`, `import { AlertTriangle } from 'lucide-react-native';`
- Extend `Props`: add `health: GoalHealth;` and `priorityRank: number;`
- Destructure `health` and `priorityRank` in the function signature.
- Replace the fixed `"Focus Goal"` badge (lines 72-74) — it currently always renders regardless of rank, which is exactly the bug this redesign is fixing (every card claimed to be the Focus Goal). Replace with:

```tsx
            {priorityRank === 1 && (
              <View style={[styles.priorityBadge, { backgroundColor: colors.chipBg }]}>
                <Text variant="label" style={{ color: colors.primaryAccent, fontFamily: 'Satoshi-Bold' }}>#1 Priority</Text>
              </View>
            )}
```

- Replace the `percentage`/`isComplete` locals (currently derived from `currentAmount`/`targetAmount` directly, lines 35-36) to read from `health` instead, so this card stops duplicating the progress math `goalIntelligence.computeProgress` now owns:

```typescript
  const percentage = health.progressPercent;
  const isComplete = health.state === 'completed';
```

- In the footer row (lines 105-127), replace the plain `"{percentage}% completed"` text with state-aware copy, keeping the existing `isComplete` branch as-is:

```tsx
            <>
              {health.state === 'stalled' && (
                <Text variant="caption" style={{ color: colors.textSecondary }}>
                  No contribution in {health.daysSinceLastContribution} days
                </Text>
              )}
              {health.state === 'at_risk' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle color={colors.danger} size={14} />
                  <Text variant="caption" style={{ color: colors.danger, marginLeft: 4 }}>Behind pace for its deadline</Text>
                </View>
              )}
              {health.state === 'overdue' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle color={colors.danger} size={14} />
                  <Text variant="caption" style={{ color: colors.danger, marginLeft: 4 }}>Past deadline</Text>
                </View>
              )}
              {health.state === 'healthy' && (
                <Text variant="caption" style={{ color: colors.textSecondary }}>
                  {health.etaLabel ? health.etaLabel : `${percentage}% completed`}
                </Text>
              )}

              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: colors.primaryAccent }]} 
                onPress={onAddFunds}
                activeOpacity={0.8}
              >
                <Plus color="#FFFFFF" size={16} />
                <Text variant="caption" style={{ color: '#FFFFFF', fontFamily: 'Satoshi-Bold', marginLeft: 4 }}>Add Funds</Text>
              </TouchableOpacity>
            </>
```

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/components/insights/FocusGoalHeroCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/insights/FocusGoalHeroCard.tsx __tests__/components/insights/FocusGoalHeroCard.test.tsx
git commit -m "feat: FocusGoalHeroCard shows real health state instead of a flat percentage"
```

---

## Task 15: `SecondaryGoalCard` — health states + completed badge

**Files:**
- Modify: `src/components/insights/SecondaryGoalCard.tsx`
- Test: `__tests__/components/insights/SecondaryGoalCard.test.tsx` (new)

Same pattern as Task 14, compact layout. `SecondaryGoalCard` currently has no "completed" treatment at all (only `FocusGoalHeroCard` does) — this task adds parity.

**Step 1: Write the failing test**

Create `__tests__/components/insights/SecondaryGoalCard.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { SecondaryGoalCard } from '../../../src/components/insights/SecondaryGoalCard';
import { GoalHealth } from '../../../src/services/goalIntelligence';

const baseProps = {
  name: 'Vacation',
  targetAmount: 100000,
  currentAmount: 50000,
  themeColor: '#AD1457',
  onPress: jest.fn(),
};

const healthOf = (overrides: Partial<GoalHealth>): GoalHealth => ({
  state: 'healthy',
  score: 50,
  progressPercent: 50,
  monthlyVelocityPaise: 1000,
  etaLabel: null,
  daysSinceLastContribution: 2,
  isPaceBehindDeadline: false,
  ...overrides,
});

describe('SecondaryGoalCard', () => {
  it('shows a completed badge when the goal is fully funded', () => {
    const { getByText } = render(
      <SecondaryGoalCard {...baseProps} currentAmount={100000} health={healthOf({ state: 'completed', progressPercent: 100 })} />,
    );
    expect(getByText('Complete')).toBeTruthy();
  });

  it('shows a stalled note when stalled', () => {
    const { getByText } = render(
      <SecondaryGoalCard {...baseProps} health={healthOf({ state: 'stalled', daysSinceLastContribution: 40 })} />,
    );
    expect(getByText(/40 days/)).toBeTruthy();
  });
});
```

**Step 2: Run to confirm failure**

Run: `npx jest __tests__/components/insights/SecondaryGoalCard.test.tsx`
Expected: FAIL

**Step 3: Implement**

In `src/components/insights/SecondaryGoalCard.tsx`:

- Add import: `import { GoalHealth } from '../../services/goalIntelligence';`
- Extend `Props` with `health: GoalHealth;`
- Replace the locally-derived `percentage`/`isComplete` (lines 33-34) with `health.progressPercent` / `health.state === 'completed'`, same as Task 14 — removing this file's copy of the duplicated math.
- Below the existing `contentRow` (after line 74, before the progress `track`), add a small state line and completed badge:

```tsx
          {health.state === 'completed' ? (
            <View style={[styles.completeBadge, { backgroundColor: colors.success }]}>
              <Text variant="label" style={{ color: '#FFFFFF' }}>Complete</Text>
            </View>
          ) : health.state === 'stalled' ? (
            <Text variant="caption" style={{ color: colors.textSecondary, marginTop: 4 }}>
              No contribution in {health.daysSinceLastContribution} days
            </Text>
          ) : (health.state === 'at_risk' || health.state === 'overdue') ? (
            <Text variant="caption" style={{ color: colors.danger, marginTop: 4 }}>
              {health.state === 'overdue' ? 'Past deadline' : 'Behind pace'}
            </Text>
          ) : null}
```

- Add to `StyleSheet.create`: `completeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 4 },`

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/components/insights/SecondaryGoalCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/insights/SecondaryGoalCard.tsx __tests__/components/insights/SecondaryGoalCard.test.tsx
git commit -m "feat: SecondaryGoalCard shows health state and a completed badge"
```

---

## Task 16: `GoalsHeroDashboard` — real trend and computed coach copy

**Files:**
- Modify: `src/components/insights/GoalsHeroDashboard.tsx`
- Test: `__tests__/components/insights/GoalsHeroDashboard.test.tsx` (new)

Replaces the 4-sentence lookup table (`getInsight()`) with copy generated from `rankedGoals`, and adds the month-over-month trend the design calls for.

**Step 1: Write the failing test**

Create `__tests__/components/insights/GoalsHeroDashboard.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { GoalsHeroDashboard } from '../../../src/components/insights/GoalsHeroDashboard';
import { RankedGoal } from '../../../src/services/goalIntelligence';

const rankedGoal = (overrides: Partial<RankedGoal> = {}): RankedGoal => ({
  goal: { id: 'g1', name: 'Laptop', targetAmount: 100000, currentAmount: 50000 },
  health: {
    state: 'healthy', score: 50, progressPercent: 50, monthlyVelocityPaise: 1000,
    etaLabel: '~4 months at current pace', daysSinceLastContribution: 2, isPaceBehindDeadline: false,
  },
  priorityRank: 1,
  priorityReason: 'On track',
  ...overrides,
});

describe('GoalsHeroDashboard', () => {
  it('shows the top-ranked goal\'s recommendation in the coach banner', () => {
    const { getByText } = render(
      <GoalsHeroDashboard rankedGoals={[rankedGoal()]} contributedThisMonthPaise={20000} contributedLastMonthPaise={10000} />,
    );
    expect(getByText(/Laptop is on track/)).toBeTruthy();
  });

  it('shows an improving trend when this month exceeds last month', () => {
    const { getByText } = render(
      <GoalsHeroDashboard rankedGoals={[rankedGoal()]} contributedThisMonthPaise={20000} contributedLastMonthPaise={10000} />,
    );
    expect(getByText(/more than last month/i)).toBeTruthy();
  });
});
```

**Step 2: Run to confirm failure**

Run: `npx jest __tests__/components/insights/GoalsHeroDashboard.test.tsx`
Expected: FAIL — component still takes `goals: Goal[]`, not `rankedGoals`, and has no trend props.

**Step 3: Implement**

Replace `src/components/insights/GoalsHeroDashboard.tsx` in full:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { RankedGoal, generateRecommendationCopy } from '../../services/goalIntelligence';
import { Money } from '../../utils/money';

interface Props {
  rankedGoals: RankedGoal[];
  contributedThisMonthPaise: number;
  contributedLastMonthPaise: number;
}

export const GoalsHeroDashboard: React.FC<Props> = ({ rankedGoals, contributedThisMonthPaise, contributedLastMonthPaise }) => {
  const { colors } = useSpecTheme();

  const totalSaved = rankedGoals.reduce((acc, r) => acc + r.goal.currentAmount, 0);

  const trendDeltaPaise = contributedThisMonthPaise - contributedLastMonthPaise;
  const trendLabel = contributedLastMonthPaise === 0 && contributedThisMonthPaise === 0
    ? null
    : trendDeltaPaise >= 0
      ? `${Money.format(trendDeltaPaise, { zeroDecimals: true })} more than last month`
      : `${Money.format(Math.abs(trendDeltaPaise), { zeroDecimals: true })} less than last month`;

  const topGoal = rankedGoals[0];
  const coachCopy = topGoal
    ? generateRecommendationCopy(topGoal.goal, topGoal.health, topGoal.priorityReason)
    : "Let's build your financial engine today.";

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>Total Wealth Built</Text>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 40, letterSpacing: -0.5, marginTop: 4 }}>
            {Money.format(totalSaved, { zeroDecimals: true })}
          </Text>
          {trendLabel && (
            <Text variant="caption" style={{ color: trendDeltaPaise >= 0 ? colors.success : colors.textSecondary, marginTop: 4 }}>
              {trendLabel} this month
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.coachBanner, { backgroundColor: `${colors.primaryAccent}10` }]}>
        <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Medium', lineHeight: 18 }}>
          <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.primaryAccent }}>Coach: </Text>{coachCopy}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
  },
  coachBanner: {
    padding: 16,
    borderRadius: 12,
  }
});
```

**Step 4: Run the tests to confirm they pass**

Run: `npx jest __tests__/components/insights/GoalsHeroDashboard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/insights/GoalsHeroDashboard.tsx __tests__/components/insights/GoalsHeroDashboard.test.tsx
git commit -m "feat: GoalsHeroDashboard shows a real month-over-month trend and computed coach copy"
```

---

## Task 17: `goalStore` — sorting delegates to `rankGoalPriority`

**Files:**
- Modify: `src/store/goalStore.ts`

`GoalsScreen`'s local `sortedGoals` (its own emergency-fund-first/insertion-order sort) is removed in Task 19 in favor of `useGoalIntelligence`'s `rankedGoals`. This task just confirms `goalStore.ts` itself doesn't need its own sort — it doesn't; `loadGoals` already just loads goals unsorted from SQL (`ORDER BY rowid ASC`), which is fine as raw storage order since sorting for *display* now lives entirely in `goalIntelligence`. No code change needed here — skip to Task 18. (Recorded as a task so the plan's file list matches the design doc's touch list and to make explicit that this was checked, not missed.)

---

## Task 18: `GoalsScreen` — wire `useGoalIntelligence` through

**Files:**
- Modify: `src/screens/user/GoalsScreen.tsx`

This is the integration task: replace the screen's local `sortedGoals`/percentage logic with the ranked, health-attached data from Task 11's hook, and pass the right props to each card (Tasks 14-16).

**Step 1: Replace the goal-loading and sorting logic**

Remove the local `sortedGoals` computation (lines 77-82) and the `goalTints`/`goalDeeps` index-based coloring stays, but now indexes into `rankedGoals` instead of `sortedGoals`.

Replace the `useGoalStore`/`useTransactionStore` destructuring block (lines 25-26) and the `useEffect` (lines 31-35) with:

```typescript
  const { goals, addGoal, getEmergencyFundTarget, updateGoalProgress, deleteGoal } = useGoalStore();
  const { transactions } = useTransactionStore();
  const { rankedGoals, savingsBudgetRemainingPaise, reload } = useGoalIntelligence();

  const [showAdd, setShowAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    useGoalStore.getState().loadGoals().then(() => {
      getEmergencyFundTarget();
    });
  }, []);
```

Add the import: `import { useGoalIntelligence } from '../../hooks/useGoalIntelligence';`

**Step 2: Update the render to use `rankedGoals`**

Replace the `sortedGoals.length > 0` Focus card block (lines 126-138):

```tsx
              {rankedGoals.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                  <FocusGoalHeroCard
                    name={rankedGoals[0].goal.name}
                    currentAmount={rankedGoals[0].goal.currentAmount}
                    targetAmount={rankedGoals[0].goal.targetAmount}
                    health={rankedGoals[0].health}
                    priorityRank={rankedGoals[0].priorityRank}
                    tint={goalTints[0]}
                    deep={goalDeeps[0]}
                    onPress={() => setSelectedGoal({ id: rankedGoals[0].goal.id, name: rankedGoals[0].goal.name })}
                    onAddFunds={() => setSelectedGoal({ id: rankedGoals[0].goal.id, name: rankedGoals[0].goal.name })}
                  />
                </View>
              )}
```

Replace the `sortedGoals.length > 1` secondary list (lines 140-155):

```tsx
              {rankedGoals.length > 1 && (
                <>
                  <Text variant="caption" style={[styles.eyebrow, { marginBottom: 16 }]}>Other Active Goals</Text>
                  {rankedGoals.slice(1).map((ranked, index) => (
                    <SecondaryGoalCard
                      key={ranked.goal.id}
                      name={ranked.goal.name}
                      currentAmount={ranked.goal.currentAmount}
                      targetAmount={ranked.goal.targetAmount}
                      health={ranked.health}
                      themeColor={goalDeeps[(index + 1) % goalDeeps.length]}
                      onPress={() => setSelectedGoal({ id: ranked.goal.id, name: ranked.goal.name })}
                      onLongPress={() => handleDelete(ranked.goal.id)}
                    />
                  ))}
                </>
              )}
```

Replace the `GoalsHeroDashboard` call (line 123):

```tsx
            <GoalsHeroDashboard
              rankedGoals={rankedGoals}
              contributedThisMonthPaise={goalTransfers.filter(t => isThisMonth(t.date)).reduce((sum, t) => sum + t.amountPaise, 0)}
              contributedLastMonthPaise={0 /* see Step 3 */}
            />
```

**Step 3: Compute last-month contributions**

`goalTransfers` (line 84) is currently `transactions.filter(t => t.type === 'transfer_to_goal').slice(0, 5)` — a display-only slice, not enough data for a real month-over-month comparison. Add a small local helper above the component (or in `src/utils/` if a similar date-bucketing helper already exists — check `src/utils/groupTransactionsByDate.ts` first and reuse its month-boundary logic if present rather than reimplementing):

```typescript
const isInMonth = (dateStr: string, monthsAgo: number): boolean => {
  const d = new Date(dateStr);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
};
```

Then compute both totals from the *full* `transactions` list (not the 5-item `goalTransfers` slice):

```typescript
  const allGoalTransfers = transactions.filter(t => t.type === 'transfer_to_goal');
  const contributedThisMonthPaise = allGoalTransfers.filter(t => isInMonth(t.date, 0)).reduce((sum, t) => sum + t.amountPaise, 0);
  const contributedLastMonthPaise = allGoalTransfers.filter(t => isInMonth(t.date, 1)).reduce((sum, t) => sum + t.amountPaise, 0);
```

Keep the existing `goalTransfers = transactions.filter(...).slice(0, 5)` for the "Recent Activity" section unchanged — it's a display list, not a total.

**Step 4: Wire `AddFundsSheet`'s new props (from Task 13)**

```tsx
      <AddFundsSheet 
        visible={!!selectedGoal}
        goalName={selectedGoal?.name}
        goal={rankedGoals.find(r => r.goal.id === selectedGoal?.id)?.goal}
        health={rankedGoals.find(r => r.goal.id === selectedGoal?.id)?.health}
        savingsBudgetRemainingPaise={savingsBudgetRemainingPaise}
        onClose={() => setSelectedGoal(null)}
        onSubmit={handleAddProgress}
      />
```

**Step 5: Manual verification (this is a screen-integration task — no new automated test; Tasks 6-16 already cover the logic and component units this wires together)**

Run the app, open Goals with 3+ goals in varied states (one recently funded, one untouched for 21+ days, one with a near-term deadline and low progress). Confirm:
- The card in rank 1 shows the `#1 Priority` badge.
- The stalled goal shows "No contribution in N days" instead of a percentage.
- The at-risk goal shows the behind-pace indicator.
- The hero dashboard trend line and coach sentence both look real, not templated.
- Adding funds shows the affordability line and what-if chips, and submission still succeeds when the warning is showing.

**Step 6: Commit**

```bash
git add src/screens/user/GoalsScreen.tsx
git commit -m "feat: wire useGoalIntelligence through GoalsScreen, replacing local sort/percentage logic"
```

---

## Task 19: Full regression pass

**Files:** none (verification only)

**Step 1: Run the full Jest suite**

```bash
npx jest
```

Expected: PASS. Pay particular attention to:
- `__tests__/store/goalStore.test.ts`
- `__tests__/services/insightsEngine.test.ts`
- `__tests__/services/goalIntelligence.test.ts`
- `__tests__/services/FinancialLedgerService.test.ts`
- `__tests__/hooks/useGoalIntelligence.test.ts`
- `__tests__/components/insights/*.test.tsx`
- Anything under `__tests__/` that imports `goalStore`, `insightsEngine`, `FinancialLedgerService`, or the goal card components transitively (e.g. `MoneyPlanShell.test.tsx`, `useMoneyPlanIntelligence.test.ts`, since `moneyPlanIntelligence.ts` also reads `emergencyFundGoal` — confirm Task 1's paise fix didn't change any of *its* expectations; if it did, that test was itself relying on the old bug and needs the same paise correction).

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors introduced by this plan's changes.

**Step 3: On-device manual verification (migration + full flow)**

Per the migration testing convention noted in Task 2, `015_goal_contribution_link.ts` itself has no automated coverage. On a device/emulator with existing goal data:

1. Launch the app, let migrations run (check logs for no migration errors).
2. Confirm existing goals still display with correct (pre-existing) progress.
3. Add funds to an existing goal; confirm the new transaction has a populated `goal_id` (can verify via a debug query or by checking Reports still attributes the transfer to the right goal).
4. Open Reports and confirm goal transfer details still show correctly (Task 5's join fix).
5. Create a new goal with a deadline (Task 12), fund it partially, confirm ETA/pace-vs-deadline copy appears correctly on its card.
6. Let a goal go untouched (or fake a stale one by testing against an old goal with no recent contribution) and confirm it shows the stalled state.

**Step 4: Report back**

Summarize pass/fail for each of the above to the user before considering the feature done — do not claim completion without having actually run the suite and walked the on-device flow, per the app's testing discipline (this plan's Task 20 doubles as this project's verification-before-completion checkpoint).
