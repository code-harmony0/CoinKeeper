# CoinKeeper — App Flow Plan (Source of Truth)

**Last updated:** 2026-07-31
**Purpose:** This is the canonical screen map for the lite (public) consumer app. Every future prompt/task should reference screen names from this file — no screen exists outside this list. Status is verified against the actual codebase, not assumed.

> ✅ **Merged (2026-07-31):** `docs/GEMINI_FEATURE_PLAN.md`'s deep feature list (transfers, tags, split transactions, confidence-scored categorization, etc.) has been verified against the repo and folded in as section H below. Two of Gemini's status claims were corrected on verification — see H for detail and for a real bug that verification surfaced and fixed along the way.
>
> **⚠️ Still open:** `docs/plans/2026-07-29-coinkeeper-finance.md` is a full phased TDD implementation plan already checked in — likely the actual master spec Gemini was quoting sections of (§5, §7.x, etc.). Its Phase 0 tasks match the 5 most recent commits on this branch — already shipped. It's more detailed and more architecturally authoritative than this file (it specifies the DB schema, encryption approach, ingestion order, etc. that this file doesn't). Recommend it become the primary source of truth, with this file kept as the quick-reference screen map.

### Legend
- ✅ **Built & wired** — screen exists, is registered in navigation, and is reachable
- ⚠️ **Partial** — component/service exists but isn't a full screen, or is a screen with dead rows/no-op buttons
- 🔴 **Missing** — does not exist anywhere in the codebase
- 🐛 **Built but broken** — exists and is wired, but has a real bug (crash, dead nav target, etc.)

---

## A. Entry Screens (First Time)

| Screen | Status | Notes |
|---|---|---|
| Splash | ✅ | `src/screens/onboarding/SplashScreen.tsx`, wired in `RootNavigator` |
| Welcome / Onboarding | ✅ | `OnboardingScreen.tsx` — carousel, not verified against the "tagline + Get Started" copy in the spec |
| Privacy Promise | ✅ | `PrivacyFirstScreen.tsx` |
| SMS Permission | 🔴 | No permission-request screen. `smsParserService.ts` exists as a service but is **imported nowhere** — fully orphaned code |
| Set Income | 🔴 | No screen. No onboarding field to capture income at all |
| Create PIN | 🔴 | No PIN entry/storage anywhere in `src` |
| Enable Biometric | 🔴 | No biometric library wired, no screen |
| First SMS Scan + Review | 🔴 | No scan screen. `smsParserService` has parsing logic but no UI ever calls it |

**Reality:** onboarding today is `Splash → Onboarding → PrivacyFirst → UserTabs`. Five of the eight spec'd entry steps don't exist. If SMS auto-import is a real requirement, `smsParserService.ts` is the starting point — it's already written, just never connected.

---

## B. Bottom Tabs (Main App)

| Tab | Status | Notes |
|---|---|---|
| 🏠 Home / Dashboard | ✅ | `UserDashboardScreen.tsx` — balance, chart, insights, goal tracker card. No "Upcoming bills" section (no Bills feature exists) |
| 📋 Activity / Transactions | ✅ | `TransactionsScreen.tsx` — list, search-adjacent filter chips, swipe not verified |
| ➕ Add (FAB) | ✅ | `AddScreen.tsx` → `AddTransactionSheet` |
| 📊 Analytics / Reports | ✅ | `ReportsScreen.tsx` reachable via `navigate('Reports')`, registered at root level (not tab-scoped per your map, but reachable) |
| ⚙️ Settings | ⚠️ | `SettingsScreen.tsx` exists, but **6 of its rows are `handleInertPress` no-ops**: Profile, Payment Methods, Security, Help Center all currently do nothing when tapped |
| 🌙 Kaza (conditional) | ✅ | `KazaScreen.tsx` — missed-prayer tracker. **Confirmed intentional (2026-07-31)**, not scope creep. Behind `ISLAMIC_ENABLED` + a per-user "pinned" preference (`getUserTabs` in `userTabs.ts`) — only takes a tab slot if the user opts in; otherwise reachable from Settings. Ships in both lite and pro. |

---

## C. Settings Sub-Screens

| Screen | Status | Notes |
|---|---|---|
| Profile | 🔴 | Row exists, tap does nothing |
| Categories (+ budget per category) | ⚠️ | `CategorySelector.tsx` + `categorizationService.ts` exist for transaction entry, but there's no standalone "manage categories" screen |
| Budgets (50/30/20) | ⚠️ | `BudgetDonut.tsx` component exists (used on Home), no dedicated Budgets settings screen with sliders |
| Bills | 🔴 | Nothing — no model, no screen, no reminder logic |
| Goals | ⚠️ | `GoalTrackerCard.tsx` renders one primary goal on Home; no "Goals list" or "Add Goal" screen |
| Backup & Restore | 🔴 | Nothing |
| Notifications (toggles) | ⚠️ | A single `notifications` boolean toggle exists in Settings; no per-category (bills/budgets/goals) breakdown |
| Privacy | ⚠️ | Covered once at onboarding (`PrivacyFirstScreen`); no persistent Settings entry to re-read it |
| Help | 🔴 | Row exists, tap does nothing |

---

## D. Transaction Screens

| Screen | Status | Notes |
|---|---|---|
| Transaction Detail | 🔴 | No dedicated detail screen for the lite app (chit-fund module has one, but that's pro-only and a different data model) |
| Edit Transaction | 🔴 | `AddTransactionSheet` supports `onSubmit` for create; no pre-filled edit path found |
| SMS Review | 🔴 | Depends on SMS scan existing first (see section A) |

---

## E. Analytics Sub-Screens

| Screen | Status | Notes |
|---|---|---|
| Category Drill-down | 🔴 | Reports screen shows aggregates; tapping a chart segment does not filter |
| Merchant Detail | 🔴 | No merchant-level view |
| Export (CSV/PDF) | 🔴 | An export service exists but only inside the chit-fund (pro) module — nothing for the lite consumer app |

---

## F. Notification Deep Links

All four (Bill Due, Budget Overspend, Goal Reminder, SMS Parsed) are 🔴 — no local notification scheduling exists yet, and three of the four target screens (Bills, SMS Review) don't exist to deep-link into.

---

## G. Private Build Only — Chit Fund Tab

This part of your map is close to reality already — most of it is built in `src/modules/chitfund/`.

| Screen | Status |
|---|---|
| Chits List | ✅ `GroupsScreen.tsx` |
| Create Pool | ✅ `CreateGroupScreen.tsx` |
| Pool Detail | ✅ `GroupDetailsScreen.tsx` |
| Member History | ✅ `MemberDetailsScreen` (via Members stack) |
| Mark Paid | ✅ contribution flow in Collections |
| Admin Confirm | ✅ `ApproveContributionsScreen.tsx` / `PendingConfirmationsScreen.tsx` |
| Payout Timeline | ✅ Draws module |
| **Sign up / Forgot password** | 🐛→✅ **just fixed** — `RegisterScreen` and `ForgotPasswordScreen` were fully built but never registered in navigation; both links in `LoginForm` dead-ended. Fixed and verified. |

---

## H. Deep Feature Spec (from `docs/GEMINI_FEATURE_PLAN.md`, verified 2026-07-31)

Gemini's status claims were re-checked against the actual source (not re-trusted). 12 of 14 were accurate. Two were wrong, and verifying them surfaced a real bug, now fixed.

| Feature | Gemini said | Verified status | Notes |
|---|---|---|---|
| Transfers | 🔴 missing | 🔴 **confirmed** | `type` in `src/types/transaction.ts` is `'income' \| 'expense'` only |
| Tags | 🔴 missing | 🔴 **confirmed** | No `tags` field anywhere on `Transaction` |
| Split transactions | 🔴 missing | 🔴 **confirmed** | No `splits` field anywhere |
| Confidence-scored auto-categorization | ⚠️ partial | ⚠️ **confirmed** | `categorizationService.ts` exists, zero importers — orphaned, matches the `smsParserService.ts` pattern from section A |
| Local merchant memory | 🔴 missing | 🔴 **confirmed** | No merchant→category mapping store found |
| Subscription-detector false positives | ⚠️ partial | ⚠️ **confirmed** | `subscriptionDetector.ts` exists, zero importers — also orphaned |
| Statement import (PDF/Excel) | 🔴 missing | 🔴 **confirmed** | No import logic in the lite app |
| Forecast balance | 🔴 missing | 🔴 **confirmed** | No forecasting logic found |
| Net worth module | 🔴 missing | 🔴 **confirmed** | Only basic balance tracking exists |
| Feedback system | 🔴 missing | 🔴 **confirmed** | Matches the dead Help Center row in section B |
| Role-based access | ✅ built | ✅ **confirmed** | `PermissionsRolesScreen.tsx`, wired in `chitFundRoutes.ts` (pro only) |
| Audit-safe local settings | ✅ built | ✅ **confirmed** | `AuditLogScreen.tsx`, wired in `chitFundRoutes.ts` (pro only) |
| **Savings suggestions** | ⚠️ partial | 🐛 **corrected — built but was silently broken, now fixed** | `insightsEngine.ts` was querying a `personal_transactions` table that nothing writes to (real transactions go into `transactions`, written by `transactionStore.ts`). Every "Daily Safe Spending" / "Budget Exceeded" / weekend-spend / duplicate-payment / overspend insight was computing from an always-empty table. Fixed: swapped to the real `transactions` table, `type = 'expense'`, and `merchant` (a column that never existed) → `description AS merchant`. |
| **Streaks/Nudges** | 🔴 missing | ✅ **corrected — already built**, same bug as above | `getBudgetStreak()` in `insightsEngine.ts` + `StreakBanner.tsx` on `UserDashboardScreen` are fully wired and rendering today. Gemini missed it because it's implemented as one function inside `insightsEngine.ts`, not a dedicated file. It had the identical dead-table bug — spend against the empty table always reads as 0, so every user saw a fabricated ~60-day streak regardless of real behavior. Fixed in the same edit as above. |

**Why the correction matters:** the two wrong entries weren't just misfiled — real users were seeing fabricated positive-reinforcement numbers (a false streak, an inflated "safe to spend" figure) on the single most-viewed screen in the app. That's a trust problem for a finance app, not a cosmetic one. Verify `npx jest` and `npx tsc --noEmit` stay clean after pulling this change (both were clean when the fix landed; one pre-existing, unrelated `App.test.tsx` failure exists — see the "Known pre-existing test issue" note below).

**Not yet actioned (real decisions, not gaps in verification):**
- Transfers' open question — single-account "untracked movement" vs. real multi-account model — is a schema decision that should happen before Phase 1 of `docs/plans/2026-07-29-coinkeeper-finance.md` locks the DB schema, since retrofitting `account_id` after data exists is expensive.
- Confidence threshold for auto-categorization review, tag creation model (predefined vs. on-the-fly), and split depth are all open per Gemini's own notes — none answered here, deliberately, since they're product calls.

### Known pre-existing test issue (unrelated to any change made today)
`__tests__/App.test.tsx` fails with `NativeModule: AsyncStorage is null` — reproduced identically with today's changes stashed out, so it predates this session's work. Root cause not investigated; flag for whoever owns test infra.

---

## Bugs found and fixed this session (already shipped, listed for the record)

1. **Crash**: `ExpandingTabBar` called 5 hooks conditionally — any admin drill-down (e.g. into a group) crashed the app with "rendered fewer hooks than expected." Fixed.
2. **Dead flow**: `Register` / `ForgotPassword` navigation targets were never registered. Fixed.
3. **Feature silently dead in consumer app**: the tab bar's scroll-to-hide behavior had zero producers outside the chit-fund module — Home/Transactions/Settings/Kaza never fed it. Wired all four.
4. **UX bug**: tab bar could get stuck hidden after returning from a detail screen mid-scroll. Fixed with a visibility reset on navigation change.
5. Regression tests added for both the crash and the dead-route class of bug (`__tests__/components/tabBarHookOrder.test.ts`, `__tests__/navigation/routeIntegrity.test.ts`), verified with negative controls.
6. **Data-integrity bug**: `insightsEngine.ts` computed the Home screen's streak banner and "Daily Safe Spending" insight from a `personal_transactions` table that nothing populates — every user saw a fabricated streak and an inflated safe-to-spend number. Fixed to query the real `transactions` table. See section H for detail.

---

## Recommended priority order for what's next

This list is ordered by (a) what's cheapest because groundwork already exists, then (b) core-loop value, then (c) nice-to-have breadth. Not started — for your review/reordering before work begins.

### Tier 1 — dead code to finish, groundwork already exists
1. **Settings dead rows** (Profile, Payment Methods, Security, Help Center) — either build the screens or remove the rows. Leaving live-looking rows that do nothing is the single most visible "this app is broken" signal to a user.
2. **SMS parsing** — `smsParserService.ts` is fully written and orphaned. Decide: ship the SMS-permission + scan + review flow (adds 3 screens), or delete the dead service. Leaving it half-built is wasted code either way.
3. **Transaction Detail + Edit** — `AddTransactionSheet` already has the form; Edit just needs a pre-fill path and a detail screen wrapping it.

### Tier 2 — core budgeting loop (this is what "budgeting app" usually means to a user)
4. **Categories management screen** — the selector exists for entry; a manage/edit screen is the missing half.
5. **Budgets screen** — `BudgetDonut` is already rendered on Home; promote it into a real settings screen with the 50/30/20 sliders.
6. **Goals list + Add Goal** — `GoalTrackerCard` shows one goal; needs a list + create/edit flow.
7. **Category drill-down from Analytics** — tapping a chart segment should filter Activity, not be a dead tap.

### Tier 3 — scope decisions needed before building
8. **Bills** — whole feature, zero code. Needs a decision on reminder mechanism (local notifications) before screens make sense.
9. **Backup & Restore** — needs a decision on where backups go (file share sheet only, or also Drive) before building.
10. **Local notifications** (bill due / overspend / goal reminder / SMS parsed) — depends on Bills + SMS existing first; do this last.
11. **Export (CSV/PDF)** for the lite app — the chit-fund module's `exportService.ts` is a reusable reference implementation, not reusable code (different module, stays out of lite bundle by design).

**Cut (2026-07-31, user decision):** Zakat Calculator — not needed, dropped from scope entirely.

---

## How to keep this file honest

Before marking anything ✅ here, verify against the actual repo (`grep`/`graphify query`, not memory) — this file replaces guesswork, so it should never encode guesswork itself. Update the status table when a Tier item ships, and add newly discovered bugs to the "found and fixed" log so the history doesn't get lost.
