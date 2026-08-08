# Home Screen Hero Redesign — Design

**Date:** 2026-08-09
**Surface:** `src/screens/user/UserDashboardScreen.tsx` (lite consumer home)
**Status:** Approved, pending implementation plan

---

## Problem

The home screen was rebuilt earlier in this session into a pulse header over three
swipeable rooms. Device screenshots and a research pass showed three structural
faults. None is a styling issue.

### 1. No single answer

`₹536` (safe-to-spend-today) rendered in three places at once: the pulse header,
the `safe-spending` insight card, and `MoneyPlanHero` on the Money Plan screen.
`₹11,790` rendered twice. A screen that repeats its own primary number has not
decided what it is for.

> Empower (formerly Personal Capital) built its dashboard on a single primary
> number with breakdowns one level deeper; 6-month retention exceeded 70% against
> a 35–40% industry average.

### 2. Navigation added where content was thin

The three-room switcher (Spending / Goals / Income) forces a choice before the
user sees anything. Two of the three rooms rendered as a single card above a
screen of empty canvas, because the income widgets each `return null` when they
have no data.

> Google Pay's 2022 home redesign cut visible options by 40% and increased
> transaction initiation by 22%. NN/g identifies visual clutter as the top driver
> of task failure in banking interfaces.

Progressive disclosure means summary first, detail on demand — not three doors
presented up front.

### 3. The best component is on the wrong screen

`src/components/budget/MoneyPlanHero.tsx` renders an animated Skia arc with a
gradient, a grade letter, and a spring draw-in. The home screen — the more
important surface — uses flat `react-native-svg`. `@shopify/react-native-skia` is
already a dependency and already used in five components.

---

## Design

### The hero: one object, three questions

Keep the dark enamel panel and the circle (an explicit user preference). Rebuild
the ring so it carries data instead of decorating.

| Zone | Question it answers | Content |
|---|---|---|
| Center | "Can I spend right now?" | `₹536` + "Safe to spend today" |
| Ring | "Am I on track?" | Spend fills clockwise; a tick marks the even-draw-down position for today; verdict in words |
| Spokes | "Where did it go?" | Existing category stations, unchanged |

The ring implements **budget pacing** (`actual ÷ expected cumulative spend`), a
real named finance metric. The ring reads `success` under pace, `danger` when
spending faster than plan. The user races the marker — that comparison, not the
raw total, is the engagement loop.

**This absorbs the duplication rather than hiding it.** `PulseHeader` is deleted:

- `₹536` → ring center
- streak chip → top row beside the greeting
- "₹11,790 left of ₹12,000" → already the fare strip at the panel foot

### Rendering: Skia for geometry, RN for text

Skia earns its place on three things SVG does poorly here: a **sweep-gradient
stroke** so the ring shifts hue as it fills, a **soft glow** beneath the arc so
the dark panel reads as lit, and a **UI-thread draw-in** at 60/120fps.

**Decision: the Skia `Canvas` draws geometry only.** All text — center number,
station labels, verdict — stays as React Native `Text` positioned absolutely over
the canvas. This avoids Skia font loading (`useFont` + the bundled Satoshi OTFs)
entirely, keeps text crisp, and keeps it reachable by TalkBack. The animated
Skia path pattern (`useDerivedValue` → `Path`) is already proven in
`MoneyPlanHero`.

### Below the hero: one scroll

The switcher is removed. Single vertical scroll:

1. **Goals strip** — all goals, compact. Tap → Goals screen.
2. **Insights** — real ones only. `safe-spending` and `no-income` stay filtered;
   the hero owns those figures.
3. **Income intelligence** — collapses from three cards to **one row** that opens
   the detail screen. It is reference data, not a daily decision.

### Sparse data

Below three categories the transit metaphor collapses into a lollipop. The
existing fallback holds: ring + center number + a ranked bar list.

### Motion

One authored moment, not scattered effects:

- On mount the ring draws `0 → current` on a spring while the center number
  counts up in sync.
- The pace marker fades in **after** the ring settles, so the eye lands on the
  verdict last.
- Station taps keep the existing burning-line animation.
- Reduce-motion renders the static end-state.

### Behavioral guardrails

- Streak stays capped in months past 30 days (loss-aversion research; Silverman &
  Barasch, *JCR* 2023).
- Over-plan copy states the fact — "₹420 over plan" — never shame.
- No fabricated numbers. The income-health rebuild (real Herfindahl diversity,
  real 90-day growth, unmeasurable factors dropped from the weighted average)
  stands as shipped.

---

## Out of scope

Money Plan's hero, `ExpandingTabBar`, the Add-transaction sheet, chit-fund
surfaces. No new features.

---

## Risks

| Risk | Mitigation |
|---|---|
| Skia + Reanimated shared values are finicky on RN 0.80 | The pattern already ships in `MoneyPlanHero`; mirror it exactly |
| Ring geometry (trig, dash math) is unverifiable without a device | Explicit screenshot pass required before this is called done |
| Deleting `PulseHeader` could strand a consumer | It is only referenced by the dashboard; verify before removal |

---

## Research sources

- Fintech dashboard hierarchy and cognitive load — saasfactor.co fintech design
  best practices (cites NN/g, Columbia Business School, Empower, Google Pay, Mint)
- Streak design and loss aversion — Octalysis streak-design analysis; Silverman &
  Barasch, *Journal of Consumer Research* (2023)
- Budget pacing formula — Improvado / nine.am budget pacing guides
