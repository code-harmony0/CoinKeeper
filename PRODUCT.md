# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Stack

Existing codebase: React Native 0.80.2, TypeScript. Android-only build (build-flag split, see below); no iOS setup is maintained.

## Users

Primary audience for ongoing design work: the **lite consumer** — an individual tracking their own everyday income, expenses, budgets, and goals. No chit-fund membership, no admin role. Their situation is day-to-day personal money management: logging transactions (manually or via SMS auto-extraction), watching a budget, working toward savings goals.

Two other audiences exist in the same codebase behind a separate build flavor (`CK_CHITFUND`) but are not the primary design focus going forward:

- **Pro chit-fund member** — tracks contributions, draws, and dues for chit-fund groups they belong to, alongside personal expenses.
- **Chit-fund admin/organizer** — runs groups, approves members, confirms payments, conducts draws.

## Product Purpose

CoinKeeper is a personal expense tracker (lite) with an optional chit-fund management layer (pro). It exists to give people a clear, trustworthy record of where their money goes and, for chit-fund participants, a transparent record of group contributions and draws — without ever touching the money itself. Success is the user trusting the numbers enough to keep opening the app.

## Positioning

**Trust without custody.** CoinKeeper tracks and confirms real money movement — personal transactions and chit-fund contributions alike — but never collects, holds, or transfers funds itself. All payments happen directly between people outside the app; the app's job is accurate, transparent record-keeping and confirmation, not payment processing. This is the mechanism a generic expense tracker (no chit-fund trust layer) or an informal WhatsApp-group chit fund (no structured record) can't truthfully claim.

## Operating Context

- Two build flavors from one codebase, gated by `CK_CHITFUND` / `CHITFUND_ENABLED` (`src/config/buildFlags.ts`), inlined at build time so Metro dead-code-eliminates the chit-fund module (`src/modules/chitfund`) from the lite bundle. Verified via `npm run verify:split`.
- Lite flavor: `com.coinkeeper.finance`. Pro flavor: `com.coinkeeper.finance.pro`.
- SMS auto-extraction of bank messages is a real, working workflow on the lite side (Android SMS read permission), not just manual entry.
- Chit-fund workflows (draws, member approval, contribution confirmation) are ritual, recurring group processes distinct from personal budgeting.
- Firebase project `coinkeeper-c53e7` backs auth and Firestore.
- All money is Indian Rupee (₹) denominated, formatted via `src/utils/money.ts` (INR, `en-IN` locale) — every amount in the app renders as ₹.
- The Kaza (missed-prayer) tracker ships in both build flavors but is experimental (see Capabilities).

## Capabilities and Constraints

- Does **not** collect, hold, or transfer funds — this is a hard product constraint, not a current limitation to design around.
- Android-only at present; no iOS build is maintained (bundled fonts are Android-asset-only).
- Lite and pro are compiled as genuinely separate bundles — a lite-focused feature must not assume chit-fund code/data is present.
- SMS parsing accuracy and permission handling are a known constraint area for the lite onboarding/trust experience.
- **Experimental — not a confirmed product commitment:** a Kaza (missed-prayer) tracker exists behind `ISLAMIC_ENABLED` (`src/config/buildFlags.ts`, currently `true`, flavor-independent — ships in both builds). It has its own SQLite tables (`kaza_prayers`, `kaza_log`), store (`src/store/kazaStore.ts`), reminder prefs, and an optional pinned tab. Treat it as a live experiment until the user confirms it as a product commitment; do not design other surfaces around it.

## Brand Commitments

- Name: **CoinKeeper**. No confirmed tagline, logo, or voice/personality guidelines beyond the visual system recorded in DESIGN.md.
- Visual identity is defined in DESIGN.md (v4): light-blue canvas, iOS-blue primary accent, 5-color pastel accent rotation, shared `ExpandingTabBar` across admin and user sides. That system currently mirrors the pro/admin panel's design across both flavors — this is a deliberate, confirmed product decision (design parity over a bespoke lite aesthetic), not open for reconsideration without an explicit user request.

## Evidence on Hand

- No confirmed customer testimonials, case studies, press, or third-party evidence exist. Do not fabricate any.
- `IMPLEMENTATION_STATUS.md` and `PROGRESS_TRACKER.md` track real, current build status of admin/pro screens — treat as evidence of what's built, not aspirational copy.
- `README.md`'s feature list, palette, and roadmap are stale (references a retired pastel palette, Plus Jakarta Sans, and pre-split navigation) — do not cite it as current product or visual truth.

## Product Principles

1. Never imply the app holds, moves, or has custody of money — every copy and flow choice must reinforce "track and confirm," not "pay."
2. The lite flavor must stand fully on its own — no UI, copy, or flow may assume chit-fund membership or admin access.
3. Personal budgeting trust is built through clarity and accuracy (visible math, confirmed SMS parses, honest empty states), not through reassurance copy alone.
4. Visual parity with the admin/pro system (DESIGN.md v4) is the current standing decision for the lite side too — don't reintroduce a bespoke lite-only visual language without an explicit request.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond standard mobile platform expectations. Record here if the user confirms a specific standard or user need later.
