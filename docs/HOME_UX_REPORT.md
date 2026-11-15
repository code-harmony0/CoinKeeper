# CoinKeeper Home: UX report (v2, after independent critique)

## 1. Purpose
CoinKeeper is a personal expense tracker for everyday people in India (rupees, on-device, SMS auto-extraction). It never holds, moves or collects money; it tracks and confirms. Success is the user trusting the numbers enough to keep opening it. Product principle: trust comes from visible math and clear states, not reassurance.

## 2. Home's job (the 3-second test)
In order: (1) Can I spend today, and how much? (2) Is anything urgent? (3) Am I on track this month? Everything else is secondary.

## 3. Users
Non-expert, often first-time, glancing one-handed mid-day. Reads plain words, not finance terms. Must understand the screen without a tutorial.

## 4. Findings (v1, then corrected by the critique)
| # | Finding | Severity | Status |
|---|---|---|---|
| F1 | Streak card sat above the chart and took ~30% of the first screen | P1 | Fixed: compact strip, full card moved to Rewards |
| F2 | No visible math behind "safe to spend"; jargon ("under pace") | P0 | Fixed: line under the number; plain words |
| F3 | Two "+" buttons with different meanings | P1 | Fixed: header "+" removed; "Ask AI" labelled |
| F5 | Same facts repeated (spent today, due bill) | P2 | Reduced |
| F6 | Section order ignored urgency | P1 | Fixed: Upcoming first |
| F7 | "Income health WEAK" alarmed without a reason | P2 | Fixed: "Income steadiness", LOW + "35 out of 100" |
| F8 | Up to 8 looping animations at once | P2 | Reduced: medal shine plays once, today chip is still |
| F9 | First run showed a meaningless ₹0 | P1 | Fixed: first-run state with an "Add income" button |
| C1 | Two different figures for one idea (₹44,000 under pace vs ₹66,394 under plan) | P1 | Fixed: tag says "less spent than planned so far"; one month-end outlook "after bills" |
| C2 | The alert named only today's rent, not the overdue bill | P1 | Fixed: "1 overdue · 1 due today", tappable |
| C3 | Streak card and badge card showed different "next" goals | P1 | Fixed: one shared next goal |
| C4 | Yellow meant everything (hero, overdue, today, weak, earned) | P1 | Fixed: coral = needs action; yellow = hero and rewards only |
| C5 | Safe-to-spend ignores unpaid bills | P0 | OPEN: needs a decision (see section 6) |

## 5. What changed
Hero: label, number (rolls in), one math line ("₹88,000 left this month ÷ 15 days · ₹0 spent today"), one alert pill (coral outline) or a calm status pill, a compact streak strip, a legend, the chart with a plain-words tag, a month-end outlook. Then: Upcoming, Goals, Rewards (full flame card + badge shelf), This month, Insights (only when new), Income steadiness, Where it went, Chits. First run: the hero swaps the number for one sentence and an "Add income" button.

## 6. Open decision: the safe-to-spend formula (not changed: out of UI scope)
`FinancialIntelligenceEngine` computes safe-to-spend today as (plan − spent on needs and wants) ÷ days left. It does not subtract bills still unpaid this cycle. With ₹17,840 of bills outstanding (₹14,000 rent due today, ₹3,840 overdue) the figure overstates what is safe. The screen now shows the exact arithmetic so nothing is hidden, but the number itself should probably subtract unpaid bills. It is a one-line change in the engine, but it moves figures across the app, so it needs a product decision and a test on real data.

## 7. Design-system additions (also in DESIGN.md)
- Shared `Bezel` (nested container) and `IconTile` (black rounded icon square).
- Tokens: `brand.alert` (the one warning colour) and `onInk` (text and fills on the black hero).
- Rules: status colour (coral = action, yellow = hero and rewards), one next goal everywhere, one source for money figures, plain-words copy, first-screen budget (one answer, one alert, one chart, one streak line), motion budget (hero glow and the lit flame are the only ambient loops), zero-data rule (zero is shown as a start, not an error).

## 8. Success measures
New user names the amount they can spend and whether a bill needs attention within 3 seconds. One add button. First screen contains one answer, one alert, one chart.

## 9. Inspiration
Copilot (flat sections, legends), Mercury (hero number plus delta), Wise and Robinhood (one accent, huge number), Duolingo and Falou (streak as an object, week chips), Audible (badge shelf).
