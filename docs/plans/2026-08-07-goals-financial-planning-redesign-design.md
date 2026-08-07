# Goals: From Jar Tracker to Financial Decision System — Design

**Date:** 2026-08-07
**Status:** Approved for implementation planning

## Context

The existing Goal system (`GoalsScreen.tsx`, `goalStore.ts`, `GoalsHeroDashboard.tsx`,
`FocusGoalHeroCard.tsx`, `SecondaryGoalCard.tsx`) only reports saved-vs-target. It does not
answer any of the following, which a real financial-planning surface must:

- Which goal should I fund today?
- Can I afford this contribution?
- When will I reach my goal?
- What is slowing me down?
- What happens if I contribute more?
- Which goal deserves priority?
- Which goal is at risk?
- Am I improving?

### Confirmed bugs found during audit

1. **Unit mismatch in `getEmergencyFundTarget()`** (`src/store/goalStore.ts:144`) —
   `targetAmount` is set to `totalPaise / 100` (rupees) while `currentAmount` stays in paise.
   Every emergency-fund progress calculation is off by 100x until a contribution happens to
   correct it.
2. **Two conflicting definitions of "primary goal."** `GoalsScreen.tsx` sorts
   emergency-fund-first then insertion order for its "Focus Goal." `insightsEngine.getPrimaryGoal()`
   independently picks the goal closest to completion for milestone notifications. These
   disagree and must be unified.
3. **Fragile goal↔transaction join.** `FinancialIntelligenceEngine.ts`'s transfer-details query
   joins `transactions` to `goals` via `t.description = 'Transfer to ' || g.name` — a string
   match, not a foreign key. Breaks on goal rename, collides on duplicate names, and makes
   reliable per-goal contribution-velocity queries impossible today (no `goal_id` column exists
   on `transactions`).

## Product Decisions (confirmed)

- **Track and confirm, never control** (per `PRODUCT.md` positioning). Affordability checks
  warn, they never block submission — the app has no custody of funds.
- **No real scheduling infrastructure this pass.** "Auto-contribution suggestion" is a computed
  recommended amount + one-tap prefill into the existing Add Funds flow. No background job, no
  notification infra — that would need its own design pass.
- **Scoped to Goals + a shared intelligence layer.** Dashboard, Reports, and AI Coach
  (`FinancialContextService`) are not redesigned in this pass. The new `goalIntelligence.ts`
  service is built so those surfaces *can* consume it later without rework.
- **`primaryAccent` (`#007AFF`, DESIGN.md) remains the only color for active/selected/priority
  states.** "No package-default blue" refers to React Native's unstyled defaults, not the app's
  branded accent token.

## UX Model — the 8 questions, answered

| Question | Mechanism |
|---|---|
| Which goal should I fund today? | Unified priority score reorders the goal list; rank #1 is the Focus card, with a "#1 Priority" badge. |
| Can I afford this contribution? | `AddFundsSheet` shows remaining monthly affordable amount before submit; warns (doesn't block) if exceeded. |
| When will I reach my goal? | ETA on every card — velocity-based if no deadline, deadline-vs-pace if one is set. |
| What is slowing me down? | Stall state surfaces directly ("No contribution in 34 days"), replacing the percentage line. |
| What if I contribute ₹500 more? | What-if chip row inside `AddFundsSheet`, live-recomputes ETA. |
| Which goal deserves priority? | Same priority score as above, made explicit via the badge instead of implied by list order. |
| Which goal is at risk? | At-risk state with the specific reason ("pace is 40% behind deadline"). |
| Am I improving? | Hero dashboard shows this month's contribution total vs. last month's, not a static sentence. |

## UI Model

Card states — healthy / stalled / overdue / at-risk / completed / low-priority — use only
existing DESIGN.md tokens, no new colors invented:

- **Healthy** — normal accent-rotation tint (lavender/pink/mint/peach/sky per DESIGN.md §2), fill in `*Deep`.
- **Stalled** — same tint; percentage line replaced by a `textSecondary` note. No alarm color — absence of momentum is communicated in copy.
- **At risk** — `danger` (`#FF3B30`) used sparingly as icon+text, not a full card recolor.
- **Overdue** — same `danger` treatment, "Missed [date]" copy.
- **Completed** — `success` (`#34C759`) badge, extended from `FocusGoalHeroCard` to `SecondaryGoalCard`.
- **Low-priority** — no new visual treatment; expressed purely via sort position.

Coach banner sentences must trace to a real computed fact from `goalIntelligence.ts` — no
canned copy standing in for logic that doesn't exist. Motion stays within DESIGN.md §8's
existing spring config; no new animation system introduced.

## Intelligence Layer — `src/services/goalIntelligence.ts`

Pure functions, same shape as `moneyPlanIntelligence.ts`. Callers pass in data; no DB access
inside the scoring functions.

- `computeGoalHealth(goal, contributions, today)` → score, state, ETA, days since last
  contribution, pace status. Velocity = trailing-3-month average of that goal's
  `transfer_to_goal` contributions.
- `rankGoalPriority(goals[])` → single sorted list blending emergency-fund status, at-risk/overdue
  urgency, and proximity to completion. Both `GoalsScreen` and `insightsEngine.getPrimaryGoal()`
  call this — one definition, everywhere.
- `checkAffordability(amountPaise, monthlyContributedSoFarPaise, savingsBudgetPaise)` → warn-only
  affordability result. Reads `FinancialIntelligenceEngine`'s existing `savingsBudget`, doesn't
  recompute income independently.
- `simulateWhatIf(goal, extraMonthlyPaise)` → hypothetical new ETA.
- `recommendContribution(goal, savingsBudgetRemainingPaise)` → suggested next amount.
- `generateRecommendationCopy(health, priority)` → the one sentence shown in card/coach banner.

All money math stays in paise throughout.

## Architecture Changes

1. Fix `getEmergencyFundTarget()` unit bug — remove the `/100`.
2. New migration `015_goal_contribution_link.ts` — adds `goal_id TEXT REFERENCES goals(id)` to
   `transactions`. `FinancialLedgerService.fundGoal()` writes it. Backfills existing rows via
   best-effort description match, one time, in the migration. Fixes the fragile join in
   `FinancialIntelligenceEngine.ts`.
3. `goalIntelligence.ts` becomes the single source of truth for priority, health, ETA, and
   progress math — replacing three duplicated `Math.min(100, Math.round(...))` call sites
   (`FocusGoalHeroCard`, `SecondaryGoalCard`, `GoalsHeroDashboard`) and the two conflicting
   "primary goal" definitions.
4. `insightsEngine.getPrimaryGoal()` becomes a thin wrapper over `rankGoalPriority()` —
   external signature unchanged, so the milestone-notification call site doesn't need to change.
5. `AddGoalSheet.tsx` gains an optional deadline input (field already exists in schema/type,
   was never exposed in UI).
6. `AddFundsSheet.tsx` gains an affordability line and what-if chip row.
7. `GoalsScreen.tsx` sorts via `rankGoalPriority()` instead of local insertion-order logic.
8. `fundGoal()`'s existing external behavior (emits `financialEventBus`, writes a Savings-bucket
   transaction) is preserved as-is aside from adding `goal_id`.

## File-by-File Touch List

- `src/db/migrations/015_goal_contribution_link.ts` — new
- `src/db/migrations/index.ts` — register migration 015
- `src/services/goalIntelligence.ts` — new
- `src/services/FinancialLedgerService.ts` — `fundGoal()` writes `goal_id`
- `src/services/FinancialIntelligenceEngine.ts` — transfer-details join uses `goal_id`
- `src/services/insightsEngine.ts` — `getPrimaryGoal()` delegates to `goalIntelligence`
- `src/store/goalStore.ts` — unit-bug fix; sorting delegates to `goalIntelligence`
- `src/components/insights/FocusGoalHeroCard.tsx` — health/ETA/priority badge/state UI
- `src/components/insights/SecondaryGoalCard.tsx` — same state system, compact layout
- `src/components/insights/GoalsHeroDashboard.tsx` — real month-over-month trend, computed coach copy
- `src/components/modals/AddGoalSheet.tsx` — deadline input
- `src/components/modals/AddFundsSheet.tsx` — affordability line + what-if chips
- `src/screens/user/GoalsScreen.tsx` — wires intelligence layer through to cards

## Explicitly Out of Scope This Pass

- Redesigning Dashboard, Reports, or AI Coach UI (intelligence layer is consumable by them later)
- Real scheduled/recurring auto-contributions
- Points, coins, badges, or streak-counter gamification
