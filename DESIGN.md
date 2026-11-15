# CoinKeeper — Design System (v5)

> **v5 (current) — read §11 first.** §11 overrides every conflicting rule below: neutral Material-3-style surfaces replace the light-blue canvas and the pastel-everywhere rotation for the lite app. Sections 1–10 are being migrated; where they disagree with §11, §11 wins.

**This supersedes v2 and v3 in full.** The pastel-lavender/mint/peach off-white-canvas system (v2), and its "primary accent is navy, not purple" rule, are **retired** — including every anti-slop rule that assumed lavender was a passive surface tint. The canonical system is now: **exactly mirror the admin panel's pre-existing design system on the user side too.**

> **Historical note (why it changed):** the user explicitly decided that the user side should have design parity with the admin panel rather than its own bespoke pastel system — including sharing the admin panel's tab bar (`ExpandingTabBar`) instead of the user-only `UserCapsuleTabBar`. This was a deliberate product decision, not a correction of a design flaw in v2 — v2 was a fully worked system that simply lost out to "match admin exactly."

Nothing here is optional per-screen — a screen that deviates from this file is a bug, not a variant.

---

## 1. Design DNA

The admin panel's system, now shared by both sides of the app:

- **Light-blue canvas** (`#E6F0FA`) — not off-white, not neutral gray. This is the one background the whole app sits on.
- **White cards** on that canvas, told apart by elevation (shadow), not by tint.
- **iOS-blue primary accent** (`#007AFF`) — buttons, active segments, links, the FAB.
- **A 5-color pastel accent rotation** (`lavender`/`pink`/`mint`/`peach`/`sky`) used deliberately and everywhere an icon-square, tab, or "bucket" needs a distinguishing fill — this is not a "one accent pops per screen" system; the rotation is the point.
- **One shared tab bar** (`ExpandingTabBar`) — glass-blur pill, icon-only until active, spring-expand to reveal a label, each tab carrying its own accent + vibrant icon fill, optional center FAB. Used by admin and user alike.

### Anti-slop rules (checked on every screen before shipping)

- Every screen's canvas is the `background` token (`#E6F0FA` light / `#0F1419` dark) — never off-white, never a bespoke off-canvas hex.
- The accent rotation is exactly 5 colors (lavender, pink, mint, peach, sky) cycling in that order by index — don't invent a 6th accent or reorder the rotation per-screen.
- `primaryAccent` (`#007AFF`) is the only color for primary CTAs, active segment fills, and FAB backgrounds — don't substitute a rotation color for a primary action.
- No decorative icon unless it replaces a word, and every icon lives in a container (see §6) — never a bare icon floating in whitespace.
- No two cards on the same screen with identical visual weight — establish which one wins.
- No flat single-tone screen with only `background` and `card` and nothing else where the content warrants more structure — use `surfaceSunken` for segmented-control tracks and grouped-list backgrounds.
- Depth comes from **elevation (`cardShadow`/`iconShadow`) + the accent rotation**, not from stacking heavier custom shadows. One shadow strength exists per surface tier (§5); if a card needs to feel more important, use a bigger radius footprint or an accent fill — never a bigger shadow.
- There is exactly **one** tab bar component (`ExpandingTabBar`, see §7) for the whole app — never build or resurrect a side-specific tab bar.

---

## 2. Color System

Every screen composes from three surface tiers:

| Tier        | Token                                                          | Role                                                                                                                           |
| ----------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 0 — Canvas  | `background`                                                   | the screen itself, light blue, always visible at the edges                                                                     |
| 1 — Section | `surfaceSunken`                                                | a recessed grouping field between canvas and card — segmented-control tracks, grouped-list backgrounds                         |
| 2 — Card    | `card` (or an accent-rotation tint for a "bucket"/tab context) | the primary content surface — white by default, always paired with `cardShadow` when it needs to read as elevated above canvas |

### Full token table — Light (`specLight`, `src/theme/specTheme.ts`)

| Token                                       | Value                 | Use                                                                                                                  |
| ------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `background`                                | `#E6F0FA`             | tier 0 canvas — light blue                                                                                           |
| `surfaceSunken`                             | `#F4F6F8`             | tier 1 — segmented track, sunken list group bg                                                                       |
| `card`                                      | `#FFFFFF`             | tier 2 — neutral card                                                                                                |
| `surfaceElevated`                           | `#FFFFFF`             | sheets/modals (always + `cardShadow`)                                                                                |
| `primaryAccent`                             | `#007AFF`             | primary CTA / FAB / active segment — iOS blue                                                                        |
| `success`                                   | `#34C759`             |                                                                                                                      |
| `danger`                                    | `#FF3B30`             |                                                                                                                      |
| `warning`                                   | `#FF9500`             | the state between fine and over — "approaching the limit", "faster than plan". Never substitute `peachDeep` here: that is an accent-rotation ink, not a status colour |
| `textPrimary`                               | `#1A1A1A`             | headlines, hero numbers                                                                                              |
| `textSecondary`                             | `#6B7280`             | labels, captions, muted body                                                                                         |
| `sectionLabel`                              | `#4B5563`             | settings section eyebrows on the canvas — `textSecondary` fails 4.5:1 on `#E6F0FA` (≈4.0:1), this clears it (≈6.6:1) |
| `segmentActiveBg` / `segmentActiveText`     | `#007AFF` / `#FFFFFF` |                                                                                                                      |
| `segmentInactiveBg` / `segmentInactiveText` | `#F4F6F8` / `#6B7280` |                                                                                                                      |
| `incomeTint`                                | `#98E4C1`             | = `mint`                                                                                                             |
| `expenseTint`                               | `#FFD4B8`             | = `peach`                                                                                                            |
| `chipBg`                                    | `#F4F6F8`             | neutral icon-circle / pill background                                                                                |
| `inputBg`                                   | `#FFFFFF`             | text input fill                                                                                                      |
| `border`                                    | `#E5E7EB`             | hairline — used sparingly, see §5                                                                                    |
| `lavender` / `lavenderDeep`                 | `#D8E2FA` / `#1565C0` | accent rotation #1 (fill / deep-text-on-tint)                                                                        |
| `mint` / `mintDeep`                         | `#98E4C1` / `#2E7D32` | accent rotation #3                                                                                                   |
| `peach` / `peachDeep`                       | `#FFD4B8` / `#E65100` | accent rotation #4                                                                                                   |
| `pink` / `pinkDeep`                         | `#E2B6CF` / `#AD1457` | accent rotation #2                                                                                                   |
| `sky` / `skyDeep`                           | `#B8E6F5` / `#00838F` | accent rotation #5                                                                                                   |

The rotation order is **lavender → pink → mint → peach → sky** (indices 0–4), matching `useTheme()`'s `accent1`–`accent5` and `ExpandingTabBar`'s `COLORS.accents` array exactly — this order is load-bearing, don't reshuffle it per screen.

### Dark (`specDark`)

| Token                                       | Value                   |
| ------------------------------------------- | ----------------------- |
| `background`                                | `#0F1419`               |
| `surfaceSunken`                             | `#252D38`               |
| `card`                                      | `#1E2530`               |
| `surfaceElevated`                           | `#1E2530`               |
| `primaryAccent`                             | `#4DA2FF`               |
| `success` / `danger`                        | `#4CAF50` / `#FF6B6B`   |
| `warning`                                   | `#FFA726`               |
| `textPrimary`                               | `#F5F7FA`               |
| `textSecondary`                             | `#A0AEC0`               |
| `sectionLabel`                              | `#A0AEC0`               |
| `segmentActiveBg` / `segmentActiveText`     | `#4DA2FF` / `#0F1419`   |
| `segmentInactiveBg` / `segmentInactiveText` | `#252D38` / `#A0AEC0`   |
| `incomeTint`                                | `rgba(76,175,80,0.16)`  |
| `expenseTint`                               | `rgba(255,167,38,0.16)` |
| `chipBg`                                    | `#252D38`               |
| `inputBg`                                   | `#252D38`               |
| `border`                                    | `#2D3748`               |
| `lavender` / `lavenderDeep`                 | `#2C3E50` / `#4DA2FF`   |
| `mint` / `mintDeep`                         | `#1E4D3D` / `#4CAF50`   |
| `peach` / `peachDeep`                       | `#4A3428` / `#FFA726`   |
| `pink` / `pinkDeep`                         | `#4A1942` / `#E2B6CF`   |
| `sky` / `skyDeep`                           | `#1E3A4A` / `#B8E6F5`   |

Dark mode has no shadow discipline change from light — `cardShadow`/`iconShadow` still apply, just against a dark canvas.

Both palettes live in `src/theme/specTheme.ts` (`specLight`/`specDark`) and are written to mirror `src/hooks/useTheme.tsx`'s `lightColors`/`darkColors` (`ThemeColors` type) — the admin panel's original source of truth. If the two ever drift, `useTheme.tsx` wins and `specTheme.ts` must be corrected to match, not the other way around.

---

## 3. Typography

Unchanged — the Satoshi system stands as-is.

**Satoshi** (Indian Type Foundry, Fontshare) is bundled — the real brand font. It ships **Regular / Medium / Bold / Black** — there is **no SemiBold (600)**. The app's four historical weight _strings_ remap onto Satoshi's four real cuts, chosen to preserve four distinct tiers and give headlines the heavy, confident weight the reference uses:

| App font string (in code) | → Satoshi file | Role                                                                   |
| ------------------------- | -------------- | ---------------------------------------------------------------------- |
| `Satoshi-Regular`         | Regular (400)  | body / secondary text                                                  |
| `Satoshi-Medium`          | Medium (500)   | labels                                                                 |
| `Satoshi-Bold`            | Bold (700)     | section titles, card values, buttons _(was the app's "SemiBold" tier)_ |
| `Satoshi-Black`           | Black (900)    | page titles, hero currency numbers _(was the app's "Bold" tier)_       |

The prior `Inter-*` families (and the never-shipped `PlusJakartaSans-*` before them) are fully retired. **Android-only project** — fonts live in `android/app/src/main/assets/fonts/` and bundle at build time; no iOS font setup is maintained.

| Style     | Size  | Font string                 | Tracking       | Use                          |
| --------- | ----- | --------------------------- | -------------- | ---------------------------- |
| Display   | 40    | `Satoshi-Black`             | -0.5           | hero currency numbers        |
| H1        | 28    | `Satoshi-Black`             | -0.3           | screen title                 |
| H2        | 20    | `Satoshi-Bold`              | 0              | section title                |
| Body      | 15    | `Satoshi-Medium`            | 0              | list titles, card labels     |
| BodyMuted | 14    | `Satoshi-Regular`           | 0              | secondary line under a title |
| Caption   | 12–13 | `Satoshi-Regular`/`-Medium` | 0.2            | timestamps, small captions   |
| Overline  | 11    | `Satoshi-Bold`              | 0.8, uppercase | section eyebrows             |

Hero numbers always render in `textPrimary`, never in an accent color.

---

## 4. Spacing — 8pt Grid

Base unit is **8px**. Half-steps of 4px are permitted only for icon-internal and text-line micro-adjustments (never for section rhythm).

| Token      | Value | Use                                                           |
| ---------- | ----- | ------------------------------------------------------------- |
| `space.xs` | 8     | icon-to-label gap, chip internal padding                      |
| `space.sm` | 16    | card internal padding (default), row gaps                     |
| `space.md` | 24    | screen horizontal padding, card internal padding (hero cards) |
| `space.lg` | 32    | section-to-section vertical rhythm                            |
| `space.xl` | 48    | screen top/bottom breathing room                              |

Rules:

- Screen horizontal padding: **24** (`space.md`), always.
- Section-to-section gap: **32** (`space.lg`).
- A section header to its content: **16** (`space.sm`).
- Card-to-card gap in a vertical stack: **16** (`space.sm`).
- Never place two elements closer than **8px**; never leave a gap that isn't a multiple of 8 except the 4px icon/text micro-adjustments above.

---

## 5. Radius, Shadow & Borders

Values below are `specTheme.ts`'s current constants (rewritten this pass) — they replace v2/v3's numbers.

- `cardRadius`: **24**.
- `chipRadius` (pill): **999** (full stadium).
- `inputRadius`: **16**.
- `iconContainerRadius`: **999** (icon containers are circles by default).
- `fabSize`: **62**.

**`cardShadow`** — the one elevation strength for cards/sheets/modals:

```
shadowColor: '#000000'
shadowOffset: { width: 0, height: 8 }
shadowOpacity: 0.08
shadowRadius: 20
elevation: 4
```

**`iconShadow`** — subtle elevation for icon-in-circle containers:

```
shadowColor: '#000000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.06
shadowRadius: 6
elevation: 1
```

**Borders** — minimal, last resort. Use elevation + tonal shift (`surfaceSunken` vs `card`) to separate content first. `border` (`#E5E7EB` light / `#2D3748` dark) is reserved for hairline row separators inside a single card's list (e.g. Settings rows) and similar sparse uses — never a border around a whole card that already has `cardShadow`.

---

## 6. Icon Style

- Line icons only (`lucide-react-native` on non-tab-bar contexts, stroke width ~2), never filled/duotone, no emoji.
- **Every icon lives inside a container** — circle by default (`chipBg` or an accent-rotation tint), 40–44px, with `iconShadow` from §5. A bare icon with no container is a bug.
- Icon color: `textSecondary` on neutral `chipBg`, or the accent's `*Deep` token on an accent-tinted container.
- Exception: the tab bar's own icons are hand-drawn inline SVGs with their own dark-stroke + accent-vibrant-fill convention — see §7, not this section's container rule.

---

## 7. Component Rules

### Tab Bar — `ExpandingTabBar` (`src/components/shared/ExpandingTabBar.tsx`)

The **one** tab bar for both admin and user sides. `UserCapsuleTabBar` and its dedicated `userFintechTheme` are retired — no screen should import either again.

Behavior:

- **Glass-blur pill** — a floating rounded bar (`BlurView`, `blurAmount 80`, `borderRadius = height/2`), 94% of screen width, sitting above the safe-area inset, with its own drop shadow (not `cardShadow` — the bar has a bespoke heavier shadow because it floats over content, not on canvas).
- **Icon-only until active** — each tab starts as a small circular icon-only pill (`ICON_SIZE` wide) and **spring-expands** (`withSpring`, damping 15 / stiffness 120) to a wider pill (`EXPANDED_WIDTH`) that reveals its label with a fade + slide-in when it becomes the active tab. Inactive tabs collapse back to icon-only.
- **Per-tab accent + vibrant icon fill** — each tab index gets a background from the 5-color accent rotation (`COLORS.accents`, same order as §2's rotation) when active, plus a separate, more saturated **vibrant fill** color (`COLORS.vibrantFills`) applied to the icon's SVG fill so the icon itself pops against its own pastel pill — two different colors doing two different jobs (pill bg vs icon fill), not one color reused.
- **Optional center FAB** — when `hasFab` is set, a floating circular FAB (`fabSize`/`FAB_SIZE = 62`) sits centered on the bar, overflowing above it, filled with the primary accent, with a continuous subtle **pulse animation** (scale 1 → 1.05 → 1 on a 2s loop) to draw attention, plus its own heavier drop shadow.
- **Auto-hide on scroll** — the whole bar (and FAB) translates down and fades out on scroll-down past a threshold, and springs back on scroll-up, via `TabBarScrollContext`.
- Haptics fire on every tab press (`impactLight`) and FAB press (`impactMedium`).

Any new tab consumer (admin or user) configures this component with its own `tabs: TabConfig[]` (name/label/icon) — it does not fork the component or restyle it per side.

### Money Map — home-screen hero (`src/components/insights/MoneyMap.tsx`)

The home screen's month-at-a-glance panel — the **one sanctioned exception** to the white-card rule: a **midnight enamel panel** (`specDark` tokens) sitting on the light-blue canvas. Rationale: the home needs a single dark hero surface the whole screen reads against; the light canvas + white cards stack elsewhere already resolves to "white on light blue", so the hero inverts to dark to win the screen (see §1's "establish which one wins"). Only the home hero uses this — a second dark surface elsewhere is a bug.

Behavior:

- **Transit metaphor** — income is the central hub (filled `specDark.textPrimary`, INCOME label + compact value), the top-5 expense categories are stations on **45°/90° spokes only**, spent-vs-plan is a **fare strip** at the panel foot (fill `success`, flips to `danger` when over).
- **Two acts, one panel, one rule between them.** Act one is the hero — the gauge, the story row, the status line, the KPI pills, the plan bar (see PaceRing and Hero narrative below). Act two is the transit map. A 1px `border` rule separates them; without it the panel reads as one undifferentiated column. The hero says how the month is going, the map says where the money went.
- **The fare strip is gone**, replaced by the hero's `PlanBar` — same figures, thicker bar, and it expands into the category breakdown instead of stating a total the map already draws.
- **Station labels sit on the far side of the station from the hub** (`labelDy` per station) — labels placed hub-side get a 6.5px route stroke drawn straight through the text.
- **Below three categories the map degrades to a ranked bar list** — one or two spokes read as a lollipop under a screen of dead panel, so the same data pays its way as rows with proportional bars.
- **Line inks are the accent rotation** — `specLight.lavender/pink/mint/peach/sky` in that fixed order (§2), glowing on the dark ground. Rotation order is load-bearing here too.
- **One line burns** — tapping a station makes its route the burning line (opacity animates 0.28 → 1 via `AnimatedPath`) and shows that category's last 3 transactions below the map.
- **Geometry** — viewBox 340×306, hub at center (170,150, r=32), ring r=100, `mapW = min(screenW−80, 340)`. E-station labels shift left 36px to clear the viewBox edge.
- **Empty state** — dashed ring + solid hub only, "Your money map fills in as you add expenses".

Money Map reads its month plan from `FinancialIntelligenceEngine.getCurrentSnapshot()` and its aggregates from `useMonthLedger` (passed in as `ledger`, never re-derived here). It carries the `PaceRing` and the hero narrative as the home's first act.

### PaceRing — the home hero (`src/components/insights/PaceRing.tsx`)

**One open dial, not three concentric rings.** The v4 triple ring (inner = today, middle = month pace, outer = plan ÷ income) is **retired**. It failed on device for a reason a mock-up hides: on an ordinary morning two of the three arcs were empty tracks and the only one carrying ink was the least important — three near-identical grey circles reading as moiré, with the ring the user needed invisible inside them. Two of the three also restated what the panel says lower down in words (`PlanBar`, the `MONTHLY PLAN` KPI), and the whole thing cost a three-row legend to explain. A chart that needs a key to survive a glance is not a glance.

The dial is a 264° arc, open 96° at the foot, drawn at `18 × SCALE` stroke with round caps.

| Element | Says | Fill |
| --- | --- | --- |
| Arc | "How much can I spend for the rest of today?" | what is **left** of today's allowance — the same figure the centre prints |
| Hour scale | "How much of the day is left to spend it in?" | 24 ticks from midnight at the top, lit to the current hour, with a brighter tick at now |
| Centre | the answer, in `Satoshi-Black`, counting up from zero | `safeToSpendToday`, labelled "Safe to spend today" |
| Foot | the other half of that sentence | "₹X spent today", inside the arc's gap |

- **The arc and the number are the same fact.** The dial draws what is left, and the centre prints what is left, so the mark and the figure can never disagree — and a full dial at 8am is an honest picture rather than an empty circle that reads as a broken widget. A ₹0 allowance is an **empty** dial: `todayLeft` is forced to 0 when `safeTodayPaise === 0`, or a spent-out day draws a complete arc around a ₹0 hero.
- **No legend, because there is nothing to key.** One series, labelled in place. If a second series is ever added back here, it needs a key again — which is the argument for not adding one.
- **The scale is the day, not the plan.** The hour ticks are the comparison a daily allowance actually invites (how much of the day is gone against how much of the money is), and they give the mark structure at 0% spent, which an empty ring never has. They replaced the old floating pace tick, which read as a rendering artefact at the ring's edge. The scale clears the arc by 13px — at 9px the long ticks grazed it and read as scratches on the dial.
- **The month lives on `PlanBar`, not on an arc.** Spend ÷ plan, plus a marker at the even-draw-down position for today, plus the verdict word ("Under pace" / "On pace" / "Ahead of plan"). Two positions on a straight track is one comparison; two arcs is a comparison the eye has to unroll first. The marker is drawn **inside** the clipped track and is always named by the key beneath it — an unnamed tick is an artefact.
- **The plan's claim on income is a caption, not a ring.** "80% of income" sits under the `MONTHLY PLAN` KPI, beside the number it is a ratio of.
- **Colour ladder: `ringTones(todayUsed)`.** `success` below 60% of today's allowance spent, `warning` from 60%, `danger` only once it is gone. One function, one consumer, pinned by tests. `danger` stays reserved for actually being over — a gauge that reddens before anything is wrong teaches the reader to ignore red.
- **The centre glow is a gradient to transparent, never a blurred solid.** A blurred filled circle over a dark ground is a stain — the amber state rendered the centre olive-brown. A radial gradient falling to `00` alpha is what light actually does.
- **The glow is neutral white, and its *rhythm* carries the state — not its hue.** Tinting it put an amber wash behind the hero figure at the exact moment the arc around it also went amber, and the whole centre read warm and muddy. Calm breathes on a 3s cycle, past 60% of today's allowance on a 1.5s one.
- **The well stops inside the arc.** A `specDark.card` radial disc under the dial, ending at the arc's inner edge — the wider version was the muddy grey circle the triple ring floated on. The panel layers *up* for the hero rather than down; this is the one depth cue on a dark surface, since §5 forbids heavier shadows.
- **Skia draws geometry only; every string is a React Native `<Text>` layered over the `Canvas`.** This is deliberate and load-bearing: it avoids loading Satoshi into Skia via `useFont`, keeps type crisp at any density, and leaves the numbers reachable by TalkBack. Never render hero text inside the Skia canvas.
- **Pacing is `src/services/budgetPacing.ts`** (`computePace`), a pure unit-tested module — never re-derive pace inline in a component. `ratio > 1.05` is `fast`, `< 0.85` is `ahead`, between is `on`. Budget pacing (actual ÷ expected cumulative spend) is a real named finance metric; nothing here may imply a target the plan doesn't set.
- **Motion is one authored moment**: the dial fills at `HOME_SEQUENCE.ring` (300ms), the hero counts at 900ms, and one pass of light travels the arc after the panel has landed. The choreography has **one** ring slot — the old outer/middle/inner stagger belonged to a gauge that no longer exists.
- **The dial sizes off the screen** (`min(screenW − 112, 268)`) and the hero number steps down by string length — a fixed 54px would clip a five-figure amount inside the arc.
- **`replayToken` rewinds and redraws** on pull-to-refresh: the dial winds to empty, then fills again, so a refresh reads as the same gesture repeating rather than as a number jumping.
- **With no plan** (`planPaise === 0`) there is no dial at all — a compact "Add income to set a plan" prompt instead, never a ₹0 hero.


### Hero narrative — `HeroStats.tsx` + `services/homeNarrative.ts`

Under the dial, in descending order of how quickly the user can act: story row → status line → KPI pills → plan bar.

- **Every sentence is generated in `homeNarrative.ts`, a pure unit-tested module.** No component assembles hero copy from numbers inline. Nothing in that file invents a figure; where the data can't support a claim, the narrative says less rather than guessing.
- **The status line is priority-ordered, not concatenated**: over plan → today's allowance spent or 60% gone → nearest bill within 7 days → projection → reassurance. Exactly one shows. Reassurance is last because it is the only one that costs nothing to miss.
- **Projections are straight-line and never shown before day 2** — one lunch on the 1st extrapolates to a catastrophe.
- **The plan bar opens into its own breakdown.** The bar provokes "spent on what?", so the categories expand in place rather than sitting a screen away.
- **The plan bar carries the month's pace**, since the gauge no longer does: a marker at the even-draw-down position for today, clipped inside the track, with a key row beneath it ("Even pace by today") and the verdict on the right in the bar's own tone. The marker and the key ship together — a tick nobody can name is an artefact, which is exactly how the old ring's floating pace tick read.
- **The `MONTHLY PLAN` pill carries "N% of income"** — the retired outer ring's whole content, stated beside the number it is a ratio of.
- **Icons are drawn, never emoji.** The storytelling row uses `lucide-react-native` at the same stroke weight as the rest of the app; a 🔥 in place of `Flame` is a bug.

### Home structure — one scroll (`src/screens/user/UserDashboardScreen.tsx`)

A single vertical scroll: greeting + quick actions, then Money Map (hero), insight pill rail, goals strip, insights, income health card, income row, chits (pro only).

- **No room switcher.** A Spending/Goals/Income segmented control shipped here once and was removed: it forced a choice before the user saw anything, and two of three rooms rendered a single card above a screen of void. Evidence runs the other way — Google Pay's 2022 home cut visible options 40% and lifted transaction initiation 22%; Empower's single-primary-number dashboard with detail one level deeper held 70% six-month retention against a 35–40% industry average. Do not reintroduce sibling rooms on this screen.
- **Numbers appear once.** The ring owns safe-to-spend-today and budget-left, so the dashboard filters the engine's `safe-spending` and `no-income` insights out of the list. Any new surface that restates a hero figure is a bug. This rule caught a real one on device: the story row and the status line both rendered "On track to save ₹48,800", one directly above the other. The status line won — it is contextual and drops the projection when something more urgent outranks it — and `StoryRow` no longer takes a projection at all.
- **With no plan there is no gauge.** `planPaise === 0` renders a compact prompt, not a 288dp triple ring with nothing in it. Spending the largest object on the screen to say "no data" is the most expensive possible empty state.
- **Dev-only flags** (`APP_LOCK_ENABLED`, `SECURE_SCREEN_ENABLED`, both `!__DEV__`) turn off the PIN gate and `FLAG_SECURE` in debug builds. `FLAG_SECURE` in particular makes every `adb screencap` return solid black, which silently blocks all visual review — if a screenshot of a money screen comes back black, that is why, not a render bug.
- **Streak framing is capped, not escalating.** Past 30 days the label switches from days to months. Loss-aversion research on long streaks (Silverman & Barasch, JCR 2023; Octalysis streak-design analysis) finds that beyond ~30–60 days an escalating daily counter stops reading as an achievement and becomes something fragile the user fears destroying, and that broken streaks durably suppress re-engagement. Never ship an uncapped day counter here, and never dramatize breaking one. The streak now lives in the hero's story row rather than as a chip beside the greeting.
- **Badges are earned by money, celebrated once, and lost in silence.** Every rule in `services/badges.ts` reads the ledger — a streak of real under-budget days or real savings — never app opens. `takeUncelebrated` persists what has already been shown, so `BadgeCelebration` fires on the load after a threshold is crossed and never again. Losing a badge is silent: it stops showing, and nothing announces it. Dramatizing a loss would undo the streak-capping rule above through the back door.
- **Summary first, detail on demand.** `GoalsStrip` shows every goal compactly and opens Goals; `IncomeHealthCard` summarises income health and opens `IncomeDetail`. A component that returns `null` without data must never be the only thing in a region.
- **Empty states are real** — icon in a `chipBg` circle, title, one explanatory line, `primaryAccent` CTA.
- **One derivation of the month.** `useMonthLedger` makes a single pass over the transaction list and feeds the ring, the status line, the plan bar and the pills. Never re-sum the month inside a component — two summations are two chances to disagree about the same figure.

Quick actions (`+ Income`, `Ask AI`) are raised `card` pills with `iconShadow` in the top row beside a time-of-day greeting. There is no "Overview" screen title — the hero number is the screen's identity.

### Income Health — card (`components/income/IncomeHealthCard.tsx`) and detail (`screens/user/IncomeDetailScreen.tsx`)

- **The card shows position, the screen shows meaning.** Home gets the score, a charge bar against its own zones, three arc gauges, a six-month sparkline, and the single weakest pillar with one action. Definitions, tips, the interactive chart and the source donut live one tap deeper.
- **`useIncomeHealth` is the only read path.** Card and screen consume the same hook, so they cannot show different numbers for the same day. It re-reads on every `financialEventBus` event, which is how adding income updates the score without a manual refresh.
- **Band colours are fixed everywhere**: `danger` ≤30, `warning` ≤60, `success` above. A colour learned on the card means the same thing on the screen.
- **Three empty states, three distinct marks.** *Dashed outline* = no data yet ("Not yet"); *solid track + fill* = measured; *solid track + dot* = measured and genuinely zero. `NOT_ENOUGH_DATA` and a real 0 are different facts and must never render alike — rendering the first as 0 is a lie about the user's finances. The Goals ring uses the same dashed language for an untouched goal.
- **Dash a semicircle with a `Path` arc, never a dashed `Circle`.** The circle track relies on a `half circumference` dash to become a semicircle; adding `3 4` on top gives an odd-length array, which SVG duplicates into "3 on, 4 off, C on" — a couple of dashes then a long solid run. It shipped once looking solid, which is exactly the "broken component" reading the dashed state exists to prevent.
- **All pillar copy lives in `services/income/incomeHealthCopy.ts`.** One place decides what a score means and what to do about it. Every tip names a concrete action; "improve your stability" is not a tip.
- **The card hides itself with no cached score.** An empty health card implies the app knows something it doesn't.
- **The trend chart draws the average as a dotted rule and rings the extremes**, because the useful question about an irregular income is the spread, not any one month. It has no pinch-to-zoom: six points across the card width are already at their most readable.

### Other components

- **StatRing** — thick circular progress (SVG), track in `chipBg`, fill in the active accent's `*Deep` or `primaryAccent`. Center text is Display/H1 weight. One per screen maximum.
- **PastelCard / bucket card** — uses an accent-rotation tint (`lavender`/`pink`/`mint`/`peach`/`sky`) as a flat surface, no `cardShadow` on the tint itself (told apart by color, not elevation). Eyebrow → hero value (`textPrimary`, never accent) → supporting line → optional thin progress bar in the tint's `*Deep`.
- **Segmented control (`PillSegment`)** — active pill in `segmentActiveBg`/`segmentActiveText`, sliding on a `surfaceSunken` (tier-1) track, not a white track — the control itself must read as a recessed field, not another floating card.
- **Buttons** — primary = `primaryAccent` fill + `#FFFFFF` text, full pill radius. Secondary = `chipBg` fill + `textPrimary` text. No outline-only primary buttons.
- **Empty states** — flat-SVG illustrations recolored to the admin-mirrored palette.

---

## 8. Motion Rules

**All motion constants, springs, and the home choreography live in `src/theme/motion.ts`. Never hardcode a duration or a spring in a component.**

### The reduce-motion split — read this before adding any animation

Every animation in the app once carried `ReduceMotion.System`. That reads as conscientious and is a bug: when the OS reports reduce-motion, Reanimated **skips** the animation and jumps to the end value. Applied to everything, one OS flag removed all motion in the entire app — including the gauges and counters whose movement is the only thing communicating the number.

**This is confirmed, not theoretical.** React Native derives Android's `isReduceMotionEnabled()` from `Settings.Global.TRANSITION_ANIMATION_SCALE`. On the project's own emulator:

```
transition_animation_scale = 0
window_animation_scale     = 0
animator_duration_scale    = 0
```

Every animation in the app was therefore being skipped on the primary test device, which is exactly the "no animation at all" report that triggered this rewrite. Note what that setting actually means: someone turned animation scale off to make the device feel faster. "I turned off window transitions" and "motion makes me ill" are not the same request, and one blanket constant cannot serve both.

Check it with `adb shell settings get global transition_animation_scale` before ever concluding an animation is broken.

So there are exactly two classes, and every animation must pick one:

| Class | Constant | What it covers | Under reduce-motion |
| --- | --- | --- | --- |
| **Expressive** | `EXPRESSIVE` | scale, translate, rotation, parallax, looping pulses, shimmer, card entrances | suppressed entirely |
| **Informational** | `INFORMATIONAL` | an arc drawing to its value, a bar filling to its percentage, a figure counting to its total | **always plays**, shortened via `informationalDuration()` |

Informational motion *is* the content — suppressing it doesn't calm the screen, it deletes information. This is the split WCAG 2.3.3 already draws: it targets non-essential motion and exempts motion essential to conveying information. Pinned by `__tests__/theme/motion.test.ts`.

- **`LayoutAnimation` is dead here.** This app runs `newArchEnabled=true`, where it is a no-op — a "animated" expand built on it never animated at all. Use Reanimated `entering` / `exiting` / `layout`.
- **`CountUp` counts from zero and always settles.** It starts at 0 (a component named CountUp that seeds itself with its final value never animates) and carries a guaranteed `setTimeout` settle, so a stalled frame loop can never leave a money figure reading ₹0. The currency prefix is static — a ₹ that fades in with its digits reads as a string loading, not a number climbing.
- **Springs**: `SPRING.press` (mass 1 / stiffness 400 / damping 25) going down, `SPRING.release` with overshoot coming back up, `SPRING.settle` for a value landing, `SPRING.entrance` for a card arriving.
- **The home entrance is one sequence, declared as data** in `HOME_SEQUENCE` — outside-in through the rings, then the hero count, then top-to-bottom through the copy, finishing at 1500ms. A choreography spread across the six components it animates is one nobody can see or correct.
- Haptic feedback on all interactive presses (`react-native-haptic-feedback`), matching the tab bar's existing convention.

### Colour encoding — run the validator, don't eyeball it

- **A ranked list of categories gets ONE ink** (`barInk`), not a hue per row. Every row already carries its name and its amount; a third encoding of the same fact is decoration. This is also forced by measurement: checked all-pairs against the dark panel inside the dark-mode lightness band (OKLCH L 0.48–0.67), **no five-hue or even four-hue categorical palette clears the ΔE 15 normal-vision separation floor** — best five-slot result from a 220-sample search was 6.5 (deuteranopia) / 12.7 (normal). Equal-lightness hue wheels are worse: deuteranopia collapses red–green, so red and green at matched lightness become one colour.
- **The transit map keeps distinct route inks**, because there colour follows a stroke across a diagram away from its label. Even there it is the *third* channel behind fixed spoke position and a direct text label, and only one route is highlighted at a time.
- **A status colour never travels alone.** `good` / `warn` / `bad` always ship with an icon and a label — a bare coloured dot carries no meaning for a colour-blind reader or in forced-colours mode.
- **One colour story per surface.** The status line and the plan bar are driven by the same `tone` from `homeNarrative`, so the panel can never show an amber warning above a bright green remaining figure again.

---

## 9. Component Consistency Checklist

Before any component ships, confirm:

| Check      | Rule                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas     | screen background is the `background` token — never off-white, never a bespoke hex                                                                                         |
| Radius     | 24 for cards, 999 for pills/icon-circles, 16 for inputs — no ad-hoc values                                                                                                 |
| Shadow     | `cardShadow` or `iconShadow` as appropriate, or none on accent-tinted flat surfaces — never a custom heavier shadow (tab bar and FAB are the one sanctioned exception, §7) |
| Spacing    | every margin/padding is a multiple of 8 (4 only for icon/text micro-adjustment)                                                                                            |
| Icon       | inside a container, with `iconShadow` (except tab-bar icons, §6)                                                                                                           |
| Color      | every color used is a token from §2, no ad-hoc hex; accent rotation used in its fixed order                                                                                |
| Border     | present only where §5 permits it                                                                                                                                           |
| Typography | matches a row in §3's scale, no ad-hoc font sizes                                                                                                                          |
| Tab bar    | `ExpandingTabBar` only — no side-specific tab bar component                                                                                                                |

---

## 10. Rollout status (updated as of this pass)

**Done this pass:**

- ✅ `src/theme/specTheme.ts` fully rewritten to v3 — `specLight`/`specDark` now mirror `useTheme.tsx`'s `lightColors`/`darkColors` exactly (light-blue `#E6F0FA` canvas, white cards, `#007AFF` primary accent, 5-color accent rotation as `lavender/pink/mint/peach/sky` + `*Deep` pairs).
- ✅ `cardRadius`/`chipRadius`/`inputRadius`/`iconContainerRadius`/`fabSize` and `cardShadow`/`iconShadow` constants updated to the values in §5 above.
- ✅ Tab bar swapped to the shared `ExpandingTabBar` (`src/components/shared/ExpandingTabBar.tsx`) for both admin and user navigators.
- ✅ `UserCapsuleTabBar` and `userFintechTheme` retired — no longer the source of truth for the user side's tab bar or theme.
- ✅ This document (DESIGN.md) rewritten as v4 to describe the admin-mirrored system as canonical.
- ✅ `ExpandingTabBar` fixed — icon clipping (label now absolutely positioned so it takes zero layout space; only `width`/`opacity`/`translateX`/`scale` animate) and FAB centering (FAB pinned to screen-center, invisible ghost slots balance tab sides so the FAB is always centered regardless of tab count).
- ✅ **Money Map** home hero shipped (`src/components/insights/MoneyMap.tsx`, documented in §7) — transit diagram of the month's money, wired as the `UserDashboardScreen` hero with `FinancialIntelligenceEngine` month-plan data; dead chart-card styles removed from the dashboard.

**Done in the home + income-health pass:**

- ✅ `warning` (`#FF9500` / `#FFA726`) added to both palettes as a real status token — the third state between fine and over. Previously screens borrowed `peachDeep`, an accent-rotation ink.
- ✅ `PaceRing` rebuilt as a three-ring gauge (today / month / plan-vs-income) with a layered gauge well, a state-tinted glow that breathes only when calm, screen-derived sizing, and a `replayToken` rewind for pull-to-refresh.
- ✅ Hero narrative shipped — `services/homeNarrative.ts` (pure, unit-tested: priority-ordered status line, straight-line projection, bill roll-forward, insight pills) rendered by `components/insights/HeroStats.tsx` as story row → status line → KPI pills → expandable plan bar. The Money Map fare strip was removed in its favour.
- ✅ `services/badges.ts` + `components/anim/BadgeCelebration.tsx` — ledger-earned badges, celebrated once via an AsyncStorage record, lost in silence.
- ✅ `useMonthLedger` — one pass over the transaction list feeding every home surface; `MoneyMap` no longer re-derives the month.
- ✅ `InsightPillRail` — edge-bleeding chip rail built only from facts the ledger can prove (bills due, month-on-month delta, top week categories).
- ✅ `GoalsStrip` gained a per-goal mini ring, an inline **Add** action opening the same `AddFundsSheet` the Goals screen uses, and next-milestone microcopy.
- ✅ Income health rebuilt end to end — `IncomeAnalyticsService.getMonthlyTrend` / `getIncomeBySource` (real SQL), `services/income/incomeHealthCopy.ts`, `hooks/useIncomeHealth.ts`, `components/income/incomeVisuals.tsx` (health bar, arc gauge, score ring, sparkline, donut), `IncomeHealthCard` on home, and a rebuilt `IncomeDetailScreen`.
- ✅ `CountUp` now actually counts up from zero on mount, with a guaranteed settle so a stalled animation driver can never leave a money figure reading ₹0.
- ✅ `ExpandingTabBar`'s FAB gained press feedback (scale to 0.9, spring back) on its own shared value, multiplied into the existing idle pulse.

**Done in the first-run setup pass:**

- ✅ `screens/onboarding/FirstRunSetupScreen.tsx` + `services/firstRunPlan.ts` — the setup flow between the privacy screen and PIN setup. Income (pre-filled ₹25,000, one-tap presets) → a pre-checked three-row plan (track salary, set aside 10%, start My Safety Net) → confirmation. Every row writes to infrastructure that already exists: `RecurringIncomeService.createTemplate`, `budget_settings`' savings share, and a real `goalStore` goal.
- ✅ **No simulated first save.** The spec this flow came from opened the app with a fictional ₹500 "welcome bonus" to manufacture endowed progress. The goal starts at zero because it is zero, and the salary template only materializes months that have actually happened (`salaryStartMonth`). Endowed progress here is the *plan* existing, not a balance the app made up — inventing a figure would break the same rule `homeNarrative.ts` and `badges.ts` are built on.
- ✅ Every step is skippable and each write is independently guarded, so a user who taps straight through, or one whose goal insert fails, still lands in a working app.

**Done in the Age of Money + weekly story pass:**

- ✅ `services/ageOfMoney.ts` — FIFO income-to-spending matching, surfaced as the first item in the hero's story row (`HeroStats.StoryRow`, threaded through `MoneyMap`). It leads that row because it is the only figure there describing the user's *position* rather than their recent behaviour, and the only one that doesn't reset with the calendar month. Three tone bands (under a week / under a month / a month or more), because `Tone` is a three-colour vocabulary and a fourth band would need a colour the palette doesn't have.
- ✅ **Age of Money returns null rather than guessing.** Spending the app can't trace to recorded income is skipped, not scored as "0 days old" — that would report a crisis that is really a gap in the ledger. Under three funded expenses it makes no claim at all.
- ✅ `services/weeklyStory.ts` + `components/insights/WeeklyStoryCard.tsx` — the one backward-looking surface on home, below the hero so it never competes for the first glance. A tone-coloured 4px rule instead of a tinted card, for the same reason. Hides itself entirely on an empty week.
- ✅ **The weekly story never compares against an absent week.** A prior week with nothing recorded is missing data, not a week of zero spending; comparing against it would manufacture a dramatic rise out of the user having installed the app eight days ago. Drift under 10% reads as "about the same", so the card doesn't cry news over noise.

**Done in the transactions-psychology pass:**

- ✅ `services/roundUp.ts` — every logged expense rounds to the nearest ₹10 and earmarks the change to a goal through the existing `FinancialLedgerService.fundGoal`. `fundGoal` gained an optional `note`, so a round-up row reads "Round-up from Swiggy" and stays distinguishable from a deliberate contribution in the same goal's history. Surfaced as a pre-checked first-run row and a Settings toggle.
- ✅ **A round-up can never cost the user their transaction.** It runs after the expense has saved, outside the try that guards it, and swallows its own errors. Losing a recorded expense because a ₹3 bonus write failed would be an absurd trade.
- ✅ **Settings rows now carry the "why", not a restatement of the label.** The round-up row explains what ₹3 a chai becomes over a year. A toggle whose consequence is invisible gets switched off the first time a user audits the screen.
- ✅ `services/transactionInsight.ts` — one observation per transaction in `TransactionDetailSheet` ("Your 3rd Swiggy order this week — ₹1,240 altogether"), silent below three occurrences and silent on most rows by design. An insight on every row is wallpaper; the user stops reading them and the one that mattered goes unnoticed with the rest.
- ✅ **The insight reports, it never judges.** "Your 4th Swiggy order this week" is a fact the user can act on; "you're spending too much on Swiggy" is a verdict nobody asked this app for. A unit test asserts the copy contains no verdict language, the same rule `homeNarrative.buildStatus` and the weekly story follow.

**Still needed — verification pass:**

- 🔲 **Round-ups have not been exercised on a device** — the earmark path (expense saves → goal grows → both appear in the ledger) is covered by unit tests on the pure half only; the `fundGoal` write itself is untested end to end here.
- 🔲 **`WeeklyStoryCard` and the story row's Age of Money item have not been seen on a device** — the story row now holds up to three items (age, streak, badge) and its wrapping behaviour at small widths is unverified.
- 🔲 **`FirstRunSetupScreen` has not been run on a device** — verified by `tsc`, ESLint and 305 unit tests only. The keyboard-avoidance on the income step (number pad over a bottom-pinned CTA) is the specific thing that wants a real screen.

- 🔲 **The home and income-health screens have not been run on a device in this pass** — everything above is verified by `tsc`, ESLint, and 242 unit tests (5 pre-existing failures in `goalStore` / `insightsEngine` / `MoneyPlanShell`, unrelated). Ring geometry at small screen widths, the gauge well against the enamel panel, and the badge celebration's confetti timing all want a real screen before shipping.
- 🔲 All user-side screens need to be **re-checked visually** against the new palette. `PastelCard`/`StatRing` and other token-driven components auto-cascade the new colors via `specTheme.ts`, but none have been visually re-verified on-device since this specific swap (previous verification passes were against the now-retired v2/v3 pastel-lavender system).
- 🔲 Confirm every user screen's canvas actually renders `#E6F0FA` (not a stale hardcoded off-white left over from v2) — grep for old v2 hex literals (`#F7F5F1`, `#EFEDE7`, `#E7E3FB`, etc.) across `src/screens/user/` and `src/components/`.
- 🔲 Confirm no screen still imports `userFintechTheme` or `UserCapsuleTabBar` directly.
- 🔲 Confirm tab bar configuration (`tabs`, `hasFab`, `fabIndex`) is consistent between the admin and user navigators now that both consume the same `ExpandingTabBar`.
- 🔲 8pt-grid retrofit of any pre-existing hardcoded spacing values that predate `space.*` tokens — not yet swept in this pass.


---

## 11. v5 — Neutral modern system (lite app)

**Decision (user-confirmed):** direction = neutral modern, Material-3 style; rollout = foundation first, then screen by screen. Scope is the **lite consumer app** (`src/screens/user`, `src/components`). The pro/chit-fund module (`src/modules/chitfund`) keeps its own look until separately decided.

### Surfaces and colour
- Canvas `background` `#F5F6F8` (dark `#101114`). Cards `card` white (dark `#1A1C21`). Recessed groups `surfaceSunken`. Hierarchy comes from **tone**, not shadow; `cardShadow` is optional and light.
- Primary action stays ink `primaryAccent` (`#121723`, dark near-white). One CTA per screen.
- The accent rotation (`lavender/pink/mint/peach/sky`) is now **quiet tonal containers** with a `…Deep` ink, used only to tell categories or buckets apart. Never a screen background.
- The one dark surface is `enamel` (home hero, Kaza hero). No other dark panels.
- Meaning is never colour alone: pair success/danger with an icon or sign.
- Raw hex in screens is banned. Add a token instead.

### Hard limits (`specTheme.ts` exports them; `npm run lint:design` reports breaches)
| Thing | Allowed |
|---|---|
| Font | Satoshi only (Regular, Medium, Bold, Black) |
| Type sizes | 44 display · 28 headline · 20 title · 16 subtitle · 14 body · 12 label (see `typeScale`) |
| Radii | 8 · 12 · 16 · 24 · 999, plus ≤6 for bars and dots (see `radii`) |
| Spacing | 8pt grid via `space.*`; 4 only for icon micro-adjustment |
| Touch targets | ≥ 48dp, ≥ 8dp apart |
| Screen length | A screen file stays under ~400 lines; sheets and sections are their own components |
| Theme hook | `useSpecTheme()` only. `designTokens`, legacy `useTheme` colours and `blobTheme` are retired file by file |

### Screen pattern
One primary number or action per screen, shown first. Detail is revealed progressively (collapsed rows, sheets). Settings live behind one header control, not as a row at the bottom of the scroll.

### Kaza
Kaza follows the system. Its only own piece is `PRAYER_TINT` (`theme/kazaTheme.ts`): each prayer wears the palette tint of its hour. Its hero uses `enamel`.

### Home: the orbit dial (v5, user-chosen structure)
The safe-to-spend dial owns the first screen; the rest of the money picture orbits it as four tonal squircle satellites (Bills, Goals, Income health, Insights), each showing one live value with a caption and, for Bills, an attention dot when something is overdue or due soon. Tapping one springs open a `SheetModal` holding the full detail (`BillsPeek`, `GoalsStrip`, `IncomeHealthCard`, insights/weekly story). Nothing was removed from Home, only moved one tap from the dial. Motion: satellites spring in with a stagger, then drift on separate phases (off under reduce-motion). Components: `components/home/OrbitDial.tsx`, `BillsPeek.tsx`; `components/shared/SheetModal.tsx` is the one bottom sheet (Kaza uses it too). The same pattern (one decisive number, detail one tap away) is the template for the other screens.

### Rollout order and status
1. ✅ Foundation: tokens, limits, lint script, this section.
2. ✅ Kaza migrated.
2b. ✅ Home redesigned as the orbit dial (structure chosen by the user from three dealt options).
3. 🔲 Home, Transactions, Add, Bills, Reports, Settings, Goals, Budget, then the rest. Verify each on the emulator in light, dark and 1.3× font scale.
4. 🔲 Retire `designTokens` (21 files) and legacy `useTheme` colour use (11 files).
5. 🔲 Turn `lint:design --strict` on in CI when the baseline reaches zero. Baseline at v5 start: 106 files, 553 violations.
