/**
 * SpecTheme - Specification Theme System
 * v3 — mirrors the admin panel's design system exactly (light-blue canvas,
 * white cards, 5-accent pastel rotation, glass ExpandingTabBar). See
 * DESIGN.md for full rationale. Light and dark palettes with shared
 * design constants.
 */

import { useTheme } from '../hooks/useTheme';

// ============================================
// LIGHT PALETTE — mirrors useTheme()'s lightColors exactly
// ============================================
export const specLight = {
  background: '#F5F6F8',
  surfaceSunken: '#ECEEF2',
  card: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  // Admin's real CTA color: hardcoded '#121723' across Button.tsx and
  // blobTheme.ts's `accent` — colors.primary (#007AFF) is theme-declared but
  // barely used. Mirror the color admin ACTUALLY paints buttons with.
  primaryAccent: '#121723',
  /** Text and icons drawn ON primaryAccent. Never hardcode white: the dark
   *  palette's accent is near-white, so white-on-accent vanished entirely. */
  onAccent: '#FFFFFF',
  success: '#34C759',
  danger: '#FF3B30',
  // The third state between "fine" and "over". Introduced when the home hero
  // gained a pacing ring that needs to say "approaching" without borrowing
  // danger's red — peachDeep is an accent-rotation ink, not a status color.
  warning: '#FF9500',
  textPrimary: '#16181D',
  textSecondary: '#5B616E',
  // Section eyebrows/labels on the light-blue canvas — textSecondary fails
  // 4.5:1 there (≈4.0:1), this clears it (≈6.6:1). See DESIGN.md §2.
  sectionLabel: '#4A505C',
  segmentActiveBg: '#121723',
  segmentActiveText: '#FFFFFF',
  segmentInactiveBg: '#ECEEF2',
  segmentInactiveText: '#5B616E',
  incomeTint: '#DDF1E6',
  expenseTint: '#FBE6D6',
  chipBg: '#EEF0F4',
  inputBg: '#FFFFFF',
  border: '#E2E5EA',
  // Pastel accent rotation, straight from useTheme()'s accent1-5.
  lavender: '#E4E8FB',
  lavenderDeep: '#3A4BB5',
  mint: '#DDF1E6',
  mintDeep: '#1F7A4D',
  peach: '#FBE6D6',
  peachDeep: '#B4541A',
  pink: '#F6E1EA',
  pinkDeep: '#A33A68',
  sky: '#DCEFF8',
  skyDeep: '#0B6C86',
};

// ============================================
// DARK PALETTE — mirrors useTheme()'s darkColors exactly
// ============================================
export const specDark = {
  background: '#101114',
  surfaceSunken: '#0B0C0E',
  card: '#1A1C21',
  surfaceElevated: '#22252B',
  primaryAccent: '#F5F7FA',
  /** The dark accent is near-white, so what sits on it must be near-black. */
  onAccent: '#0F1419',
  success: '#4CAF50',
  danger: '#FF6B6B',
  warning: '#FFA726',
  textPrimary: '#F2F3F5',
  textSecondary: '#A3A8B3',
  sectionLabel: '#A3A8B3',
  segmentActiveBg: '#F5F7FA',
  segmentActiveText: '#0F1419',
  segmentInactiveBg: '#22252B',
  segmentInactiveText: '#A3A8B3',
  incomeTint: 'rgba(76,175,80,0.16)',
  expenseTint: 'rgba(255,167,38,0.16)',
  chipBg: '#262930',
  inputBg: '#22252B',
  border: '#2E3139',
  lavender: '#262B4A',
  lavenderDeep: '#A9B6FF',
  mint: '#1C3A2D',
  mintDeep: '#6FD3A0',
  peach: '#43301F',
  peachDeep: '#F0B27A',
  pink: '#432533',
  pinkDeep: '#F0A3C2',
  sky: '#1B3640',
  skyDeep: '#7FD0E8',
};

// ============================================
// ENAMEL — the home hero's dark panel
// ============================================
/**
 * The one dark surface in the app (DESIGN.md §7). Exported from here because
 * three components draw on it and each used to keep its own private copy of
 * these values — three copies that could and did drift apart.
 *
 * The ground is neutral rather than the blue-black it started as: the gauge
 * well sits on it as a lighter *neutral* step, and a grey well on a blue-black
 * ground reads as two unrelated darks rather than one surface catching light.
 */
export const enamel = {
  ...specDark,
  /** Panel ground. */
  background: '#1C1C1E',
  /** Layered up, not down — the gauge and the small pills sit on this. */
  card: '#2C2C2E',
  /** The gauge well's outer edge, so the well can fall off into the ground. */
  wellEdge: '#1C1C1E',
  surfaceSunken: '#161618',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  success: '#34C759',
  successBright: '#30D158',
  warning: '#FF9500',
  danger: '#FF3B30',
  dangerBright: '#FF453A',
  warningBright: '#FFB340',
  neutralBright: '#AEAEB2',
  gold: '#FFD60A',
};

// ============================================
// SHARED CONSTANTS
// ============================================
// Hard limits (DESIGN.md §11): screens may only use these. `yarn lint:design`
// reports anything off-scale.
export const radii = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

/** The one strong colour: used on black only (hero number, chart line) and as a fill with black text. */
export const brand = {
  /** Hero number, chart line, rewards. Never used for warnings. */
  signal: '#FFC400',
  ink: '#111111',
  /** Needs action: overdue, low, behind. The one warning colour. */
  alert: '#FF6B57',
} as const;

/** Text and fills on the black hero, so no component hard-codes its own alpha. */
export const onInk = {
  high: '#FFFFFF',
  mid: 'rgba(255,255,255,0.80)',
  low: 'rgba(255,255,255,0.66)',
  fill: 'rgba(255,255,255,0.12)',
  hairline: 'rgba(255,255,255,0.10)',
} as const;

/** The only text sizes the lite app uses: [fontSize, lineHeight]. */
export const typeScale = {
  monument: { fontSize: 64, lineHeight: 68 },
  display: { fontSize: 44, lineHeight: 52 },
  headline: { fontSize: 28, lineHeight: 36 },
  title: { fontSize: 20, lineHeight: 28 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, lineHeight: 16 },
} as const;

export const cardRadius = 24;
export const chipRadius = 999;
export const inputRadius = 16;
export const iconContainerRadius = 999;
export const fabSize = 62;

// 8pt grid — see DESIGN.md §4. 4px permitted only for icon/text micro-adjustment.
export const space = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 4,
};

// Subtle elevation for icon-in-circle containers — DESIGN.md §5/§6.
export const iconShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 1,
};

export const spring = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

// ============================================
// TYPES
// ============================================
export type SpecPalette = typeof specLight;

interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface SpecTheme {
  colors: SpecPalette;
  cardRadius: number;
  chipRadius: number;
  inputRadius: number;
  iconContainerRadius: number;
  fabSize: number;
  space: typeof space;
  cardShadow: ShadowStyle;
  iconShadow: ShadowStyle;
  spring: { damping: number; stiffness: number; mass: number };
  isDark: boolean;
  toggleTheme: () => void;
}

// ============================================
// HOOK
// ============================================
export const useSpecTheme = (): SpecTheme => {
  const { isDark, toggleTheme } = useTheme();

  return {
    colors: isDark ? specDark : specLight,
    cardRadius,
    chipRadius,
    inputRadius,
    iconContainerRadius,
    fabSize,
    space,
    cardShadow,
    iconShadow,
    spring,
    isDark,
    toggleTheme,
  };
};
