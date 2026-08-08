# Audit Remediation — Design

Source: product audit artifact (Transactions / Money Plan / Goals / Ecosystem passes). The audit's five top "trust" fixes (fabricated receipt AI, fake recurring detection, fake Money Plan trust checklist, split primary-goal logic, missing savings→goal bridge, missing goal celebration, one-month-only projection) are already implemented in a prior session. This document scopes what's left: the remaining Missing Features / UX / UI / Product problems and the Components to Remove/Redesign/Merge items from each pass, excluding the audit's speculative "New Components Worth Adding" wishlist unless it overlaps a concrete problem already listed.

Android-only app — no iOS build exists, so the audit's iOS-SMS-gap item is dropped from scope.

Work proceeds phase by phase, in the order the screens were audited: Transactions → Money Plan → Goals → Ecosystem. Each phase is implemented and reviewed before the next starts.

## Phase 1 — Transactions

1. **Transaction detail/edit/delete sheet.** Tapping a row currently does nothing but toggle selection; there is no way to view, correct, or delete a single transaction outside of swipe-delete. New bottom sheet, reusing `AddTransactionSheet`'s field patterns (amount, merchant, category) in edit mode.
2. **Merge tap/long-press interaction.** Tap opens the new detail sheet (item 1); long-press starts multiselect (current behavior). Today tap is dead space and multiselect entry is undiscoverable.
3. **Period selector + rescope summary cards.** The two top-of-list summary cards (Income/Expense) sum all-time regardless of the active All/Income/Expense/Transfers filter. Add a lightweight period control (This Week / This Month / Custom) and scope both the list and the cards to it.
4. **Date range + amount filters.** Today filtering is a text search plus the four segment tabs only.
5. **Fix SMS Inbox "Change Category" stub.** Currently `Alert.alert('Change Category', 'Category picker would open here.')`. Wire to the real category picker already used in the manual entry flow.
6. **Feedback after SMS bulk-approve.** Approving N transactions via "Approve All" currently gives no acknowledgment — they just vanish into the list.
7. **Custom category icon polish.** Categories beyond the 8 seeded defaults fall back to a generic icon with no visual identity. At minimum render the category's own assigned color behind the fallback icon.

## Phase 2 — Money Plan

1. **Real "money left today."** The hero's daily figure is `safeToSpend / daysInMonth` — a flat monthly average that ignores actual spend so far this month. Recompute against real spend-to-date. This becomes the one shared safe-to-spend calculation, reused in Phase 4.
2. **Promote the trajectory/projection section out of the collapsed "Explore Other Plans" accordion.** The 6/12/24-month trajectory added in the prior session is real but still hidden behind a collapsed toggle — the highest-value view on the screen defaults to invisible.
3. **Fix hardcoded "AFTER SAVING" bullets.** Confirmed in `MoneyPlanSaveBar.tsx:95-111` — "Dashboard updates," "AI recommendations update," "Reports update," "Spending limits update" are literal strings, not computed from anything that's about to change. Same category of problem as the trust checklist already fixed; needs the same treatment (compute or drop).
4. **Merge Money Flow Visualizer and Hero metric grid.** Both currently express the same Needs/Wants/Savings allocation — one now-redundant view should absorb the other.
5. **Goal-first plan entry point** (flagged — larger effort, stretch item after 1–4 land). Let a user start from "I want to save ₹X by Y" instead of only three percentage sliders.

## Phase 3 — Goals

1. **Goal icon + color picker at creation.** Confirmed the `goals` table has no icon/color/photo columns today — just `id, name, targetAmount, currentAmount, deadline, is_emergency_fund` (`001_initial.ts`, `012_goal_emergency_fund_flag.ts`). Needs a small migration (`icon`, `color` columns) plus a picker UI in `AddGoalSheet`. Replaces the uniform crosshair icon and position-based (unstable) accent color.
2. **Manual priority override ("pin" a goal).** Layers user choice on top of the existing algorithmic `rankGoalPriority` — a pinned goal takes the #1 Focus slot regardless of computed rank.
3. **Milestone markers on the progress bar** (25/50/75%). Visual only, using the existing `computeProgress` — ties into the milestone insight that already fires at 50/75% in `insightsEngine.ts` but currently has no on-card visual counterpart.
4. **Surface `priorityReason` on the goal cards.** Confirmed `priorityReason` is computed by `rankGoalPriority` but only consumed by `GoalsHeroDashboard`'s coach copy for the #1 goal — never rendered on `FocusGoalHeroCard` or `SecondaryGoalCard` directly, so users can't see why any goal (especially non-#1 ones) is ranked where it is.

## Phase 4 — Ecosystem

1. **Single safe-to-spend source of truth.** Once Phase 2.1 lands, audit every screen that shows a "safe to spend" or "money left" figure and make sure they all read the same computation rather than each computing their own variant.
2. **Cross-screen signal.** Surface a lightweight note on the Goals screen when Money Plan's budget health is poor this month (e.g. grade D, over pace) — the two screens currently never reference each other's state even though funding realism depends on both.

## Sequencing note

Phases are independent enough to ship one at a time with review in between, per the user's request to go through the backlog "one by one." Phase 1 is next up for a detailed implementation plan.
