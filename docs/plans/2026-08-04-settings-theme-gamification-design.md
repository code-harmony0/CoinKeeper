# Settings Completion, Theme Cleanup & Gamification Layer — Design

**Date:** 2026-08-04
**Status:** Approved for planning

## Context

A full-app audit (graphify + targeted research, 2026-08-04) found the Money Plan / Goals / Bills ledger integration is further along than a prior trace suggested — `FinancialLedgerService` + `EventBus` already wire Goals and Bills into the real SQLite ledger, with the UI (`GoalsScreen`, `BillsScreen`) doing full CRUD, not demo data. What's still broken:

1. Four Settings rows (Profile, Payment Methods, Security, Help Center) are `handleInertPress` no-ops — the most visible "this app is broken" signal a new user hits.
2. Three components (`StreakBanner`, `SmartInsightCard`, `SpendingHeatmap`) still import the legacy `designTokens` system instead of `specTheme`, so they don't respect the dark/light theme toggle the rest of the app now has.
3. Gamification is minimal — one streak banner, two milestone toasts. External research (Mint, YNAB, Qapital, CRED, Jupiter, myPaisaa) ranked mechanics by fit for a trust-based chit-fund + expense product: streaks with loss-aversion framing, one-time milestone celebrations, and transparent (not competitive) group accountability are proven; spin-wheel rewards, leaderboards, and generic badges are gimmicks that don't suit a finance product built on trust.
4. The chit-fund side (pro app) is the actual differentiator (8/10 business value per `business_advisor_assessment.md` vs. 5/10 for expense tracking alone) and has a natural progression mechanic (myPaisaa-style "reliable members graduate to bigger pools") that nothing in the lite app has an equivalent for.

## Goals

- Close the trust gap: no dead-looking interactive rows anywhere in Settings.
- Bring the last theme-inconsistent components onto `specTheme`.
- Add a gamification layer using only research-validated mechanics (streaks, one-time milestone celebrations, transparent accountability), following the codebase's existing service+store+EventBus pattern rather than inventing a new architecture.
- Explicitly do NOT build: spin-wheel/reward mechanics, competitive leaderboards, generic collectible badges — these are the "avoid" tier from research for this product category.

## Non-goals (this design)

- Chit-fund "reliable member" progression is scoped conceptually here (§5) but is a separate implementation plan, since it touches the chit-fund data model directly and needs its own design pass.
- Real PIN/biometric enforcement — Security screen ships as groundwork (toggle stub), not a working auth gate.
- Payment Methods — removed, not built. CoinKeeper never holds or moves funds, so this row shouldn't exist.

## 1. Settings completion

| Screen | Scope |
|---|---|
| `ProfileScreen` | Name, avatar, currency, monthly income. Also fills the onboarding gap noted in `APP_FLOW_PLAN.md` §A (no income-capture step exists anywhere today) — income lives here as the single source of truth, read by `FinancialIntelligenceEngine` wherever it currently needs an income figure. |
| `SecurityScreen` | PIN + biometric toggle UI only; no enforcement logic wired yet. Ships as a real screen so the row stops being a lie, with a clear "coming soon" state on the toggle if PIN storage isn't implemented in this pass. |
| `HelpCenterScreen` | Static FAQ list + mailto/contact link. No backend needed. |
| Payment Methods row | Removed from `SettingsScreen.tsx`. |

## 2. Theme cleanup

Migrate `StreakBanner.tsx`, `SmartInsightCard.tsx`, `SpendingHeatmap.tsx` from `designTokens` imports to `specTheme`'s `useSpecTheme()` hook, matching the pattern already used by the 11 other budget/insights components. Mechanical port — no visual redesign, just token-source swap. This must land before §3, since the new streak UI extends `StreakBanner`.

## 3. Gamification layer

**Architecture:** `src/services/GamificationEngine.ts` + `src/store/gamificationStore.ts`, mirroring the existing `FinancialIntelligenceEngine` + `intelligenceStore` pattern already in the codebase. Subscribes to `financialEventBus` like every other store, so it recomputes automatically whenever a transaction/bill/goal mutation happens — no new invalidation mechanism needed.

**New migration** `015_gamification.ts`: one table, `celebrations_seen (id, milestone_key TEXT UNIQUE, seen_at INTEGER)`. Purpose: a milestone (e.g. "goal X hit 50%") celebrates exactly once, not on every dashboard render — checked before the celebration animation fires, inserted after.

**Mechanics shipped (Tier-1 only, per research):**
- **Bill-payment streak** — extends the existing budget-streak calculation pattern in `insightsEngine.ts`/`GamificationEngine.ts` to bills specifically: consecutive on-time payments, framed as "reliable payer" (loss-aversion: losing a streak reads worse than gaining one).
- **Goal-milestone celebration** — one-time animated moment at 50%/75%/100% goal completion, gated by `celebrations_seen`. Reuses existing `CountUp`/Reanimated primitives already in the app — no new animation library.
- **Explicitly excluded:** points/XP, levels, badge collections, spin-wheel rewards, leaderboards.

## 4. Data flow

```
Transaction/Bill/Goal mutation
  → FinancialLedgerService writes to SQLite
  → financialEventBus.emit()
  → gamificationStore recomputes (streak counts, milestone checks)
  → GamificationEngine checks celebrations_seen before firing a new celebration
  → UI (StreakBanner, new milestone celebration component) re-renders
```

No new write paths into the ledger — gamification is read-only against `transactions`/`bills`/`goals`, plus its own `celebrations_seen` table.

## 5. Chit-fund progression (concept only — separate plan)

"Reliable member" status computed from on-time contribution history within `src/modules/chitfund/`, surfaced as a transparency badge on a member's profile inside a group — not a cross-group ranking or leaderboard. Pro app only, matching the existing `CHITFUND_ENABLED` gate. Deferred to its own design/implementation plan since it needs to touch the chit-fund data model, which this design doesn't otherwise scope.

## Testing

- Settings: navigation smoke tests for the 3 new screens (existing `routeIntegrity.test.ts` pattern covers dead-route regressions).
- Theme migration: visual — verify dark/light toggle on the 3 migrated components.
- Gamification: unit tests for streak calculation edge cases (missed day resets, same-day double payment doesn't double-count) and for `celebrations_seen` dedup (milestone doesn't re-fire on next app open).
