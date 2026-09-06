# Behavior-Change Spec vs. Current App — Gap Analysis & Plan

**Date:** 2026-08-13
**Status:** Draft for review
**Scope:** Lite (consumer) app only. Chit-fund/pro module untouched.

The founding-team spec ("Behavior Change Machine") was checked against the codebase
(graphify graph @ commit `e6cc9d64`, DESIGN.md v4, and the approved
`2026-08-04-settings-theme-gamification-design.md`).

---

## 1. What already exists (mapped to the spec)

| Spec concept | Current implementation | Verdict |
|---|---|---|
| Safe to Spend + gauge | `PaceRing.tsx` hero + `budgetPacing.computePace()` — daily allowance pacing on the home hero | ✅ Built (different name, same psychology) |
| Home hero narrative / emotional microcopy | `services/homeNarrative.ts` — pure functions deriving headline + consequence from real ledger data; `HeroStats.tsx` story row | ✅ Built, stronger than spec (never invents a number) |
| Insight pills | `homeNarrative.buildInsightPills()` → transactions/bills/reports deep links | ✅ Built |
| Streaks (loss aversion) | `insightsEngine` under-budget streak, surfaced in `HeroStats` story row; **capped framing past 30 days** per DESIGN.md §7 research | ✅ Built — deliberately gentler than spec |
| Badges + celebration | `services/badges.ts` (5 ledger-earned badges, celebrated exactly once via AsyncStorage) + `BadgeCelebration.tsx` confetti | ✅ Built — deliberately minimal |
| Transactions ledger (awareness) | `TransactionsScreen` — date grouping, filters, search, swipeable cards, category resolution ladder, receipt OCR (`@react-native-ml-kit`) | ✅ Built |
| Goals / mental accounting | `GoalsScreen` + `goalStore` (SQLite) + `goalIntelligence.rankGoalPriority()` + surplus routing CTA + milestone celebrations | ✅ Built (no photos, no auto-save rules) |
| Income Health score | `IncomeHealthCard` + `IncomeDetailScreen` + `IncomeAnalyticsService` + trend chart | ✅ Built — matches spec Screen 4 closely |
| Bill reminders | `notificationService` + `billSchedule` (schedule/cancel/reschedule) | ✅ Built (bills only) |
| Dark mode | `specTheme.ts` light/dark + `useSpecTheme()` | ✅ Built |
| Weekly Money Story | `ReportsScreen` has the data; no weekly narrative card/push | 🟡 Partial |
| Onboarding smart defaults | `OnboardingScreen` is a 3-slide marketing carousel + PrivacyFirst + PIN. No income question, no pre-checked defaults, no first goal, no first win | 🟡 Carousel only |
| Age of Money | Nowhere in codebase | 🔴 Missing |
| Round-ups | Nowhere (and see conflict C3) | 🔴 Missing |
| Spending Shield (risk states) | Only chit-fund `riskScore.ts` (pro module) | 🔴 Missing (lite) |
| Challenges / Coins / leaderboard | Nowhere — **explicitly excluded** by approved design doc | 🔴 Deliberately absent |
| Payday push / evening summary / streak-at-risk notifications | Nowhere | 🔴 Missing |
| Accountability partner, referral, social proof | Nowhere | 🔴 Missing (needs backend; lite app has no accounts) |

---

## 1b. Conflict resolutions — DECIDED 2026-08-13

The user was asked directly and ruled:

- **C1 (colours): keep DESIGN.md v4.** The existing palette already carries
  `success`/`warning`/`danger` for every state the spec's psychology needs, so a
  rewrite to `#2563EB`/`#0F172A` would touch ~40 screens and buy no behaviour
  change. The spec's *structure and psychology* are adopted; its hexes are not.
- **C2 (gamification): the middle path.** Opt-in self-competitive challenges and
  an expanded badge ladder ship. Coins, virtual currency, and the percentile
  leaderboard do not — the 2026-08-04 research doc found ranking and currency
  actively damage trust in finance products, and the user's instruction was to
  pick "what is better / fitting in those rules".
- **Scope: every screen, one at a time.** Not a hero-only pass.

## 2. Conflicts between the spec and the repo's canon (decide before building)

**C1 — Color system.** Spec §6 mandates Trust Blue `#2563EB`, dark navy `#0F172A`
surfaces, 56px heroes. The repo's canon is **DESIGN.md v4**: admin-parity light-blue
canvas `#E6F0FA`, iOS-blue `#007AFF`, 5-color pastel rotation, `specTheme.ts`
(protected — not to be changed without explicit permission).
**Recommendation:** keep v4. Adopt the spec's *psychology and structure*, not its hexes.
The spec's semantic colors (green/amber/red states) already exist as v4 tone tokens.

**C2 — Gamification depth.** Spec wants Coins currency, badge collections,
365-day streaks, leaderboards, streak freezes. The approved 2026-08-04 design doc —
backed by product research (Mint/YNAB/Qapital/CRED) — **explicitly excludes**
points/XP, badge collections, and leaderboards, and DESIGN.md caps streak framing at
30 days because uncapped counters become fragile and broken ones suppress
re-engagement. `badges.ts` codifies "earned by money, celebrated once, lost in silence."
**Recommendation:** keep the research-backed line. Adopt from the spec only:
*challenges* (self-competitive, opt-in, e.g. No-Spend Weekend, Category Cut) and the
*anonymous percentile* social proof — no Coins, no leaderboard, no 365-day ladder.

**C3 — Moving money.** Spec's auto round-ups and payday auto-transfer assume the app
moves funds. CoinKeeper **never collects, holds, or transfers money** (core product
fact). Round-ups/auto-save can only be *virtual allocations*: ledger entries that
earmark money toward a goal, which the user actually moves in their own bank/UPI app.
**Recommendation:** build "round-up tracking" and "payday allocation" as virtual
rules that create goal contributions + a nudge to actually transfer — honest framing.

**C4 — The fake "first ₹500 welcome bonus."** Spec Screen 5 simulates a first save.
This violates the codebase's core honesty rule ("nothing in this file invents a
number") and the standing prefer-real-over-fabricated rule.
**Recommendation:** replace with real endowed progress — onboarding creates the
Emergency Fund goal + a default plan, and the first-win screen celebrates *the plan
existing* ("Your Safety Net is set up — your first allocation lands on payday"), not
a fictional balance.

---

## 3. Build plan (screen-by-screen, using existing architecture)

All new logic follows the established pattern: pure service (`src/services/`) +
zustand store subscribed to `financialEventBus`, SQLite via `getDb()`, one-time
celebrations gated by a `celebrations_seen`-style record, `specTheme` tokens,
Reanimated 3 (never LayoutAnimation), reduce-motion split per DESIGN.md §8.

### Phase A — Onboarding rebuild ✅ SHIPPED 2026-08-13
`screens/onboarding/FirstRunSetupScreen.tsx` + `services/firstRunPlan.ts`, wired
into `RootNavigator` between the privacy screen and PIN setup.

1. Income step — pre-filled ₹25,000 with one-tap presets (₹15k/25k/40k/60k).
2. Plan step — three pre-checked rows, each writing to infrastructure that already
   exists rather than to a new setting: `RecurringIncomeService.createTemplate`
   (salary), `budget_settings.savings_percent` (the 10% share, already read by
   Money Plan and `goalIntelligence`), and a real `goalStore` goal.
3. Confirmation step — honest endowed progress per C4.

**Corrections during implementation:**
- *No stored `monthly_income_paise` preference.* Nothing reads it — `snapshot.income`
  comes from real transactions. Income is an *input* to setup (it derives the goal
  target and the savings share) and becomes real via the salary template, not a
  phantom field. Same reasoning that dropped currency/income from `ProfileScreen`.
- *Safety Net target is derived, not hardcoded.* Two months of income rounded to
  ₹5,000 — lands on ₹50,000 at the default income, scales for everyone else.
- *Goal images deferred to Phase C* — `imageKey` isn't needed to make the flow work.
- *Round-ups deferred to Phase C* — they're a virtual-allocation feature (C3), not
  an onboarding toggle.

### Phase B — Home upgrades
1. **Age of Money** ✅ SHIPPED 2026-08-13 — `services/ageOfMoney.ts`, FIFO income-to-spending
   matching, rendered as the lead item of the hero story row.
   *Corrections:* three tone bands, not the spec's four — `Tone` is a three-colour
   vocabulary. Untraceable spending is skipped rather than aged at zero, and under
   three funded expenses the service returns null instead of a number.
2. **Weekly Money Story** ✅ SHIPPED 2026-08-13 — `services/weeklyStory.ts` +
   `components/insights/WeeklyStoryCard.tsx`, placed below the hero.
   *Corrections:* no comparison against a week with nothing recorded (absent data
   is not a zero week); sub-10% drift reads as "about the same"; the Friday push
   moves to Phase D with the rest of the notification work.
3. **Spending Shield (lite)** — green/amber/red service reading pace + late-night/repeat-merchant signals; one-line insight on home. No gambling-merchant detection in v1.

### Phase C — Goals deepening
1. Goal photos (preset image set, fill-with-progress treatment) — `imageKey` + opacity fill in goal cards.
2. Pace projection ✅ SHIPPED 2026-08-13 — **mostly already built.** `computeGoalHealth`
   already produced an `etaLabel` and `goalStatusCopy` already rendered it on goal
   cards; the gap was only phrasing. Changed `~6 months at current pace` →
   `February 2027 at this pace`: a date the user can picture, with the qualifier
   kept so an extrapolation never reads as a promise.
   *Found while changing it:* `simulateWhatIf` carried a second private copy of the
   same label construction, so the goal card and the AddFunds preview were free to
   phrase one projection two ways. Extracted to a single `paceEtaLabel`, with a test
   asserting the two agree.
3. Round-ups ✅ SHIPPED 2026-08-13 — `services/roundUp.ts`. Every logged expense
   rounds to the nearest ₹10 and earmarks the change to a goal via the existing
   `FinancialLedgerService.fundGoal`, which already writes a `transfer_to_goal`
   row atomically and emits the event bus. No migration needed; `fundGoal` gained
   an optional `note` so round-up rows read "Round-up from Swiggy" and stay
   distinguishable from deliberate contributions.
   *Design calls:* ₹10 step, not ₹100 (at ₹100 a ₹47 chai earmarks ₹53 — more
   than the purchase, which stops being invisible). Emergency fund always wins as
   the target, matching `rankGoalPriority`; there is no picker at save time
   because a round-up you have to route is a decision, and the mechanic depends
   on there being none. Applied *after* the transaction saves and outside its
   try block — the expense is what the user asked for and must survive a failed
   ₹3 write. Never fires on income.
   *Surfaces:* pre-checked row in first-run setup, Settings toggle carrying the
   spec's "why" copy ("about ₹3 a chai — roughly ₹1,000 a year").
4. Per-transaction awareness ✅ SHIPPED 2026-08-13 — `services/transactionInsight.ts`,
   rendered in `TransactionDetailSheet`. "Your 3rd Swiggy order this week — ₹1,240
   altogether." Falls back to category when there's no usable merchant, so cash
   spending still surfaces a pattern.
   *Design calls:* silent below three occurrences (a second time is coincidence,
   not a pattern), and silent on most rows by design — an insight on every row is
   wallpaper. Windows on the transaction's own week, not today's, so opening an
   old transaction describes the week it happened in. A test asserts the copy
   never contains a verdict ("too much", "should", "careful") — it reports
   arithmetic only.
5. Auto-allocation rules (payday %, weekly fixed) — still to build.

### Phase D — Notification engine expansion
Extend `notificationService` beyond bills: payday allocation reminder, evening summary (tone rules: never shame), streak-at-risk (respecting the 30-day cap philosophy — gentle, one action per notification), weekly story. All behind per-type toggles in Settings.

### Phase E — Challenges (the one gamification addition, per C2)
`ChallengeEngine` service + store: No-Spend Weekend, Category Cut, 52-Week (opt-in). Self-competitive only; completion = one-time celebration + badge added to the existing 5-badge ladder. No Coins, no leaderboard.

### Deferred / out of scope
- Accountability partner, referral, live social proof — require accounts/backend the lite app deliberately doesn't have.
- Real UPI/bank integration — product boundary (C3).
- Behavioral auth, fraud AI — future tier.

### Sequencing
A → B1 → B2 → C → D → B3 → E. Each phase lands with unit tests
(`__tests__/services/...` pattern) and a device animation check before ship
(DESIGN.md §10 rule).
