# CoinKeeper Finance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship one React Native codebase producing two Android APKs — a public local-first expense tracker, and a private build that adds the existing Firebase chit-fund/admin platform — with all financial data encrypted at rest on device.

**Architecture:** Two Gradle product flavors (`lite`, `pro`). Module exclusion is enforced at *bundle* level via a Metro `blockList` + Babel inlined constant, not at runtime, so the public APK provably contains zero chit-fund and zero Firebase code. All personal finance data lives in a SQLCipher-encrypted SQLite database via the already-installed `@op-engineering/op-sqlite`. The existing Firestore chit-fund/admin platform is untouched and lives only in the `pro` flavor.

**Tech Stack:** React Native 0.80.2 / React 19 (existing — do NOT downgrade), TypeScript, `@op-engineering/op-sqlite` (SQLCipher), Zustand 5, React Navigation 6, Reanimated 3, Skia, `@react-native-firebase/*` (pro flavor only), Jest.

---

## Reading this plan

- **Phase 0 and Phase 1 are written at full TDD granularity** — every step is 2–5 minutes, with exact commands and expected output. Execute them literally.
- **Phases 2–7 are written as task outlines.** Before starting each, re-run the writing-plans skill against that phase to expand it to full granularity. Expanding all seven phases up front would be waste — the schema and parser decisions in Phase 1 will change the details of Phase 3 onward.
- Commit after every task. Never batch commits across tasks.

---

## Decisions locked before implementation

These were settled during the critique. Do not re-litigate them mid-execution.

| Decision | Resolution | Why |
|---|---|---|
| RN version | Stay on **0.80.2 / React 19** | The master spec pinned 0.74.3. Downgrading a working New-Arch app costs weeks and buys nothing. |
| SQLite driver | **`@op-engineering/op-sqlite`** (already installed) | The spec pinned `react-native-sqlite-storage`, which is bridge-based, semi-abandoned, and has no encryption. op-sqlite is JSI and ships SQLCipher. |
| Money storage | **INTEGER paise**, never `REAL` | Float currency drifts. Every amount in the DB is an integer count of paise; format at the display boundary only. |
| Notifications | **Notifee** | The spec pinned `react-native-push-notification` (unmaintained since 2022, no New Arch support). |
| Charts | **Skia only** | Repo currently has victory-native + chart-kit + Skia. Consolidate to one. |
| Flavor names | **`lite` / `pro`** | `public` and `private` are Java keywords; the current build.gradle uses them and it is a latent trap. |
| Module gating | **Bundle-level exclusion**, not `&&` | See Task 0.3. A runtime boolean ships all the code anyway. |
| Auto-import | **Manual entry is the core; SMS is an enhancement** | Verified 2026-07-29: Play's SMS/Call Log policy does not list expense tracking as a permitted use, and comparable apps were rejected in Dec 2025. See "Ingestion ladder". |

### Ingestion ladder (build in this order)

1. **Manual entry** — both flavors, zero permissions. This is the product.
2. **Statement import** (CSV/PDF) — both flavors, zero permissions, retroactive for years instead of 30 days. `@react-native-documents/picker` is already a dependency.
3. **SMS parsing** — `pro` flavor only, behind its own module flag.
4. **Notification listener** — only after verifying Android 15/16 notification-redaction behaviour against primary AOSP docs. Do not design around it yet.

### Resolved by code inspection

- **Kaza (missed-prayer tracker) is kept, but demoted out of the tab bar.** `grep -cE "transaction|amount|budget|expense" src/screens/user/KazaScreen.tsx` returns `0` — it is fully self-contained (`kazaStore`, `getPreference`, `specTheme`, shared anim components only), so it is cheap to keep and cheap to relocate. It moves to **Settings → Kaza tracker**, plus a single opt-in during onboarding; when enabled it may surface as a tab. Rationale: the tab bar has five slots and one is the FAB; spending one on a non-finance feature in an app listed as an expense tracker is a category-mismatch signal to Play reviewers and noise for users who don't want it. It gets its own `islamic` flag — the current gating behind `chitFund` is a bug.
- **`src/screens/user/HomeScreen.tsx` and `ProfileScreen.tsx` are deleted.** `git log` shows HomeScreen has exactly one commit (`5ad5db0 "first commit with half coocked"`) and was never touched again; it imports the older `designTokens` theme. `UserDashboardScreen` has four commits, is a self-described "SpecTheme-driven rewrite", and already wires `insightsEngine`, `SmartInsightCard`, `StreakBanner`, and `GoalTrackerCard`. HomeScreen is the abandoned original, not a newer design — UserDashboardScreen is strictly ahead and is roughly 60% of the §7 dashboard already. It gains Safe-to-Spend, the bills alert, and the quick-action row.
- **Theme systems must be collapsed to one.** `designTokens` is imported by 27 files, `specTheme` by 17; new work uses specTheme, older screens use designTokens. Until this is resolved, "do not change the UI design" is ambiguous because there are two designs. **specTheme wins**; `designTokens` becomes a compatibility shim retired file-by-file. Do this before Phase 3 or every new screen inherits the fork. (Note: `userFintechTheme.ts` no longer exists and nothing imports it — it appears to have become `specTheme.ts`.)

---

## Phase 0: Unblock the build and make the split real

Nothing else can be verified until the two flavors compile and the exclusion is provable.

### Task 0.1: Rename flavors to `lite` / `pro`

**Files:**
- Modify: `android/app/build.gradle:88-104`
- Modify: `package.json:5-12` (the `android:*` / `ios:*` scripts)
- Delete: `.env.public`, `.env.private`

**Step 1: Read the current flavor block**

Run: `sed -n '85,110p' android/app/build.gradle`
Expected: a `productFlavors` block containing `public { ... }` and `private { ... }`.

**Step 2: Replace the flavor block**

```gradle
    flavorDimensions "version"
    productFlavors {
        lite {
            dimension "version"
            applicationId "com.coinkeeper.finance"
            resValue "string", "app_name", "CoinKeeper"
            buildConfigField "boolean", "INCLUDE_CHITFUND", "false"
        }
        pro {
            dimension "version"
            applicationId "com.coinkeeper.finance.pro"
            resValue "string", "app_name", "CoinKeeper Pro"
            buildConfigField "boolean", "INCLUDE_CHITFUND", "true"
        }
    }
```

**Step 3: Replace the npm scripts**

The `.env` copy-dance is obsolete — the flavor now carries the flag through `BuildConfig`, and `react-native-config` is no longer the source of truth.

```json
    "android": "react-native run-android --mode=proDebug",
    "android:lite": "react-native run-android --mode=liteDebug",
    "android:pro": "react-native run-android --mode=proDebug",
```

**Step 4: Delete the dead env files**

```bash
rm .env.public .env.private
```

**Step 5: Verify Gradle can configure both flavors**

Run: `cd android && ./gradlew tasks --all | grep -iE 'assemble(Lite|Pro)Debug'`
Expected: both `assembleLiteDebug` and `assembleProDebug` are listed. No Groovy parse errors.

**Step 6: Commit**

```bash
git add android/app/build.gradle package.json
git commit -m "build: rename flavors to lite/pro and drop .env variant dance"
```

---

### Task 0.2: Fix the Firebase build failure

**Context:** `android/app/google-services.json` contains only `com.coinkeeper`. Both flavors now declare different application IDs (`com.coinkeeper.finance`, `com.coinkeeper.finance.pro`), so the `com.google.gms.google-services` plugin fails with *"No matching client found for package name"*. Additionally the `lite` flavor must not contain Firebase at all.

**Files:**
- Modify: `android/app/build.gradle:1-5`
- Create: `android/app/src/pro/google-services.json`
- Delete: `android/app/google-services.json`
- Modify: `react-native.config.js`

**Step 1: Register the new package name in Firebase**

In the Firebase console for project `coinkeeper-c53e7`, add an Android app with package name `com.coinkeeper.finance.pro`. Download the new `google-services.json`.

**Step 2: Move the config into the pro source set**

```bash
mkdir -p android/app/src/pro
mv android/app/google-services.json android/app/src/pro/google-services.json
```

Then replace its contents with the freshly downloaded file from Step 1.

**Step 3: Apply the gms plugin only to the pro flavor**

Remove the top-level `apply plugin: 'com.google.gms.google-services'` from line 4 of `android/app/build.gradle` and replace it with a conditional apply at the bottom of the file:

```gradle
if (getGradle().getStartParameter().getTaskRequests().toString().toLowerCase().contains("pro")) {
    apply plugin: 'com.google.gms.google-services'
}
```

**Step 4: Disable Firebase autolinking so it can be scoped per flavor**

In `react-native.config.js`:

```js
module.exports = {
  dependencies: {
    '@react-native-firebase/app': { platforms: { android: null } },
    '@react-native-firebase/auth': { platforms: { android: null } },
    '@react-native-firebase/firestore': { platforms: { android: null } },
    '@react-native-firebase/functions': { platforms: { android: null } },
  },
};
```

Then add the native dependencies to the `pro` configuration only, in `android/app/build.gradle` `dependencies { }`:

```gradle
    proImplementation project(':react-native-firebase_app')
    proImplementation project(':react-native-firebase_auth')
    proImplementation project(':react-native-firebase_firestore')
    proImplementation project(':react-native-firebase_functions')
```

**Step 5: Verify the pro build compiles**

Run: `cd android && ./gradlew assembleProDebug`
Expected: `BUILD SUCCESSFUL`.

**Step 6: Verify the lite build compiles without Firebase**

Run: `cd android && ./gradlew assembleLiteDebug`
Expected: `BUILD SUCCESSFUL`.

**Step 7: Commit**

```bash
git add android/app/build.gradle react-native.config.js android/app/src/pro/google-services.json
git rm --cached android/app/google-services.json
git commit -m "build: scope Firebase to the pro flavor only"
```

---

### Task 0.3: Make module exclusion real (bundle-level, not runtime)

**Context:** This is the task that satisfies "chit fund code excluded from public builds." The current `isModuleEnabled('chitFund') && <Screen/>` pattern still ships every chit-fund screen into the lite bundle, where `unzip -p app.apk assets/index.android.bundle | strings` reveals it.

**Files:**
- Create: `index.lite.js`
- Create: `index.pro.js`
- Modify: `index.js`
- Modify: `metro.config.js`
- Modify: `babel.config.js`
- Create: `src/config/buildFlags.ts`
- Test: `__tests__/config/buildFlags.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/config/buildFlags.test.ts
import { CHITFUND_ENABLED, ISLAMIC_ENABLED } from '../../src/config/buildFlags';

describe('buildFlags', () => {
  it('exposes chit fund as a compile-time boolean literal', () => {
    expect(typeof CHITFUND_ENABLED).toBe('boolean');
  });

  it('always enables the islamic module regardless of flavor', () => {
    expect(ISLAMIC_ENABLED).toBe(true);
  });
});
```

**Step 2: Run it to verify it fails**

Run: `npx jest __tests__/config/buildFlags.test.ts`
Expected: FAIL — `Cannot find module '../../src/config/buildFlags'`.

**Step 3: Create the flags module**

```ts
// src/config/buildFlags.ts
// These identifiers are replaced with literal booleans at build time by
// babel-plugin-transform-inline-environment-variables, so that dead branches
// are eliminated by Metro's minifier and never reach the bundle.
export const CHITFUND_ENABLED: boolean = process.env.CK_CHITFUND === '1';
export const ISLAMIC_ENABLED: boolean = true;
```

**Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/config/buildFlags.test.ts`
Expected: PASS.

**Step 5: Wire the Babel inlining**

```bash
npm install --save-dev babel-plugin-transform-inline-environment-variables
```

In `babel.config.js`:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['transform-inline-environment-variables', { include: ['CK_CHITFUND'] }],
    'react-native-reanimated/plugin', // must stay last
  ],
};
```

**Step 6: Block the chitfund source tree from the lite bundle**

In `metro.config.js`:

```js
const exclusionList = require('metro-config/src/defaults/exclusionList');

const blockList =
  process.env.CK_CHITFUND === '1'
    ? undefined
    : exclusionList([/src\/modules\/chitfund\/.*/]);

const config = {
  resolver: { blockList },
};
```

**Step 7: Point the flavors at separate entry files**

`index.pro.js`:
```js
process.env.CK_CHITFUND = '1';
require('./index.js');
```

`index.lite.js`:
```js
require('./index.js');
```

In `android/app/build.gradle`, inside the `react { }` block:
```gradle
    entryFile = file(System.getenv("CK_CHITFUND") == "1" ? "../../index.pro.js" : "../../index.lite.js")
```

**Step 8: Move the chit-fund code into the blocked tree**

```bash
mkdir -p src/modules/chitfund
git mv src/screens/admin src/modules/chitfund/screens
git mv src/hooks/useChitFunds.tsx src/hooks/useContributions.ts src/hooks/useDraws.ts src/hooks/useGroups.tsx src/hooks/useMembers.ts src/hooks/usePaymentConfirmations.ts src/modules/chitfund/hooks/
git mv src/screens/user/ChitDetailScreen.tsx src/screens/user/GroupsScreen.tsx src/modules/chitfund/screens/
```

Update `src/navigation/RootNavigator.tsx` to import these behind `CHITFUND_ENABLED` — Metro's dead-code elimination removes the whole `require` when the constant is `false`.

**Step 9: Verify the exclusion is real — this is the gate**

```bash
cd android && ./gradlew assembleLiteRelease
unzip -p app/build/outputs/apk/lite/release/app-lite-release.apk assets/index.android.bundle \
  | strings | grep -icE 'chitfund|ChitDetail|useDraws|firestore'
```

Expected: **`0`**. Any non-zero result means the exclusion failed and the task is not done.

**Step 10: Commit**

```bash
git add -A
git commit -m "build: enforce chit-fund exclusion at bundle level with metro blockList"
```

---

### Task 0.4: Repair the stale module tests and split the Kaza flag

**Context:** `__tests__/config/modules.test.ts` mocks `react-native-config`, but `src/config/modules.ts` now reads `NativeModules.BuildConfig`. The test passes for the wrong reason. Separately, `src/navigation/userTabs.ts:8` gates the Kaza prayer tracker behind `chitFundEnabled`, which is semantically wrong.

**Files:**
- Modify: `src/config/modules.ts`
- Modify: `src/navigation/userTabs.ts`
- Modify: `__tests__/config/modules.test.ts`
- Modify: `__tests__/navigation/UserTabNavigator.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/navigation/UserTabNavigator.test.ts
import { getUserTabs } from '../../src/navigation/userTabs';

describe('getUserTabs', () => {
  it('does not spend a tab slot on Kaza by default', () => {
    const names = getUserTabs({ chitFund: false, islamic: true, kazaPinned: false }).map(t => t.name);
    expect(names).not.toContain('Kaza');
    expect(names).toEqual(['Home', 'Transactions', 'Add', 'Settings']);
  });

  it('pins Kaza as a tab only when the user opted in', () => {
    const names = getUserTabs({ chitFund: false, islamic: true, kazaPinned: true }).map(t => t.name);
    expect(names).toContain('Kaza');
  });

  it('never pins Kaza when the islamic module is off', () => {
    const names = getUserTabs({ chitFund: false, islamic: false, kazaPinned: true }).map(t => t.name);
    expect(names).not.toContain('Kaza');
  });

  it('adds Chits only when the chit fund module is enabled', () => {
    const names = getUserTabs({ chitFund: true, islamic: true, kazaPinned: false }).map(t => t.name);
    expect(names).toContain('Chits');
  });
});
```

`kazaPinned` reads from the `preferences` table (default `false`), set by the onboarding opt-in or the Settings toggle. Kaza is always reachable from Settings when `islamic` is true, regardless of pinning.

**Step 2: Run it to verify it fails**

Run: `npx jest __tests__/navigation/UserTabNavigator.test.ts`
Expected: FAIL — `getUserTabs` currently takes a single boolean.

**Step 3: Change the signature**

```ts
// src/navigation/userTabs.ts
export type ModuleFlags = { chitFund: boolean; islamic: boolean; kazaPinned: boolean };
export type TabDef = {
  name: string;
  label: string;
  icon: 'home' | 'transactions' | 'add' | 'kaza' | 'chits' | 'settings';
};

export const getUserTabs = (flags: ModuleFlags): TabDef[] => {
  const tabs: TabDef[] = [
    { name: 'Home', label: 'Home', icon: 'home' },
    { name: 'Transactions', label: 'Activity', icon: 'transactions' },
    { name: 'Add', label: 'Add', icon: 'add' },
  ];
  if (flags.islamic && flags.kazaPinned) tabs.push({ name: 'Kaza', label: 'Kaza', icon: 'kaza' });
  if (flags.chitFund) tabs.push({ name: 'Chits', label: 'Chits', icon: 'chits' });
  tabs.push({ name: 'Settings', label: 'Settings', icon: 'settings' });
  return tabs;
};
```

**Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/navigation/`
Expected: PASS (3 tests).

**Step 5: Update the caller and the stale modules test**

`src/navigation/UserTabNavigator.tsx` passes `{ chitFund: CHITFUND_ENABLED, islamic: ISLAMIC_ENABLED }`. Rewrite `__tests__/config/modules.test.ts` to import from `buildFlags` rather than mocking `react-native-config`.

**Step 6: Run the full suite**

Run: `npx jest`
Expected: all green.

**Step 7: Commit**

```bash
git add -A
git commit -m "fix: give the islamic module its own flag, independent of chit fund"
```

---

### Task 0.5: Decouple the dashboard from the chit-fund module

**Context:** `src/screens/user/UserDashboardScreen.tsx:20` statically imports `useChitFunds` and renders a hardcoded chits section. This is a static import of chit-fund code from the *default* home screen — it defeats the Metro `blockList` from Task 0.3 and will fail the `assembleLiteRelease` bundle with an unresolved module. This must land before Task 0.3's gate can pass.

**Files:**
- Create: `src/modules/chitfund/components/DashboardChitsSection.tsx`
- Modify: `src/screens/user/UserDashboardScreen.tsx`
- Test: `__tests__/screens/UserDashboardScreen.test.tsx`

**Step 1: Write the failing test**

```tsx
jest.mock('../../src/config/buildFlags', () => ({
  CHITFUND_ENABLED: false,
  ISLAMIC_ENABLED: true,
}));

import { render } from '@testing-library/react-native';
import { UserDashboardScreen } from '../../src/screens/user/UserDashboardScreen';

describe('UserDashboardScreen', () => {
  it('renders without importing chit fund code when the module is disabled', () => {
    const { queryByText } = render(<UserDashboardScreen navigation={{ navigate: jest.fn() }} />);
    expect(queryByText(/chit/i)).toBeNull();
  });
});
```

**Step 2: Run it to verify it fails**

Run: `npx jest __tests__/screens/UserDashboardScreen.test.tsx`
Expected: FAIL — the module graph pulls in `useChitFunds` regardless of the flag.

**Step 3: Extract the chits section**

Move the chits rendering (the `CHIT_TINTS` block, the `groups` mapping, and the `useChitFunds` call) into `src/modules/chitfund/components/DashboardChitsSection.tsx`, which owns its own hook call.

**Step 4: Load it conditionally in the dashboard**

```tsx
import { CHITFUND_ENABLED } from '../../config/buildFlags';

// Metro eliminates this require entirely when the constant is false.
const DashboardChitsSection = CHITFUND_ENABLED
  ? require('../../modules/chitfund/components/DashboardChitsSection').default
  : null;

// ...in render:
{DashboardChitsSection ? <DashboardChitsSection navigation={navigation} /> : null}
```

**Step 5: Run the test to verify it passes**

Run: `npx jest __tests__/screens/UserDashboardScreen.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: extract chits section so the dashboard builds without the chitfund module"
```

---

### Task 0.6: Delete dead screens

**Files:**
- Delete: `src/screens/user/HomeScreen.tsx`, `src/screens/user/ProfileScreen.tsx`
- Modify: `src/screens/index.ts`, `src/screens/user/index.ts`

**Step 1: Confirm they are unreferenced**

Run: `grep -rn "HomeScreen\|ProfileScreen" src --include='*.ts' --include='*.tsx' | grep -v 'screens/user/'`
Expected: only `src/screens/index.ts` re-exports. No navigator references either.

**Step 2: Delete and clean the barrels**

```bash
git rm src/screens/user/HomeScreen.tsx src/screens/user/ProfileScreen.tsx
```
Then remove their lines from both `index.ts` barrels.

**Step 3: Verify nothing broke**

Run: `npx tsc --noEmit && npx jest`
Expected: no errors, all tests pass.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete unreferenced HomeScreen and ProfileScreen"
```

---

## Phase 1: Encrypted database and schema

### Task 1.1: Money as integer paise ✅ DONE (2026-07-31)

`src/utils/money.ts` implements `toPaise`/`fromPaise`/`formatINR`; `__tests__/utils/money.test.ts` matches the spec below verbatim and passes (5/5). Verified independently: `tsc` clean, `Intl.NumberFormat` output confirmed byte-exact (no hidden non-breaking-space drift), no files touched outside this task's scope, no new dependencies. Not yet committed — not yet wired into `transactionStore.ts` or `database.ts` (that's Task 1.3, migrating the live `amount REAL` schema).

**Files:**
- Create: `src/utils/money.ts`
- Test: `__tests__/utils/money.test.ts`

**Step 1: Write the failing test**

```ts
import { toPaise, fromPaise, formatINR } from '../../src/utils/money';

describe('money', () => {
  it('converts rupees to integer paise', () => {
    expect(toPaise('350')).toBe(35000);
    expect(toPaise('350.75')).toBe(35075);
    expect(toPaise('1,23,456.50')).toBe(12345650);
  });

  it('never produces a float', () => {
    expect(Number.isInteger(toPaise('0.1'))).toBe(true);
    expect(toPaise('0.1') + toPaise('0.2')).toBe(toPaise('0.3'));
  });

  it('rejects negative and zero amounts', () => {
    expect(() => toPaise('-5')).toThrow();
    expect(() => toPaise('0')).toThrow();
  });

  it('formats paise in the Indian numbering system', () => {
    expect(formatINR(12345650)).toBe('₹1,23,456.50');
    expect(formatINR(35000)).toBe('₹350.00');
  });

  it('round-trips', () => {
    expect(fromPaise(toPaise('999.99'))).toBe(999.99);
  });
});
```

Note the third assertion in the second test — `0.1 + 0.2 === 0.3` is the exact bug integer paise exists to prevent. It fails with `REAL` storage.

**Step 2–5:** Run to fail, implement `src/utils/money.ts`, run to pass, commit.

---

### Task 1.2: SQLCipher-encrypted database with a hardware-backed key

**Files:**
- Create: `src/db/key.ts`, `src/db/index.ts`
- Modify: `src/store/database.ts` (becomes a thin re-export, then is deleted in 1.4)
- Test: `__tests__/db/key.test.ts`

Install `react-native-keychain` (the master spec's §8 code calls `Keychain.*` but never listed it as a dependency).

Key strategy — resolving the spec's internal contradiction between §5 and §8:
- Generate a random 256-bit key on first launch.
- Store it in Android Keystore via `react-native-keychain` with `SECURITY_LEVEL.SECURE_HARDWARE` and `ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- Gate *retrieval* behind biometric/PIN via `accessControl: BIOMETRY_ANY_OR_DEVICE_PASSCODE`. The PIN protects access to the key; it does not wrap it. This is what §8's code actually implies and it is the correct design — it means changing the device PIN does not require re-encrypting the database.
- Open the DB with `open({ name: 'coinkeeper.db', encryptionKey: key })`.

**Test note:** the meaningful test is that opening the DB with the wrong key throws. Write it as an integration test that creates a DB, closes it, and reopens with a bad key expecting `SQLITE_NOTADB`.

---

### Task 1.3: Schema v2 with migrations

**Files:**
- Create: `src/db/migrations/index.ts`, `src/db/migrations/001_initial.ts`, `src/db/migrations/002_finance.ts`
- Test: `__tests__/db/migrations.test.ts`

The master spec's §5 schema is adopted with these corrections — each one is a defect found during review:

| Spec said | Use instead | Why |
|---|---|---|
| `amount REAL` | `amount_paise INTEGER NOT NULL CHECK (amount_paise > 0)` | Float currency drifts |
| no account link | `account_id TEXT REFERENCES accounts(id)` on `transactions` | Dashboard "Total Balance" is otherwise uncomputable; every SMS pattern already captures the account last-4 and throws it away |
| `date TEXT` + `time TEXT` | `occurred_at INTEGER NOT NULL` (unix ms) | Splitting them makes intra-day ordering non-deterministic |
| `sms_hash TEXT UNIQUE` | `upi_ref TEXT UNIQUE` + `sms_hash TEXT` (non-unique) | See Task 3.2 — the spec's hash silently deletes genuine repeat payments |
| `category_budgets.spent_amount` | drop the column, compute it | Denormalized cache with no invalidation story |
| `merchant_category_map` referenced but never defined | define it | §6 requires it for correction learning |
| chit tables "only in private builds" | always create, gate only the UI | Divergent schemas fork the migration sequence between two APKs that share a backup format |
| `needs/wants/savings_percent` each 0–100 | add `CHECK (needs_percent + wants_percent + savings_percent = 100)` | Nothing enforced the sum |

**Migration from the live schema is mandatory, not optional.** `src/store/database.ts` already ships `transactions(amount REAL, category, description)` and `personal_transactions` on real devices. `002_finance.ts` must read those rows, convert amounts to paise, map `category` → `category_id`, and merge `personal_transactions` into `transactions`. Write the test with a fixture v1 database before writing the migration.

Use `PRAGMA user_version` for versioning. The spec demanded migration tests in §13 but specified no versioning mechanism at all.

---

### Task 1.4: Default categories and category seeding

Adopt §5's 13 default categories verbatim — that list is good. Seed inside migration `002`, not on every launch.

---

## Phase 2: App lock and privacy shell

- **2.1** PIN creation + confirmation screens; store an Argon2id hash of the PIN, never the PIN.
- **2.2** Biometric unlock via `react-native-biometrics`, with PIN fallback.
- **2.3** Auto-lock: lock on cold start and after 2 minutes backgrounded; timer resets on interaction.
- **2.4** `FLAG_SECURE` on dashboard, transactions, and chit screens (blocks screenshots and screen recording).
- **2.5** Onboarding flow per §7.1 Steps 1–5, minus the SMS step (moved to Phase 5). Reuse the existing `OnboardingScreen` and `PrivacyFirstScreen`.
- **2.6** The unrecoverable-data warning during PIN setup, and the "Start Fresh" recovery screen for the forgotten-PIN case.

**Watch for:** the spec proposes encrypting backups with the 4-digit PIN. 10,000 candidates is an offline brute-force in milliseconds. Backups get either Argon2id at a real cost factor or a generated 12-word recovery phrase. Do not ship PIN-encrypted backups.

---

## Phase 3: Transactions — the core loop

- **3.1** Zustand transaction store over the encrypted DB; replace `src/store/transactionStore.ts`.
- **3.2** Add-transaction bottom sheet per §7.3: custom number pad, category chips, merchant autocomplete, date picker, payment method, note. Validation: amount > 0, no future-dated expenses.
- **3.3** Transaction list per §7.4 using **FlashList** (already installed), grouped by date, with swipe-to-delete + undo, multi-select, and search.
- **3.4** Category management and the `merchant_category_map` correction-learning loop.

---

## Phase 4: Intelligence layer

- **4.1** 50/30/20 budgets with the `sum = 100` constraint.
- **4.2** Safe-to-Spend, using §7.5's formula. Edge cases from §11: income = 0, and committed > income.
- **4.3** Bills + Notifee scheduling with the three-channel setup from §9. Request `SCHEDULE_EXACT_ALARM` on Android 12+ with an inexact fallback.
- **4.4** Goals, including the auto-calculated Emergency Fund (6× average monthly expenses).
- **4.5** Subscription detector — the existing `src/services/subscriptionDetector.ts` is a 1.5K stub; rebuild it against §7.10's interval rules.

**Cut from this plan (2026-07-31, user decision):** Zakat calculator, formerly 4.6. Not needed.

---

## Phase 5: Statement import, then SMS

Deliberately ordered — statement import is permission-free and yields years of history rather than 30 days.

- **5.1** CSV/PDF statement import via `@react-native-documents/picker` with a column-mapping UI.
- **5.2** Rebuild the SMS parser (`pro` flavor only, own module flag). The existing `src/services/smsParserService.ts` needs these fixes before it is fit for purpose:
  - **Take the date from the SMS content provider, not the body.** Current code hardcodes `new Date().toISOString()`, so a 30-day historical scan stamps every transaction today — which breaks the trend chart, the budget math, and the subscription detector simultaneously. The master spec never fixed this either; not one of its 12 patterns populates `dateGroup`.
  - **Add `₹` to every pattern.** It appears in none of the spec's 12 regexes despite being extremely common.
  - **Filter by sender ID first** (`VM-HDFCBK`, `AD-SBIUPI`, …) before body matching. Higher precision than regex alone and it excludes personal SMS for free.
  - **Capture the account last-4 into `account_id`.** Every pattern already captures it and discards it.
  - **Cap body length and anchor patterns** — the spec's unanchored greedy regexes risk catastrophic backtracking.
  - **Run off the JS thread** (non-negotiable #6).
- **5.3** Duplicate detection: prefer `upi_ref` as the idempotency key; fall back to a normalized hash **scoped to a 2-minute window** only when no ref is present. The spec's approach — strip dates and ref numbers, then `UNIQUE` — collapses two genuine ₹50 payments to the same merchant on the same day into one and silently drops the second, violating its own non-negotiable #7.
- **5.4** Refund/reversal handling: skip `failed|declined`, flag `reversed|refunded` as `is_refund`, link to `parent_id` where the ref matches.

**Before starting 5.2, collect a fixture corpus of 200+ real SMS from your own device.** On-device, never uploaded. The 90% accuracy target is not reachable against invented regexes — this is the single highest-leverage input to the phase.

---

## Phase 6: Reports, export, backup

- **6.1** Consolidate to Skia; remove `victory-native` and `react-native-chart-kit`.
- **6.2** Reports per §7.8: monthly overview, category donut, spending trend, merchant analysis, payment-method split. Minimum 5 transactions before charts render.
- **6.3** CSV export (free) and PDF export (pro) via the existing `react-native-html-to-pdf` + `react-native-share`.
- **6.4** Encrypted backup/restore with Argon2id or a recovery phrase. Include a checksum. Restore offers merge-or-replace with an explicit destructive-action warning.

---

## Phase 7: Chit fund (pro flavor only)

The existing Firestore chit-fund/admin platform already implements most of this and stays as-is. The work here is integration, not rebuild:

- **7.1** Move the admin console behind the `Chits` tab in the pro flavor's user navigation.
- **7.2** Enforce §7.13's hard limits in code: 2–12 members, 2–24 months, ₹500–₹1,00,000 monthly.
- **7.3** Scroll-to-bottom disclaimer gate on pool creation, plus the persistent footer disclaimer on every pool screen.
- **7.4** Verify no interest calculation or "guaranteed returns" language exists anywhere in the module.
- **7.5** Pool ledger PDF export.

---

## Phase 8: Monetization and release prep

- **8.1** `react-native-iap` — missing from the master spec's dependency list entirely despite six Pro-gated features. Cache the entitlement locally with a grace period so the offline guarantee holds.
- **8.2** Free/Pro gates per §10.
- **8.3** Play data-safety declaration, privacy policy, store listing.
- **8.4** Performance verification against §12's budget: cold start < 2s, 60fps list scroll, 10k-row query < 50ms, APK < 25MB.

**Note on the AI advisor (§7.11):** it requires an API key, which cannot ship in an APK, which requires a proxy server — contradicting "no server of ours involved." Either accept a thin proxy or have the user supply their own key. Decide before building it; it is not scheduled in this plan.

---

## Verification gates

These are objective and non-negotiable. A phase is not done until its gate passes.

| Gate | Command | Expected |
|---|---|---|
| Chit fund excluded from lite | `unzip -p <lite.apk> assets/index.android.bundle \| strings \| grep -ic chitfund` | `0` |
| Firebase excluded from lite | `unzip -p <lite.apk> assets/index.android.bundle \| strings \| grep -ic firestore` | `0` |
| Database encrypted | open `coinkeeper.db` with plain `sqlite3` | `file is not a database` |
| Works offline | full core flow in airplane mode | no errors |
| No telemetry | `grep -rn "analytics\|crashlytics" src package.json` | no Firebase Analytics or Crashlytics |
| Money precision | `npx jest __tests__/utils/money.test.ts` | PASS |
| Migration integrity | `npx jest __tests__/db/migrations.test.ts` | PASS from a v1 fixture |

---

## What is deliberately not in this plan

- **RN downgrade to 0.74.3** — rejected; the repo is on 0.80.2 / React 19.
- **`react-native-sqlite-storage`, `react-native-get-sms-android`, `react-native-push-notification`, `react-native-gifted-charts`** — rejected in favour of what is already installed or better maintained.
- **SMS in the lite flavor** — Play policy verified 2026-07-29: expense tracking is not a permitted use case.
- **Notification listener** — deferred pending verification of Android 15/16 redaction behaviour against primary AOSP documentation.
