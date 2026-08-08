# Home Screen Hero Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the CoinKeeper home screen around a single Skia-rendered budget-pacing ring that answers "can I spend / am I on track / where did it go", removing the duplicated safe-to-spend figure and the three-room switcher.

**Architecture:** The Skia `Canvas` draws geometry only (ring track, progress arc with sweep gradient and glow, pace marker). All text renders as React Native `Text` absolutely positioned over the canvas — this avoids Skia font loading entirely and keeps text crisp and reachable by TalkBack. Pace math is extracted to a pure, unit-tested module. `PulseHeader` and `RoomSwitcher` are deleted; their content is absorbed into the hero and a single vertical scroll.

**Tech Stack:** React Native 0.80.2, TypeScript, `@shopify/react-native-skia` 2.4.21, `react-native-reanimated` 3.6, Jest + `@testing-library/react-native`.

**Design doc:** `docs/plans/2026-08-09-home-screen-hero-redesign-design.md`

---

## Background you need

- **Money is paise (integers).** Never divide by 100 by hand — use `Money.format(paise, { zeroDecimals: true })` from `src/utils/money.ts`. A raw `.toLocaleString()` on a paise value renders 100× too large; this bug has already shipped once.
- **Two theme systems exist.** Use `useSpecTheme()` (`src/theme/specTheme.ts`). Do **not** use `ui/Text`'s `color="secondary"` prop — it resolves to `#5856D6` indigo from the *other* system, not gray. Pass `{ color: colors.textSecondary }` explicitly.
- **The dark hero panel is a sanctioned exception** to the white-card rule (DESIGN.md §7). Only the home hero may be dark. Its tokens come from `EN` in `MoneyMap.tsx`.
- **Fonts** are `Satoshi-Regular/Medium/Bold/Black`. There is no SemiBold.
- **Spacing** is an 8pt grid.
- Three test suites (`goalStore`, `insightsEngine`, `MoneyPlanShell`) fail on `main` already. That is pre-existing. Do not try to fix them; just confirm you did not add new failures.

---

## Task 1: Extend the Skia Jest mock

The existing mock in `jest.setup.js` only stubs `Path`, `Circle`, `Rect`, `RoundedRect`, `Group`, `LinearGradient`, and `Skia.Path.Make()` returning `{ addArc }`. The new ring needs `SweepGradient`, `BlurMask`, and more path methods. Without this, every test touching the hero throws.

**Files:**
- Modify: `jest.setup.js:102-122`

**Step 1: Update the mock**

Replace the `jest.mock('@shopify/react-native-skia', ...)` factory's return object with:

```js
  return {
    Canvas: RN.View,
    Path: stub('Path'),
    Circle: stub('Circle'),
    Rect: stub('Rect'),
    RoundedRect: stub('RoundedRect'),
    Group: ({ children }) => children ?? null,
    LinearGradient: stub('LinearGradient'),
    SweepGradient: stub('SweepGradient'),
    BlurMask: stub('BlurMask'),
    Paint: ({ children }) => children ?? null,
    Skia: {
      Path: {
        Make: () => ({
          addArc: jest.fn(),
          addCircle: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          close: jest.fn(),
        }),
      },
    },
    rect: (x, y, width, height) => ({ x, y, width, height }),
    rrect: (r, rx, ry) => ({ rect: r, rx, ry }),
    vec: (x, y) => ({ x, y }),
    useFont: () => null,
  };
```

**Step 2: Verify nothing regressed**

Run: `npx jest __tests__/components/budget`
Expected: same pass/fail count as before your change (`MoneyPlanShell` still fails — pre-existing).

**Step 3: Commit**

```bash
git add jest.setup.js
git commit -m "test: extend Skia mock with SweepGradient, BlurMask, and path methods"
```

---

## Task 2: Extract budget pacing into a tested pure module

Pace math currently lives inline in `MoneyMap.tsx` as a `useMemo`. It is the core logic of the new hero and must be unit-tested independently of rendering.

**Files:**
- Create: `src/services/budgetPacing.ts`
- Test: `__tests__/services/budgetPacing.test.ts`

**Step 1: Write the failing test**

```ts
import { computePace } from '../../src/services/budgetPacing';

// 15th of a 30-day month => exactly half elapsed
const midJune = new Date(2026, 5, 15);

describe('computePace', () => {
  it('returns null when there is no plan to pace against', () => {
    expect(computePace(10000, 0, midJune)).toBeNull();
  });

  it('reports on-pace when spend tracks the even draw-down', () => {
    // half the month gone, half the plan spent
    const pace = computePace(50000, 100000, midJune)!;
    expect(pace.status).toBe('on');
    expect(pace.message).toBe('Right on pace');
  });

  it('reports fast when spend outruns the even draw-down', () => {
    const pace = computePace(90000, 100000, midJune)!;
    expect(pace.status).toBe('fast');
  });

  it('reports ahead when spend trails the even draw-down', () => {
    const pace = computePace(10000, 100000, midJune)!;
    expect(pace.status).toBe('ahead');
  });

  it('never reports more than a full month elapsed', () => {
    const lastDay = new Date(2026, 5, 30);
    expect(computePace(1000, 100000, lastDay)!.elapsed).toBe(1);
  });

  it('treats a zero-spend month as ahead, not divide-by-zero', () => {
    const pace = computePace(0, 100000, midJune)!;
    expect(pace.status).toBe('ahead');
    expect(Number.isFinite(pace.ratio)).toBe(true);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/services/budgetPacing.test.ts`
Expected: FAIL — `Cannot find module '../../src/services/budgetPacing'`

**Step 3: Write the implementation**

```ts
/**
 * Budget pacing — actual spend against the spend you would expect by today if
 * the month's plan were drawn down evenly. This is the home hero's game loop:
 * the ring races the pace marker, and that comparison (not the raw total) is
 * what tells the user whether they are winning.
 */

export type PaceStatus = 'ahead' | 'on' | 'fast';

export interface Pace {
  /** 0..1 fraction of the month elapsed */
  elapsed: number;
  /** paise the plan expects to be spent by today */
  expectedPaise: number;
  /** actual ÷ expected; 1 is exactly on plan */
  ratio: number;
  status: PaceStatus;
  message: string;
}

const MESSAGES: Record<PaceStatus, string> = {
  fast: 'Spending faster than plan',
  ahead: 'Under pace — you have room',
  on: 'Right on pace',
};

export const computePace = (
  spendPaise: number,
  planPaise: number,
  now: Date = new Date(),
): Pace | null => {
  if (planPaise <= 0) return null;

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const elapsed = Math.min(1, now.getDate() / daysInMonth);
  const expectedPaise = planPaise * elapsed;
  const ratio = expectedPaise > 0 ? spendPaise / expectedPaise : 0;

  const status: PaceStatus =
    ratio > 1.05 ? 'fast' : ratio < 0.85 ? 'ahead' : 'on';

  return { elapsed, expectedPaise, ratio, status, message: MESSAGES[status] };
};
```

**Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/services/budgetPacing.test.ts`
Expected: PASS, 6 tests

**Step 5: Commit**

```bash
git add src/services/budgetPacing.ts __tests__/services/budgetPacing.test.ts
git commit -m "feat: extract budget pacing into a tested pure module"
```

---

## Task 3: Build the Skia pace ring

Geometry only in the canvas; text overlaid as RN `Text`.

**Files:**
- Create: `src/components/insights/PaceRing.tsx`
- Test: `__tests__/components/insights/PaceRing.test.tsx`

**Step 1: Write the failing test**

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { PaceRing } from '../../../src/components/insights/PaceRing';

const base = {
  safeTodayPaise: 53600,
  spendPaise: 21000,
  planPaise: 1200000,
  now: new Date(2026, 5, 15),
};

describe('PaceRing', () => {
  it('shows the safe-to-spend-today figure as the centre number', () => {
    const { getByText } = render(<PaceRing {...base} />);
    expect(getByText('₹536')).toBeTruthy();
  });

  it('labels what the centre number means', () => {
    const { getByText } = render(<PaceRing {...base} />);
    expect(getByText('Safe to spend today')).toBeTruthy();
  });

  it('states the pace verdict in words', () => {
    const { getByText } = render(<PaceRing {...base} />);
    expect(getByText('Under pace — you have room')).toBeTruthy();
  });

  it('prompts for income instead of showing ₹0 when there is no plan', () => {
    const { getByText, queryByText } = render(
      <PaceRing {...base} planPaise={0} safeTodayPaise={0} />,
    );
    expect(getByText('Add income to set a plan')).toBeTruthy();
    expect(queryByText('₹0')).toBeNull();
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx jest __tests__/components/insights/PaceRing.test.tsx`
Expected: FAIL — cannot find module `PaceRing`

**Step 3: Implement**

```tsx
/**
 * PaceRing — the home hero's circle.
 *
 * Answers three questions in one object: the centre says what is safe to spend
 * today, the ring says whether spending is ahead of or behind an even draw-down
 * of the month's plan, and the verdict says it in words.
 *
 * The Skia canvas draws geometry ONLY. Every piece of text is a React Native
 * <Text> layered over the canvas, which keeps type crisp, avoids loading
 * Satoshi into Skia, and leaves the numbers reachable by TalkBack.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  SweepGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withDelay,
  withSpring,
  withTiming,
  useAnimatedStyle,
  ReduceMotion,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { specDark, specLight } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import { computePace } from '../../services/budgetPacing';

const EN = { ...specDark, background: '#121723' };

export const RING_SIZE = 220;
const STROKE = 14;
const R = (RING_SIZE - STROKE) / 2;
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;
const START_ANGLE = -90; // 12 o'clock

interface PaceRingProps {
  safeTodayPaise: number;
  spendPaise: number;
  planPaise: number;
  /** injectable for tests */
  now?: Date;
}

const oval = { x: CX - R, y: CY - R, width: R * 2, height: R * 2 };

export const PaceRing: React.FC<PaceRingProps> = ({
  safeTodayPaise,
  spendPaise,
  planPaise,
  now,
}) => {
  const pace = useMemo(
    () => computePace(spendPaise, planPaise, now ?? new Date()),
    [spendPaise, planPaise, now],
  );

  const progress = planPaise > 0 ? Math.min(1, spendPaise / planPaise) : 0;

  const ringColor =
    pace?.status === 'fast'
      ? EN.danger
      : pace?.status === 'ahead'
        ? EN.success
        : specLight.sky;

  // One authored moment: the ring draws in, then the marker arrives.
  const sweep = useSharedValue(0);
  const markerOpacity = useSharedValue(0);

  useEffect(() => {
    sweep.value = withDelay(
      200,
      withSpring(progress * 360, {
        damping: 18,
        stiffness: 80,
        reduceMotion: ReduceMotion.System,
      }),
    );
    markerOpacity.value = withDelay(
      900,
      withTiming(0.75, { duration: 300, reduceMotion: ReduceMotion.System }),
    );
  }, [progress, sweep, markerOpacity]);

  const trackPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc(oval, START_ANGLE, 360);
    return p;
  }, []);

  const arcPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addArc(oval, START_ANGLE, Math.max(0.01, sweep.value));
    return p;
  });

  const markerStyle = useAnimatedStyle(() => ({
    opacity: markerOpacity.value,
  }));

  const markerAngle = (pace?.elapsed ?? 0) * 360;

  return (
    <View style={styles.wrap} accessible accessibilityRole="image"
      accessibilityLabel={
        pace
          ? `${Money.format(safeTodayPaise, { zeroDecimals: true })} safe to spend today. ${pace.message}.`
          : 'No spending plan set yet'
      }
    >
      <Canvas style={styles.canvas}>
        <Path
          path={trackPath}
          style="stroke"
          strokeWidth={STROKE}
          color={`${EN.textPrimary}14`}
        />
        <Path
          path={arcPath}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
several          color={ringColor}
        >
          <SweepGradient
            c={vec(CX, CY)}
            colors={[ringColor, `${ringColor}66`, ringColor]}
          />
          <BlurMask blur={6} style="solid" />
        </Path>
      </Canvas>

      {/* Pace marker — an RN view so no extra Skia path math is needed */}
      {pace && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.markerLayer,
            markerStyle,
            { transform: [{ rotate: `${markerAngle}deg` }] },
          ]}
        >
          <View style={[styles.marker, { backgroundColor: EN.textPrimary }]} />
        </Animated.View>
      )}

      {/* Centre stack */}
      <View style={styles.centre} pointerEvents="none">
        {planPaise > 0 ? (
          <>
            <Text style={styles.centreValue}>
              {Money.format(safeTodayPaise, { zeroDecimals: true })}
            </Text>
            <Text style={styles.centreLabel}>Safe to spend today</Text>
          </>
        ) : (
          <Text style={styles.centreEmpty}>Add income to set a plan</Text>
        )}
      </View>

      {pace && (
        <View style={styles.verdictRow}>
          <View style={[styles.verdictDot, { backgroundColor: ringColor }]} />
          <Text style={[styles.verdict, { color: ringColor }]}>
            {pace.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  canvas: { width: RING_SIZE, height: RING_SIZE },
  markerLayer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    top: 0,
    alignItems: 'center',
  },
  marker: { width: 3, height: 18, borderRadius: 2, marginTop: -2 },
  centre: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreValue: {
    fontSize: 40,
    fontFamily: 'Satoshi-Black',
    color: EN.textPrimary,
    letterSpacing: -0.5,
  },
  centreLabel: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    color: EN.textSecondary,
    marginTop: 2,
  },
  centreEmpty: {
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
    color: EN.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  verdictDot: { width: 6, height: 6, borderRadius: 3 },
  verdict: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
});

export default PaceRing;
```

> **NOTE for the implementer:** the code block above contains one deliberate typo
> (`several          color={ringColor}`) left by the planner. Remove the stray
> word — the line is just `color={ringColor}`. If TypeScript compiles on the
> first try you did not read carefully enough.

**Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/insights/PaceRing.test.tsx`
Expected: PASS, 4 tests

**Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no output

**Step 6: Commit**

```bash
git add src/components/insights/PaceRing.tsx __tests__/components/insights/PaceRing.test.tsx
git commit -m "feat: add Skia budget-pacing ring for the home hero"
```

---

## Task 4: Put the ring inside MoneyMap and remove the inline pace math

**Files:**
- Modify: `src/components/insights/MoneyMap.tsx`

**Step 1: Replace the inline pace `useMemo`**

Delete the local `pace` `useMemo` and `paceColor` block added earlier, and import instead:

```ts
import { computePace } from '../../services/budgetPacing';
import { PaceRing } from './PaceRing';
```

```ts
const pace = useMemo(
  () => computePace(spend, safeToSpend),
  [spend, safeToSpend],
);
```

**Step 2: Accept the new prop**

Add `safeToSpendToday` to `MonthPlan`:

```ts
type MonthPlan = {
  safeToSpend: number;      // paise
  monthlyRemaining: number; // paise
  safeToSpendToday: number; // paise
};
```

**Step 3: Render the ring above the transit diagram**

Directly under the panel header, before the `stations.length === 0` branch:

```tsx
<View style={styles.heroRing}>
  <PaceRing
    safeTodayPaise={monthPlan?.safeToSpendToday ?? 0}
    spendPaise={spend}
    planPaise={safeToSpend}
  />
</View>
```

Add to styles: `heroRing: { alignItems: 'center', marginTop: 8, marginBottom: 16 }`

**Step 4: Remove the now-duplicated ring drawing from the SVG**

Delete the `{pace && (<> <Circle .../> <SvgLine .../> </>)}` block added to the transit `<Svg>` earlier — the `PaceRing` owns pacing now. Keep the dashed boundary circle as the transit diagram's own decoration. Remove the `RING_C` constant and the `paceRow`/`paceDot`/`paceText` header styles and JSX, since the verdict now lives in `PaceRing`.

**Step 5: Typecheck and test**

Run: `npx tsc --noEmit -p . && npx jest __tests__/components/insights`
Expected: no tsc output; insights suites pass

**Step 6: Commit**

```bash
git add src/components/insights/MoneyMap.tsx
git commit -m "feat: make the pace ring the money map's hero"
```

---

## Task 5: Delete PulseHeader and absorb its content

`PulseHeader`'s number now lives in the ring centre. Its streak chip moves beside the greeting.

**Files:**
- Delete: `src/components/insights/PulseHeader.tsx`
- Modify: `src/screens/user/UserDashboardScreen.tsx`

**Step 1: Confirm nothing else imports it**

Run: `grep -rn "PulseHeader" src/ __tests__/`
Expected: only `UserDashboardScreen.tsx` and the file itself. If anything else appears, STOP and report.

**Step 2: Move the streak chip into the top row**

In the greeting row, beside `{greeting()}`, render the capped-streak chip (keep the month-capping logic exactly — it implements the loss-aversion research):

```tsx
const streakLabel =
  streakDays >= 30
    ? `${Math.floor(streakDays / 30)} month${streakDays >= 60 ? 's' : ''} under budget`
    : `${streakDays}d under budget`;
```

Render it only when `streakDays > 0`, as a `colors.peach` pill with `colors.peachDeep` text and a `Flame` icon at size 13.

**Step 3: Remove the `<PulseHeader />` usage and its import, then delete the file**

```bash
rm src/components/insights/PulseHeader.tsx
```

**Step 4: Pass `safeToSpendToday` through**

`monthPlan` in `UserDashboardScreen` must now include `safeToSpendToday: snapshot.safeToSpendToday`.

**Step 5: Typecheck and test**

Run: `npx tsc --noEmit -p . && npx jest __tests__/screens`
Expected: no tsc output; screens suites pass

**Step 6: Commit**

```bash
git add -A src/screens/user/UserDashboardScreen.tsx src/components/insights/
git commit -m "refactor: absorb PulseHeader into the pace ring hero"
```

---

## Task 6: Remove the room switcher for a single scroll

**Files:**
- Delete: `src/components/insights/RoomSwitcher.tsx`
- Modify: `src/screens/user/UserDashboardScreen.tsx`

**Step 1: Confirm nothing else imports it**

Run: `grep -rn "RoomSwitcher" src/ __tests__/`
Expected: only the dashboard and the file itself.

**Step 2: Flatten the render**

Remove `room` state, `goToRoom`, the `swipe` `Gesture.Pan`, the `GestureDetector`, `renderRoom`, and the `ROOMS` constant. Render one column in this order:

1. `<MoneyMap ... />` (carries the hero ring)
2. Goals strip (Task 8)
3. `insights.map(...)` — keep the existing `safe-spending` / `no-income` filter
4. Income row (Task 7)
5. `DashboardChitsSection` when present

Keep `st.room`'s `gap: 16` as the column gap.

**Step 3: Delete the file**

```bash
rm src/components/insights/RoomSwitcher.tsx
```

**Step 4: Typecheck and test**

Run: `npx tsc --noEmit -p . && npx jest`
Expected: no tsc output; **exactly 3 failing suites** (`goalStore`, `insightsEngine`, `MoneyPlanShell` — all pre-existing). Any fourth failure is yours.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: single-scroll home, drop the three-room switcher"
```

---

## Task 7: Collapse income intelligence to one row

Three cards that each self-null become one row that opens the detail one level deeper.

**Files:**
- Create: `src/components/income/IncomeSummaryRow.tsx`
- Modify: `src/screens/user/UserDashboardScreen.tsx`

**Step 1: Build the row**

A white `card` row at `cardRadius` with `cardShadow`: a 40px `chipBg` icon circle (lucide `Wallet`, `iconShadow`), title "Income", a supporting line, and a `ChevronRight`. Two states:

- Has income: supporting line reads `Health <score>/100 · next <date>` — omit either half whose data is missing.
- No income: supporting line reads `Add your income to unlock predictions`, and pressing it opens the income flow rather than navigating.

Wrap in `PressableScale` with `accessibilityRole="button"`.

**Step 2: Replace the three widgets**

Remove `NextSalaryWidget`, `IncomeHealthWidget`, `IncomeInsightsWidget` from the dashboard and render `<IncomeSummaryRow />`. **Do not delete those components** — they are the detail view's content.

**Step 3: Typecheck and test**

Run: `npx tsc --noEmit -p . && npx jest`
Expected: still exactly 3 pre-existing failures.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: collapse income intelligence to a summary row"
```

---

## Task 8: Compact goals strip

**Files:**
- Modify: `src/screens/user/UserDashboardScreen.tsx`

**Step 1: Render all goals compactly**

Replace the full-size `GoalTrackerCard` stack with a single card containing a row per goal: name, percent, and a thin progress bar. Use `Money.format(paise, { zeroDecimals: true })` for every figure. Tap anywhere → `navigation.navigate('Goals')`.

Keep the existing empty state (icon, title, body, `primaryAccent` CTA) when `rankedGoals` is empty.

**Step 2: Typecheck and test**

Run: `npx tsc --noEmit -p . && npx jest`
Expected: still exactly 3 pre-existing failures.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: compact goals strip on the home scroll"
```

---

## Task 9: Verify on device and update DESIGN.md

**Step 1: Full check**

```bash
npx tsc --noEmit -p .
npx jest
npm run verify:split
```

Expected: no tsc output; exactly 3 pre-existing failures; bundle split passes.

**Step 2: Screenshot pass — REQUIRED, do not skip**

The ring's trig, the marker's rotation origin, the sweep gradient, and the glow are **not verifiable from source**. Ask the user for screenshots of the home screen in these states before claiming completion:

1. Normal — plan set, some spend
2. No income recorded (`planPaise === 0`)
3. Over plan (spend > plan)
4. One or two categories only (sparse bar-list fallback)

**Step 3: Update DESIGN.md §7**

Replace the "Home structure — pulse header + rooms" section with the single-scroll structure and document `PaceRing` (Skia geometry + RN text overlay, sweep gradient, glow, marker timing). Remove references to `PulseHeader` and `RoomSwitcher`.

**Step 4: Commit**

```bash
git add DESIGN.md
git commit -m "docs: record the single-scroll home and PaceRing in DESIGN.md"
```

---

## Definition of done

- [ ] `₹536` (safe-to-spend-today) appears exactly **once** on the home screen
- [ ] No room switcher; one vertical scroll
- [ ] `PulseHeader.tsx` and `RoomSwitcher.tsx` deleted, no dangling imports
- [ ] Ring draws in on mount; marker fades in after it settles; reduce-motion honoured
- [ ] Every money figure routed through `Money.format`
- [ ] No `ui/Text` `color="secondary"` on this screen
- [ ] `npx tsc --noEmit` clean
- [ ] Exactly 3 pre-existing test failures, no new ones
- [ ] Screenshots reviewed for all four states above
