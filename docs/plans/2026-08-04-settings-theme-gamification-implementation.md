# Settings Completion, Theme Cleanup & Gamification Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the four dead Settings rows with real screens, migrate the last three `designTokens` holdouts to `specTheme`, and add a Tier-1-only gamification layer (bill streaks + one-time goal-milestone celebrations) following the existing service+store+`EventBus` pattern.

**Architecture:** Three independent workstreams, each safe to ship on its own: (1) new screens registered in `RootNavigator`, reusing existing `pinService`/`SetupPinScreen`/`ResetPinScreen` infra for Security; (2) mechanical theme-source swap on 3 components; (3) a new `GamificationEngine` + `gamificationStore` mirroring `FinancialIntelligenceEngine` + `intelligenceStore`, backed by one new migration.

**Tech Stack:** React Native, TypeScript, Zustand, `@op-engineering/op-sqlite`, `react-native-reanimated`, Jest.

**Design doc:** `docs/plans/2026-08-04-settings-theme-gamification-design.md`

---

### Task 1: Theme migration — StreakBanner

**Files:**
- Modify: `src/components/insights/StreakBanner.tsx`

**Step 1: Read the current file to confirm the exact import/usage to replace**

Already read in this session — line 4-5 import `useTheme` from `../../hooks/useTheme` and `spacing, radii` from `../../theme/designTokens`. Every other insights component in this codebase (`GoalTrackerCard`, `FocusGoalHeroCard`, `SecondaryGoalCard`, `InsightCard`) uses `useSpecTheme()` from `../../theme/specTheme` instead — that hook exposes `colors`, plus whatever spacing/radius tokens the design system defines (check `src/theme/specTheme.ts` for the exact field names, e.g. `cardRadius`, before writing this).

**Step 2: Replace the imports and usages**

```tsx
import { useSpecTheme } from '../../theme/specTheme';
```

Replace `const { colors } = useTheme();` with `const { colors } = useSpecTheme();`. Replace `spacing.s` / `radii.card` with the equivalent `specTheme` fields (grep `useSpecTheme` usage in `src/components/insights/GoalTrackerCard.tsx` for the exact token names — do not guess).

**Step 3: Run the app and manually toggle dark mode from Settings**

Run: `npm start` (already running per earlier session state) then check the Home screen's streak banner in both light and dark mode via the Settings → Dark Mode switch.
Expected: banner colors/spacing match the rest of the dashboard in both themes, no visual regression.

**Step 4: Commit**

```bash
git add src/components/insights/StreakBanner.tsx
git commit -m "refactor: migrate StreakBanner to specTheme"
```

---

### Task 2: Theme migration — SmartInsightCard and SpendingHeatmap

**Files:**
- Modify: `src/components/insights/SmartInsightCard.tsx`
- Modify: `src/components/insights/SpendingHeatmap.tsx`

**Step 1: Read both files, identify every `designTokens` import and usage**

**Step 2: Apply the same `useSpecTheme()` swap as Task 1** to both files, independently.

**Step 3: Manually verify in the running app**

Both components render on the Home dashboard (`UserDashboardScreen.tsx`) — toggle dark mode, confirm no visual regression, confirm no `Cannot read property of undefined` (a wrong field name from `specTheme` is the most likely break here).

**Step 4: Commit**

```bash
git add src/components/insights/SmartInsightCard.tsx src/components/insights/SpendingHeatmap.tsx
git commit -m "refactor: migrate SmartInsightCard and SpendingHeatmap to specTheme"
```

---

### Task 3: Profile screen

**Files:**
- Create: `src/screens/settings/ProfileScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/screens/user/SettingsScreen.tsx:155`

**Step 1: Write the screen**

Follow the existing `SecurityScreen`/`SetupPinScreen` visual pattern (see Task 4) — `useSpecTheme()` for colors, `useSafeAreaInsets()` for layout. Two fields: name (text input) and avatar (reuse whatever avatar-picker pattern exists in the chit-fund module if one does — otherwise a single tappable initial-letter circle is enough, no image upload in this pass). Persist via `getPreference('profile_name', name)` / `getPreference('profile_name')` on mount, matching the exact pattern `SettingsScreen.tsx` already uses for the `notifications` preference (`src/store/database.ts`'s `getPreference`/`setPreference`).

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { getPreference, setPreference } from '../../store/database';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  const [name, setName] = useState('');

  useEffect(() => {
    getPreference('profile_name').then(v => { if (v) setName(v); });
  }, []);

  const handleSave = useCallback(async (value: string) => {
    setName(value);
    await setPreference('profile_name', value);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
      <TextInput
        value={name}
        onChangeText={handleSave}
        placeholder="Your name"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.chipBg, color: colors.textPrimary, borderRadius: cardRadius }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black', marginBottom: 24 },
  input: { height: 56, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Satoshi-Medium' },
});
```

**Step 2: Register the route in RootNavigator**

In `RootNavigator.tsx`, add `import { ProfileScreen } from '../screens/settings/ProfileScreen';` and `<Stack.Screen name="Profile" component={ProfileScreen} />` alongside the existing `Budget`/`Bills`/`Goals` screen registrations (around line 186-188).

**Step 3: Wire the Settings row**

In `SettingsScreen.tsx:155`, change `onPress={handleInertPress}` to `onPress={() => navigation.navigate('Profile')}` on the `Profile` `SettingsRow`, and the profile card's `onPress={handleInertPress}` at line 128 similarly.

Also update the profile card display (line 139-143) to read the new `profile_name` preference instead of only `userProfile?.name` — fall back to `userProfile?.name || profileNameFromPreference || 'User'`.

**Step 4: Manually verify**

Run app, navigate Settings → Profile, type a name, go back, re-enter Settings — name should persist and reflect in the profile card header.

**Step 5: Commit**

```bash
git add src/screens/settings/ProfileScreen.tsx src/navigation/RootNavigator.tsx src/screens/user/SettingsScreen.tsx
git commit -m "feat: add Profile screen, wire Settings row"
```

---

### Task 4: Security screen (routes onto existing pinService infra)

**Files:**
- Create: `src/screens/settings/SecurityScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/screens/user/SettingsScreen.tsx:159`

**Step 1: Write the screen**

This is a router onto existing, already-working infra — `hasPinSet`, `clearPin`, `confirmDeviceIdentity` from `src/services/pinService.ts`, and the existing `SetupPinScreen`/`ResetPinScreen` components (currently only reachable from onboarding).

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../../components/ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { hasPinSet, clearPin, confirmDeviceIdentity } from '../../services/pinService';
import { SettingsCard, SettingsRow, SettingsDivider } from '../../components/shared/SettingsRow';
import { Lock, Trash2 } from 'lucide-react-native';

type Props = NativeStackScreenProps<any, 'Security'>;

export const SecurityScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useSpecTheme();
  const [pinSet, setPinSet] = useState<boolean | null>(null);

  const refresh = useCallback(() => { hasPinSet().then(setPinSet); }, []);
  useEffect(refresh, [refresh]);

  const handleRemovePin = useCallback(async () => {
    const ok = await confirmDeviceIdentity();
    if (ok) {
      await clearPin();
      refresh();
    }
  }, [refresh]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Security</Text>
      <SettingsCard>
        {pinSet === false && (
          <SettingsRow icon={Lock} tint="teal" label="Set a PIN"
            onPress={() => navigation.navigate('SetupPin', { onComplete: refresh })} />
        )}
        {pinSet === true && (
          <>
            <SettingsRow icon={Lock} tint="teal" label="Change PIN"
              onPress={() => navigation.navigate('ResetPin', { onComplete: refresh })} />
            <SettingsDivider />
            <SettingsRow icon={Trash2} tint="orange" label="Remove PIN" onPress={handleRemovePin} />
          </>
        )}
      </SettingsCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black', marginBottom: 24 },
});
```

**Step 2: Check SetupPinScreen/ResetPinScreen's real prop signatures before wiring**

Both currently take `onComplete`/`onCancel` callback props (see `RootNavigator.tsx` lines 166-172 and `ResetPinScreen.tsx`), not React Navigation route params — they're rendered inline in `RootNavigator`, not pushed as a routed screen. Two options: (a) register them as `Stack.Screen` with a wrapper that reads `route.params.onComplete`, or (b) render `SecurityScreen` as a local state machine like `RootNavigator` does (`showSetupPin` state) instead of navigating. **Pick (b)** — it matches the existing pattern exactly and avoids inventing a param-passing convention React Navigation doesn't need here:

```tsx
// inside SecurityScreen, replace navigation.navigate calls with local state:
const [mode, setMode] = useState<'idle' | 'settingPin' | 'resettingPin'>('idle');
if (mode === 'settingPin') return <SetupPinScreen onComplete={() => { setMode('idle'); refresh(); }} />;
if (mode === 'resettingPin') return <ResetPinScreen onComplete={() => { setMode('idle'); refresh(); }} onCancel={() => setMode('idle')} />;
```

Adjust the two `onPress` handlers above to `setMode('settingPin')` / `setMode('resettingPin')` instead of `navigation.navigate`.

**Step 3: Register the route and wire the Settings row**

Add `Stack.Screen name="Security"` in `RootNavigator.tsx`; change `SettingsScreen.tsx:159`'s `onPress={handleInertPress}` to `onPress={() => navigation.navigate('Security')}`.

**Step 4: Manually verify both paths**

Fresh install (no PIN) → Settings → Security → Set a PIN → completes → row now shows Change/Remove. Existing PIN → Change PIN → device auth prompt → new PIN flow. Remove PIN → device auth prompt → row reverts to "Set a PIN".

**Step 5: Commit**

```bash
git add src/screens/settings/SecurityScreen.tsx src/navigation/RootNavigator.tsx src/screens/user/SettingsScreen.tsx
git commit -m "feat: add Security screen wiring existing pinService infra"
```

---

### Task 5: Help Center screen

**Files:**
- Create: `src/screens/settings/HelpCenterScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/screens/user/SettingsScreen.tsx:222`

**Step 1: Write a static FAQ + contact screen**

Simple `ScrollView` of `{question, answer}` pairs (hardcoded array, 5-8 entries covering: how transactions are categorized, what "safe to spend" means, whether data leaves the device, how to reset a PIN, how chit funds work if `CHITFUND_ENABLED`) plus a `Linking.openURL('mailto:support@...')` contact row. No backend, no ticket system — matches the design doc's explicit non-goal scope.

**Step 2: Register route, wire Settings row** (same pattern as Tasks 3-4).

**Step 3: Manually verify** — screen renders, mailto link opens the device's mail composer (or no-ops gracefully in simulator).

**Step 4: Commit**

```bash
git add src/screens/settings/HelpCenterScreen.tsx src/navigation/RootNavigator.tsx src/screens/user/SettingsScreen.tsx
git commit -m "feat: add Help Center screen, remove last dead Settings row"
```

---

### Task 6: Remove Payment Methods row

**Files:**
- Modify: `src/screens/user/SettingsScreen.tsx`

**Step 1: Delete the row**

Remove the `<SettingsRow icon={CreditCard} tint="green" label="Payment Methods" onPress={handleInertPress} />` and its preceding `<SettingsDivider />` at lines 156-157. Remove the now-unused `CreditCard` import if nothing else in the file uses it.

**Step 2: Manually verify** — Settings → ACCOUNT section shows only Profile and Security, no gap.

**Step 3: Commit**

```bash
git add src/screens/user/SettingsScreen.tsx
git commit -m "refactor: remove dead Payment Methods row (app never holds funds)"
```

---

### Task 7: Migration 015 — celebrations_seen table

**Files:**
- Create: `src/db/migrations/015_gamification.ts`
- Modify: `src/db/migrations/index.ts`
- Test: `__tests__/db/migrations/015_gamification.test.ts` (create `__tests__/db/migrations/` if it doesn't exist — check first: `find __tests__ -iname "*migrat*"`)

**Step 1: Write the migration, following the exact shape of `012_goal_emergency_fund_flag.ts`**

```ts
import type { DB } from '@op-engineering/op-sqlite';

/**
 * Tracks which one-time gamification celebrations (goal milestones, streak
 * milestones) have already been shown, so GamificationEngine doesn't re-fire
 * the same celebration animation on every app open.
 */
export const migrate015Gamification = async (db: DB): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS celebrations_seen (
      id TEXT PRIMARY KEY,
      milestone_key TEXT NOT NULL UNIQUE,
      seen_at INTEGER NOT NULL
    );
  `);
};
```

**Step 2: Register in index.ts**

Add the import and the `if (currentVersion < 15) { await migrate015Gamification(db); await db.execute('PRAGMA user_version = 15;'); }` block, following the exact pattern of the `< 14` block already there.

**Step 3: Write a migration test if the pattern exists for other migrations**

Run `find /Users/codeaura/Projects/CoinKeeper/__tests__ -iname "*migrat*"` first — if no existing migration tests exist, skip a dedicated test file here (don't invent a new test pattern the codebase doesn't have) and instead rely on Task 9's `gamificationStore` tests, which will fail loudly if the table doesn't exist.

**Step 4: Manually verify**

Run the app fresh (or clear app data / delete the local SQLite db file), confirm no migration errors in Metro logs, confirm `PRAGMA user_version` reaches 15.

**Step 5: Commit**

```bash
git add src/db/migrations/015_gamification.ts src/db/migrations/index.ts
git commit -m "feat: add celebrations_seen table for gamification milestones"
```

---

### Task 8: GamificationEngine service

**Files:**
- Create: `src/services/GamificationEngine.ts`
- Test: `__tests__/services/GamificationEngine.test.ts`

**Step 1: Write the failing tests first**

Mirror the mocking pattern from `__tests__/store/goalStore.test.ts` (mock `getDb`).

```ts
import { GamificationEngine } from '../../src/services/GamificationEngine';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({ getDb: jest.fn() }));

describe('GamificationEngine.getBillStreak', () => {
  let mockExecute: jest.Mock;
  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({ execute: mockExecute });
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T12:00:00Z').getTime());
  });
  afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

  it('returns 0 when a bill was paid late this cycle', async () => {
    // arrange rows representing one bill paid after its due_day
    mockExecute.mockResolvedValueOnce({ rows: [{ due_day: 5, last_paid_at: new Date('2026-08-10').getTime() }] });
    const streak = await GamificationEngine.getBillStreak();
    expect(streak).toBe(0);
  });

  it('counts consecutive on-time bill payments', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [
      { due_day: 1, last_paid_at: new Date('2026-08-01').getTime() },
      { due_day: 15, last_paid_at: new Date('2026-07-14').getTime() },
    ] });
    const streak = await GamificationEngine.getBillStreak();
    expect(streak).toBe(2);
  });
});

describe('GamificationEngine.checkGoalMilestone', () => {
  let mockExecute: jest.Mock;
  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({ execute: mockExecute });
  });

  it('fires a milestone the first time a goal crosses 50%', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // celebrations_seen: not seen yet
    mockExecute.mockResolvedValueOnce({}); // INSERT into celebrations_seen
    const result = await GamificationEngine.checkGoalMilestone('goal1', 5000, 10000);
    expect(result).toEqual({ milestone: 50, isNew: true });
  });

  it('does not re-fire a milestone already recorded in celebrations_seen', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ milestone_key: 'goal1_50' }] });
    const result = await GamificationEngine.checkGoalMilestone('goal1', 5000, 10000);
    expect(result).toEqual({ milestone: 50, isNew: false });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/services/GamificationEngine.test.ts`
Expected: FAIL — `Cannot find module '../../src/services/GamificationEngine'`

**Step 3: Write the implementation**

```ts
import { getDb } from '../store/database';

const generateId = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface MilestoneResult {
  milestone: 50 | 75 | 100;
  isNew: boolean;
}

export const GamificationEngine = {
  /** Consecutive bill-payment cycles paid on or before due_day, most recent first. */
  async getBillStreak(): Promise<number> {
    const db = getDb();
    try {
      const result = await db.execute(`
        SELECT due_day, last_paid_at FROM bills
        WHERE last_paid_at IS NOT NULL
        ORDER BY last_paid_at DESC
      `);
      const rows = (result.rows ?? []) as { due_day: number; last_paid_at: number }[];
      let streak = 0;
      for (const row of rows) {
        const paidDate = new Date(row.last_paid_at);
        if (paidDate.getDate() > row.due_day) break;
        streak++;
      }
      return streak;
    } catch (e) {
      console.error('[GamificationEngine] getBillStreak error:', e);
      return 0;
    }
  },

  /** Checks whether a goal just crossed a milestone threshold, deduped against celebrations_seen. */
  async checkGoalMilestone(goalId: string, currentAmount: number, targetAmount: number): Promise<MilestoneResult | null> {
    const db = getDb();
    const pct = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    const thresholds: Array<50 | 75 | 100> = [100, 75, 50];
    const crossed = thresholds.find(t => pct >= t);
    if (!crossed) return null;

    const key = `${goalId}_${crossed}`;
    try {
      const existing = await db.execute(
        'SELECT milestone_key FROM celebrations_seen WHERE milestone_key = ?;',
        [key],
      );
      const isNew = (existing.rows ?? []).length === 0;
      if (isNew) {
        await db.execute(
          'INSERT INTO celebrations_seen (id, milestone_key, seen_at) VALUES (?, ?, ?);',
          [generateId(), key, Date.now()],
        );
      }
      return { milestone: crossed, isNew };
    } catch (e) {
      console.error('[GamificationEngine] checkGoalMilestone error:', e);
      return null;
    }
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/services/GamificationEngine.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/services/GamificationEngine.ts __tests__/services/GamificationEngine.test.ts
git commit -m "feat: add GamificationEngine with bill streak and goal milestone logic"
```

---

### Task 9: gamificationStore

**Files:**
- Create: `src/store/gamificationStore.ts`
- Test: `__tests__/store/gamificationStore.test.ts`

**Step 1: Write the failing test**

```ts
import { useGamificationStore } from '../../src/store/gamificationStore';
import { GamificationEngine } from '../../src/services/GamificationEngine';

jest.mock('../../src/services/GamificationEngine', () => ({
  GamificationEngine: { getBillStreak: jest.fn() },
}));

describe('gamificationStore', () => {
  beforeEach(() => {
    useGamificationStore.setState({ billStreak: 0, loading: true });
    jest.clearAllMocks();
  });

  it('loads bill streak from GamificationEngine', async () => {
    (GamificationEngine.getBillStreak as jest.Mock).mockResolvedValue(7);
    await useGamificationStore.getState().loadGamification();
    expect(useGamificationStore.getState().billStreak).toBe(7);
    expect(useGamificationStore.getState().loading).toBe(false);
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx jest __tests__/store/gamificationStore.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement, mirroring `intelligenceStore.ts` exactly**

```ts
import { create } from 'zustand';
import { financialEventBus } from '../services/EventBus';
import { GamificationEngine } from '../services/GamificationEngine';

interface GamificationState {
  billStreak: number;
  loading: boolean;
  loadGamification: () => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  billStreak: 0,
  loading: true,

  loadGamification: async () => {
    set({ loading: true });
    try {
      const billStreak = await GamificationEngine.getBillStreak();
      set({ billStreak, loading: false });
    } catch (e) {
      console.error('[gamificationStore] Error loading:', e);
      set({ loading: false });
    }
  },
}));

financialEventBus.subscribe(() => {
  useGamificationStore.getState().loadGamification();
});
```

**Step 4: Run to verify it passes**

Run: `npx jest __tests__/store/gamificationStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/store/gamificationStore.ts __tests__/store/gamificationStore.test.ts
git commit -m "feat: add gamificationStore wired to financialEventBus"
```

---

### Task 10: Wire bill streak into StreakBanner / Dashboard

**Files:**
- Modify: `src/screens/user/UserDashboardScreen.tsx`

**Step 1: Read the current streak wiring**

Find where `getBudgetStreak()` (from `insightsEngine.ts`) currently feeds `StreakBanner` (per prior audit: `UserDashboardScreen.tsx:179-182`). Decide message copy: since there are now two streak sources (budget streak, bill streak), pick whichever is higher and non-zero, or show both if `StreakBanner` supports a second line — simplest correct choice: show the bill streak if `billStreak > 0`, otherwise fall back to the existing budget streak, since bill-payment reliability is the more concrete, controllable action per the design's loss-aversion framing.

**Step 2: Add the store hook and pass its value down**

```tsx
import { useGamificationStore } from '../../store/gamificationStore';
// ...
const billStreak = useGamificationStore(s => s.billStreak);
useEffect(() => { useGamificationStore.getState().loadGamification(); }, []);
// ...
<StreakBanner days={billStreak > 0 ? billStreak : budgetStreakDays} message={billStreak > 0 ? 'Bills paid on time' : existingMessage} />
```

(Read the existing `budgetStreakDays`/message variable names in the file before writing this — don't guess the exact local variable names.)

**Step 3: Manually verify**

Run app, check Home dashboard renders the streak banner with either source, no crash if both are 0 (banner already returns `null` when `days <= 0`).

**Step 4: Commit**

```bash
git add src/screens/user/UserDashboardScreen.tsx
git commit -m "feat: surface bill-payment streak on dashboard StreakBanner"
```

---

### Task 11: Goal-milestone celebration on GoalsScreen

**Files:**
- Modify: `src/screens/user/GoalsScreen.tsx`
- Modify: `src/store/goalStore.ts`

**Step 1: Call the milestone check after a successful fund action**

In `goalStore.ts`'s `updateGoalProgress`, after the `FinancialLedgerService.fundGoal` call succeeds, call `GamificationEngine.checkGoalMilestone(id, newAmount, goal.targetAmount)` and store the result somewhere the UI can read it for one render (simplest: return it from `updateGoalProgress` rather than storing state, since it's a one-shot UI event, not persistent state).

```ts
updateGoalProgress: async (id, amountPaise) => {
  set({ isLoading: true, error: null });
  try {
    await FinancialLedgerService.fundGoal(id, amountPaise);
    const goal = get().goals.find(g => g.id === id);
    if (goal) {
      const newAmount = goal.currentAmount + amountPaise;
      return await GamificationEngine.checkGoalMilestone(id, newAmount, goal.targetAmount);
    }
    return null;
  } catch (e: any) {
    // ...unchanged
  } finally {
    set({ isLoading: false });
  }
},
```

Update the `GoalStoreState` interface's `updateGoalProgress` return type to `Promise<import('../services/GamificationEngine').MilestoneResult | null>`.

**Step 2: In GoalsScreen, show a celebration when `isNew` is true**

Read the existing fund-goal handler in `GoalsScreen.tsx` (found by the earlier audit at lines 38-62), capture the return value, and if `result?.isNew`, trigger a brief animated celebration — reuse the existing `Animated`/Reanimated primitives already imported in that file (e.g. a `FadeInDown` + scale pulse on the progress bar, or a full-screen confetti-free "🎉 50% there!" toast using whatever toast/alert primitive the codebase already has). Do not add a new animation or confetti library — this is explicitly out of scope per the design doc (research flagged spin-wheel/confetti-heavy mechanics as gimmicks; a "one moment of animated positive feedback" using existing primitives is the right amount, not a fireworks show).

**Step 3: Manually verify**

Fund a goal past 50% in the running app, confirm the celebration fires once, fund again without crossing 75%, confirm no repeat celebration, restart the app and re-fund past the same goal's current level — confirm 50% doesn't re-fire (proves `celebrations_seen` dedup works end-to-end).

**Step 4: Commit**

```bash
git add src/store/goalStore.ts src/screens/user/GoalsScreen.tsx
git commit -m "feat: celebrate goal milestones once, deduped via celebrations_seen"
```

---

### Task 12: Full verification pass

**Step 1: Run the full test suite**

Run: `npx jest`
Expected: all tests pass (existing `App.test.tsx` AsyncStorage failure is pre-existing/unrelated per `APP_FLOW_PLAN.md` — confirm it's the *same* failure, not a new one).

**Step 2: Run the TypeScript check**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this plan's files.

**Step 3: Manual smoke test of every new screen**

Settings → Profile (set name, verify persists) → Security (set PIN, change PIN, remove PIN) → Help Center (FAQ renders, mailto opens) → Dark mode toggle (StreakBanner/SmartInsightCard/SpendingHeatmap all correct in both themes) → fund a goal to 50%+ (celebration fires once) → pay a bill on time twice in a row (streak banner reflects it).

**Step 4: No commit — this is a verification-only task.** If anything fails, return to the relevant task above and fix before considering the plan complete.
