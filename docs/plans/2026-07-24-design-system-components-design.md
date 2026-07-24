# Design System Common Components — Design

## Problem

Six duplicate, hardcoded-color primitives exist across the codebase (`ui/Button.tsx`, `core/Button.tsx`, `ui/TextInput.tsx`, `core/Input.tsx`, plus scattered Text/Typography variants), each with its own `#121723`/`#F1F5F9`-style literals instead of `specTheme` tokens. `SettingsRow.tsx`'s `SettingsIconBox` is the only component doing this right (tint-token-driven, no hardcoded hex) but isn't generalized for reuse outside Settings. `ExpandingTabBar`'s icon+label pair (`gap: 2`) reads as visually stuck together, no breathing room.

## Goal

One canonical set of primitives in `src/components/ui/` — `Button`, `Input`, `Text`, `Icon` — all `useSpecTheme()`-driven, variant-table APIs ("pass the variant name"), full migration of every consumer, deletion of the duplicates. Fix the tab bar spacing as part of the same pass since it's the same "commonality + polish" concern.

## Components

### `src/theme/tints.ts` (new — supersedes the tint map in `settingsIcons.ts`)
Merges the 7 semantic tints (`green/orange/indigo/blue/purple/teal/amber`, from `SETTINGS_TINTS`) with the 5 accent-rotation tints (`lavender/mint/peach/pink/sky`, from `specTheme.ts`) into one `TINTS` lookup — so `Icon`'s `tint` prop covers both "this row means payments" (semantic) and "this is chit-card #2 in the rotation" (rotation) with a single table, no second parallel system. `settingsIcons.ts` keeps `LOGOUT_COLORS`, `ICON_CONTAINER_SIZE/RADIUS`, `SETTINGS_CARD_SHADOW` and re-exports `TINTS` for existing import sites (no forced rename sweep of those constants).

### `src/components/ui/Icon.tsx` (new — generalizes `SettingsIconBox`)
```ts
interface IconProps { icon: LucideIcon; tint: TintName; size?: number }
```
Tinted rounded-square container (radius scales with size, `iconContainerRadius` at the base 40px size). `SettingsIconBox` becomes `export const SettingsIconBox = Icon;` — a re-export, not a second implementation.

### `src/components/ui/Button.tsx` (new — replaces `ui/Button.tsx` + `core/Button.tsx` + `SettingsPrimaryButton` + `LogoutButton`)
```ts
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'; // default 'primary'
  size?: 'small' | 'medium' | 'large'; // default 'medium'
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean; // default true
}
```
Variant table (fill / text-icon-color): `primary` → `colors.primaryAccent` / `colors.background`; `destructive` → `colors.danger` @ ~12% tint / `colors.danger`; `secondary` → `colors.surfaceSunken` / `colors.textPrimary`; `outline` → transparent + 1.5px `colors.border` / `colors.textPrimary`; `ghost` → transparent / `colors.textPrimary`. Size table: `small` (h40/14px), `medium` (h52/16px — today's real button height), `large` (h56/17px). Built on the existing `PressableScale` (no second press-animation system). `chipRadius` (999) for all sizes — every real button in the app today is a full pill.

### `src/components/ui/Input.tsx` (new — replaces `ui/TextInput.tsx` + `core/Input.tsx`)
```ts
interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
}
```
Fill `colors.surfaceSunken` (matches admin's UPI-input convention), `inputRadius` (16), height 52 (rhythm-matches `Button`'s medium). No permanent border — border appears only on `error` (`colors.danger`) or focus (`colors.primaryAccent`), per the precedent already set fixing `LoginScreen`'s input.

### `src/components/ui/Text.tsx` (rewrite in place — keep the file, fix its color source)
Currently reads `useTheme()` (`colors.primary/text/black`, the *old* hook) instead of `useSpecTheme()`. Rewrite to the DESIGN.md §3 canonical scale — `display/h1/h2/body/bodyMuted/caption/overline` — plus keep `label` (already consumed). `color` prop values become `'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'white'`, mapped to `useSpecTheme().colors`.

## Tab bar spacing fix (`ExpandingTabBar.tsx`)

`tabContent`'s `gap: 2` → `gap: 6`. `EXPANDED_WIDTH` 68 → 76 so the wider gap doesn't clip the label against the pill edge. `TAB_HEIGHT` (40) and `ICON_SIZE` unchanged — this is a spacing-only fix, not a resize of the bar.

## Migration (full sweep, per user decision)

Delete after migrating every consumer: `src/components/ui/Button.tsx` (old), `src/components/core/Button.tsx`, `src/components/ui/TextInput.tsx`, `src/components/core/Input.tsx`, `SettingsPrimaryButton` + `LogoutButton` exports from `SettingsRow.tsx` (replaced by `<Button variant="primary">` / `<Button variant="destructive">`).

## Verification

`tsc --noEmit` after each file change, on-device screenshot verification of: Login (Continue button), Settings (both admin + user — Save/Logout buttons, all icon tints), Add Transaction sheet (inputs), tab bar (icon/label gap). No behavior/handler changes anywhere — this is a render-layer migration only.
