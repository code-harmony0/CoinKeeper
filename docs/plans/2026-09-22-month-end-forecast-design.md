# Month-end forecast — design

**Goal:** Home's hero currently only answers "how am I doing today/this month so far." Every 2026 personal-finance app comparison names forward-looking projection as the top differentiator CoinKeeper lacks. Add one line: where the month is headed, not just where it stands.

**Constraint:** CoinKeeper cannot see a real bank balance (15 of 1,204 SMS ever quote one). The forecast is framed honestly as plan-relative, not a balance prediction.

## Calculation

`src/services/monthEndForecast.ts`, pure function:

```
projectedSpendPaise = spentSoFarThisMonth
                     + (spentSoFarThisMonth / daysElapsed) * daysRemaining
                     + unpaidBillsPaise   // from billsSummary(bills, now).unpaidPaise
```

- Requires `daysElapsed >= 3` (matches `RECURRING_MIN_TIMES` convention elsewhere) — else `null`.
- Requires `planPaise > 0` — else `null` (mirrors `computePace`).
- `unpaidBillsPaise` reuses tonight's cadence-aware `billsSummary`, so a half-yearly bill only counts when due this cycle.
- Excludes `awaitingReturn`/`settlementOf` transactions, same as the rest of the app.
- Returns `{ projectedSpendPaise, planPaise, diffPaise, status: 'under' | 'over', daysRemaining }`.

## UI

New band inside `HeroStats.tsx` (not a new component file — its own doc says its bands are one composition). Sits after the plan bar, before the category breakdown. One line, `planTone`-colored to never contradict the plan bar above it:

- Under: *"At this pace, you'll finish ₹4,200 under plan."*
- Over: *"At this pace, you'll finish ₹2,100 over plan."*

Renders nothing when the function returns `null` (no plan, or < 3 days elapsed).

## Testing

`__tests__/services/monthEndForecast.test.ts`: 3-day threshold, no-plan null case, under/over split, and a mixed case (spend-pace + one unpaid bill) proving no double-count.
