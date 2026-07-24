# CoinKeeper — Design System (v4)

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

| Tier | Token | Role |
|---|---|---|
| 0 — Canvas | `background` | the screen itself, light blue, always visible at the edges |
| 1 — Section | `surfaceSunken` | a recessed grouping field between canvas and card — segmented-control tracks, grouped-list backgrounds |
| 2 — Card | `card` (or an accent-rotation tint for a "bucket"/tab context) | the primary content surface — white by default, always paired with `cardShadow` when it needs to read as elevated above canvas |

### Full token table — Light (`specLight`, `src/theme/specTheme.ts`)

| Token | Value | Use |
|---|---|---|
| `background` | `#E6F0FA` | tier 0 canvas — light blue |
| `surfaceSunken` | `#F4F6F8` | tier 1 — segmented track, sunken list group bg |
| `card` | `#FFFFFF` | tier 2 — neutral card |
| `surfaceElevated` | `#FFFFFF` | sheets/modals (always + `cardShadow`) |
| `primaryAccent` | `#007AFF` | primary CTA / FAB / active segment — iOS blue |
| `success` | `#34C759` | |
| `danger` | `#FF3B30` | |
| `textPrimary` | `#1A1A1A` | headlines, hero numbers |
| `textSecondary` | `#6B7280` | labels, captions, muted body |
| `segmentActiveBg` / `segmentActiveText` | `#007AFF` / `#FFFFFF` | |
| `segmentInactiveBg` / `segmentInactiveText` | `#F4F6F8` / `#6B7280` | |
| `incomeTint` | `#98E4C1` | = `mint` |
| `expenseTint` | `#FFD4B8` | = `peach` |
| `chipBg` | `#F4F6F8` | neutral icon-circle / pill background |
| `inputBg` | `#FFFFFF` | text input fill |
| `border` | `#E5E7EB` | hairline — used sparingly, see §5 |
| `lavender` / `lavenderDeep` | `#D8E2FA` / `#1565C0` | accent rotation #1 (fill / deep-text-on-tint) |
| `mint` / `mintDeep` | `#98E4C1` / `#2E7D32` | accent rotation #3 |
| `peach` / `peachDeep` | `#FFD4B8` / `#E65100` | accent rotation #4 |
| `pink` / `pinkDeep` | `#E2B6CF` / `#AD1457` | accent rotation #2 |
| `sky` / `skyDeep` | `#B8E6F5` / `#00838F` | accent rotation #5 |

The rotation order is **lavender → pink → mint → peach → sky** (indices 0–4), matching `useTheme()`'s `accent1`–`accent5` and `ExpandingTabBar`'s `COLORS.accents` array exactly — this order is load-bearing, don't reshuffle it per screen.

### Dark (`specDark`)

| Token | Value |
|---|---|
| `background` | `#0F1419` |
| `surfaceSunken` | `#252D38` |
| `card` | `#1E2530` |
| `surfaceElevated` | `#1E2530` |
| `primaryAccent` | `#4DA2FF` |
| `success` / `danger` | `#4CAF50` / `#FF6B6B` |
| `textPrimary` | `#F5F7FA` |
| `textSecondary` | `#A0AEC0` |
| `segmentActiveBg` / `segmentActiveText` | `#4DA2FF` / `#0F1419` |
| `segmentInactiveBg` / `segmentInactiveText` | `#252D38` / `#A0AEC0` |
| `incomeTint` | `rgba(76,175,80,0.16)` |
| `expenseTint` | `rgba(255,167,38,0.16)` |
| `chipBg` | `#252D38` |
| `inputBg` | `#252D38` |
| `border` | `#2D3748` |
| `lavender` / `lavenderDeep` | `#2C3E50` / `#4DA2FF` |
| `mint` / `mintDeep` | `#1E4D3D` / `#4CAF50` |
| `peach` / `peachDeep` | `#4A3428` / `#FFA726` |
| `pink` / `pinkDeep` | `#4A1942` / `#E2B6CF` |
| `sky` / `skyDeep` | `#1E3A4A` / `#B8E6F5` |

Dark mode has no shadow discipline change from light — `cardShadow`/`iconShadow` still apply, just against a dark canvas.

Both palettes live in `src/theme/specTheme.ts` (`specLight`/`specDark`) and are written to mirror `src/hooks/useTheme.tsx`'s `lightColors`/`darkColors` (`ThemeColors` type) — the admin panel's original source of truth. If the two ever drift, `useTheme.tsx` wins and `specTheme.ts` must be corrected to match, not the other way around.

---

## 3. Typography

Unchanged — the Satoshi system stands as-is.

**Satoshi** (Indian Type Foundry, Fontshare) is bundled — the real brand font. It ships **Regular / Medium / Bold / Black** — there is **no SemiBold (600)**. The app's four historical weight *strings* remap onto Satoshi's four real cuts, chosen to preserve four distinct tiers and give headlines the heavy, confident weight the reference uses:

| App font string (in code) | → Satoshi file | Role |
|---|---|---|
| `Satoshi-Regular` | Regular (400) | body / secondary text |
| `Satoshi-Medium` | Medium (500) | labels |
| `Satoshi-Bold` | Bold (700) | section titles, card values, buttons *(was the app's "SemiBold" tier)* |
| `Satoshi-Black` | Black (900) | page titles, hero currency numbers *(was the app's "Bold" tier)* |

The prior `Inter-*` families (and the never-shipped `PlusJakartaSans-*` before them) are fully retired. **Android-only project** — fonts live in `android/app/src/main/assets/fonts/` and bundle at build time; no iOS font setup is maintained.

| Style | Size | Font string | Tracking | Use |
|---|---|---|---|---|
| Display | 40 | `Satoshi-Black` | -0.5 | hero currency numbers |
| H1 | 28 | `Satoshi-Black` | -0.3 | screen title |
| H2 | 20 | `Satoshi-Bold` | 0 | section title |
| Body | 15 | `Satoshi-Medium` | 0 | list titles, card labels |
| BodyMuted | 14 | `Satoshi-Regular` | 0 | secondary line under a title |
| Caption | 12–13 | `Satoshi-Regular`/`-Medium` | 0.2 | timestamps, small captions |
| Overline | 11 | `Satoshi-Bold` | 0.8, uppercase | section eyebrows |

Hero numbers always render in `textPrimary`, never in an accent color.

---

## 4. Spacing — 8pt Grid

Base unit is **8px**. Half-steps of 4px are permitted only for icon-internal and text-line micro-adjustments (never for section rhythm).

| Token | Value | Use |
|---|---|---|
| `space.xs` | 8 | icon-to-label gap, chip internal padding |
| `space.sm` | 16 | card internal padding (default), row gaps |
| `space.md` | 24 | screen horizontal padding, card internal padding (hero cards) |
| `space.lg` | 32 | section-to-section vertical rhythm |
| `space.xl` | 48 | screen top/bottom breathing room |

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

### Other components

- **StatRing** — thick circular progress (SVG), track in `chipBg`, fill in the active accent's `*Deep` or `primaryAccent`. Center text is Display/H1 weight. One per screen maximum.
- **PastelCard / bucket card** — uses an accent-rotation tint (`lavender`/`pink`/`mint`/`peach`/`sky`) as a flat surface, no `cardShadow` on the tint itself (told apart by color, not elevation). Eyebrow → hero value (`textPrimary`, never accent) → supporting line → optional thin progress bar in the tint's `*Deep`.
- **Segmented control (`PillSegment`)** — active pill in `segmentActiveBg`/`segmentActiveText`, sliding on a `surfaceSunken` (tier-1) track, not a white track — the control itself must read as a recessed field, not another floating card.
- **Buttons** — primary = `primaryAccent` fill + `#FFFFFF` text, full pill radius. Secondary = `chipBg` fill + `textPrimary` text. No outline-only primary buttons.
- **Empty states** — flat-SVG illustrations recolored to the admin-mirrored palette.

---

## 8. Motion Rules

- Spring config app-wide: `{ damping: 16, stiffness: 140, mass: 1 }` (`spring` in `specTheme.ts`) — the same config used by `ExpandingTabBar`'s tab-expand animation (damping 15/stiffness 120 is a deliberate, slightly snappier variant for that one interaction; don't treat it as the new global default).
- `PressableScale`, `CountUp`, `AnimatedProgressBar` stay as-is (0.96 press scale, spring feedback).
- Card entrances: `FadeInDown.springify()`, short stagger.
- Haptic feedback on all interactive presses (`react-native-haptic-feedback`), matching the tab bar's existing convention.

---

## 9. Component Consistency Checklist

Before any component ships, confirm:

| Check | Rule |
|---|---|
| Canvas | screen background is the `background` token — never off-white, never a bespoke hex |
| Radius | 24 for cards, 999 for pills/icon-circles, 16 for inputs — no ad-hoc values |
| Shadow | `cardShadow` or `iconShadow` as appropriate, or none on accent-tinted flat surfaces — never a custom heavier shadow (tab bar and FAB are the one sanctioned exception, §7) |
| Spacing | every margin/padding is a multiple of 8 (4 only for icon/text micro-adjustment) |
| Icon | inside a container, with `iconShadow` (except tab-bar icons, §6) |
| Color | every color used is a token from §2, no ad-hoc hex; accent rotation used in its fixed order |
| Border | present only where §5 permits it |
| Typography | matches a row in §3's scale, no ad-hoc font sizes |
| Tab bar | `ExpandingTabBar` only — no side-specific tab bar component |

---

## 10. Rollout status (updated as of this pass)

**Done this pass:**
- ✅ `src/theme/specTheme.ts` fully rewritten to v3 — `specLight`/`specDark` now mirror `useTheme.tsx`'s `lightColors`/`darkColors` exactly (light-blue `#E6F0FA` canvas, white cards, `#007AFF` primary accent, 5-color accent rotation as `lavender/pink/mint/peach/sky` + `*Deep` pairs).
- ✅ `cardRadius`/`chipRadius`/`inputRadius`/`iconContainerRadius`/`fabSize` and `cardShadow`/`iconShadow` constants updated to the values in §5 above.
- ✅ Tab bar swapped to the shared `ExpandingTabBar` (`src/components/shared/ExpandingTabBar.tsx`) for both admin and user navigators.
- ✅ `UserCapsuleTabBar` and `userFintechTheme` retired — no longer the source of truth for the user side's tab bar or theme.
- ✅ This document (DESIGN.md) rewritten as v4 to describe the admin-mirrored system as canonical.

**Still needed — verification pass:**
- 🔲 All user-side screens need to be **re-checked visually** against the new palette. `PastelCard`/`StatRing` and other token-driven components auto-cascade the new colors via `specTheme.ts`, but none have been visually re-verified on-device since this specific swap (previous verification passes were against the now-retired v2/v3 pastel-lavender system).
- 🔲 Confirm every user screen's canvas actually renders `#E6F0FA` (not a stale hardcoded off-white left over from v2) — grep for old v2 hex literals (`#F7F5F1`, `#EFEDE7`, `#E7E3FB`, etc.) across `src/screens/user/` and `src/components/`.
- 🔲 Confirm no screen still imports `userFintechTheme` or `UserCapsuleTabBar` directly.
- 🔲 Confirm tab bar configuration (`tabs`, `hasFab`, `fabIndex`) is consistent between the admin and user navigators now that both consume the same `ExpandingTabBar`.
- 🔲 8pt-grid retrofit of any pre-existing hardcoded spacing values that predate `space.*` tokens — not yet swept in this pass.
