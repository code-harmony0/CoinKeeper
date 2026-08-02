# Money Plan Screen Redesign — Design

## Goal

Redesign `BudgetScreen.tsx` ("Money Plan") from first principles into an intelligent
financial planner, following the pattern already validated by `CategoryIntelligenceShell`:
one intelligence hook computing everything from real data, dumb presentational
subcomponents, no fake/hardcoded numbers anywhere.

## Scope decisions

- **Real data only.** No Net Worth / Investment Growth projections — this app has no
  investment-tracking data model and adding one is out of scope. Replaced with
  projections we *can* compute for real: Safe-to-Spend forecast, Savings forecast,
  Emergency Fund timeline.
- **New `budget_bucket` column on `categories`**, user-editable, so bucket totals and
  "Top Spending" per bucket are real instead of guessed.

## Architecture

```
useMoneyPlanIntelligence()                  — hook: all computed state
  ├─ src/services/moneyPlanIntelligence.ts  — pure calc functions (testable, no React)
  └─ src/store/budgetStore.ts               — extended: bucket totals, category rollups

MoneyPlanShell.tsx (was BudgetScreen.tsx)
  ├─ MoneyPlanHero.tsx           — Safe-to-Spend, health ring, one AI insight, income onboarding
  ├─ MoneyFlowVisualizer.tsx     — rewritten: Income→Needs→Wants→Savings vertical flow, animated
  ├─ CategoryIntelligenceCard.tsx (extends ExpandableCategoryCard) — real top spending, trend, prediction
  ├─ LifestyleProfileCard.tsx    — outcome-based preset comparison (real ₹, not %)
  ├─ MoneyPlanProjection.tsx     — 3/6/12mo Safe-to-Spend + Savings + Emergency Fund forecast
  ├─ MoneyPlanSaveBar.tsx        — sticky footer, diff summary before Apply
  └─ AI insight cards, reusing insightsEngine patterns
```

## Data model change

New migration: `categories.budget_bucket TEXT CHECK(budget_bucket IN ('needs','wants','savings')) DEFAULT NULL`.

Seed pass assigns defaults for existing categories by name:
- Rent, Groceries, Utilities, Insurance, EMI → `needs`
- Dining, Entertainment, Shopping, Travel → `wants`
- Investments, Goals → `savings`
- Unmatched → `wants`, flagged for the user to reclassify

Reclassification happens via a 3-way segmented control added to the existing
`AddCategorySheet` edit mode — no new screen.

## Financial Health / "Money Plan Score"

Composite 0–100, computed from real state:
- Income entered (baseline — 0/no score if missing, show onboarding CTA instead)
- Needs % within 50–60 recommended range
- Wants % within 20–30 range
- Savings % ≥ 20
- Total allocation = 100% (balanced)
- Emergency Fund goal (if one exists) is progressing (current > 0)

`score = (criteria met / criteria applicable) × 100`. Unmet criteria become the AI
insight list, ranked by rupee impact where computable (reusing the existing
"cut Wants by 5% → save ₹X/yr" math).

## Money Flow, sliders, category cards

- Money Flow becomes a real top-to-bottom flow (Income → Needs → Wants → Savings →
  Safe-to-Spend), each stage sized proportionally and driven by the same
  `needs/wants/savings` state — connected to the numbers below it, unlike today's
  decorative bar.
- Slider: keep the existing gesture-driven track (already real, not fake), add
  haptic ticks at 5% steps and a larger thumb. No new dependency.
- Category cards gain: real top-3 categories by spend within that bucket
  (`transactions JOIN categories WHERE budget_bucket = ?`), a trend arrow (this
  month vs last month spend in that bucket), and an under/over-budget prediction
  extrapolated from days-elapsed pace (same technique `insightsEngine` already
  uses for daily safe-spend).

## Lifestyle Profiles → outcome cards

Same four presets, but each card computes real rupee outcomes for the user's actual
income (Safe to Spend, Monthly Savings, Emergency Fund months-to-complete) instead
of raw percentages — pure function of existing `PRESETS` + `income`.

## Projection panel

Real, derived-only: Safe-to-Spend/mo, cumulative Savings, and Emergency Fund
completion date, projected at 3/6/12 months using the current savings rate —
extending the existing 12-month calc. No Net Worth/Investment Growth.

## Gamification

Score + "N recommendations remaining" (real, from the criteria above). No confetti
dependency — a meaningful-only celebration (subtle scale/opacity burst via
Reanimated, already a dependency) fires when the score crosses into "balanced" or
improves by ≥10 points on save, not on every interaction.

## Testing

Pure calc functions in `moneyPlanIntelligence.ts` get unit tests (bucket totals,
score formula, projection math, preset outcome math) — same split as
`useCategoryIntelligence` had. Screen-level test updated like `CategoriesScreen.test`
was.
