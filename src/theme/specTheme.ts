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
  background: '#E6F0FA',
  surfaceSunken: '#F4F6F8',
  card: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  // Admin's real CTA color: hardcoded '#121723' across Button.tsx and
  // blobTheme.ts's `accent` — colors.primary (#007AFF) is theme-declared but
  // barely used. Mirror the color admin ACTUALLY paints buttons with.
  primaryAccent: '#121723',
  success: '#34C759',
  danger: '#FF3B30',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  segmentActiveBg: '#121723',
  segmentActiveText: '#FFFFFF',
  segmentInactiveBg: '#F4F6F8',
  segmentInactiveText: '#6B7280',
  incomeTint: '#98E4C1',
  expenseTint: '#FFD4B8',
  chipBg: '#F4F6F8',
  inputBg: '#FFFFFF',
  border: '#E5E7EB',
  // Pastel accent rotation, straight from useTheme()'s accent1-5.
  lavender: '#D8E2FA',
  lavenderDeep: '#1565C0',
  mint: '#98E4C1',
  mintDeep: '#2E7D32',
  peach: '#FFD4B8',
  peachDeep: '#E65100',
  pink: '#E2B6CF',
  pinkDeep: '#AD1457',
  sky: '#B8E6F5',
  skyDeep: '#00838F',
};

// ============================================
// DARK PALETTE — mirrors useTheme()'s darkColors exactly
// ============================================
export const specDark = {
  background: '#0F1419',
  surfaceSunken: '#252D38',
  card: '#1E2530',
  surfaceElevated: '#1E2530',
  primaryAccent: '#F5F7FA',
  success: '#4CAF50',
  danger: '#FF6B6B',
  textPrimary: '#F5F7FA',
  textSecondary: '#A0AEC0',
  segmentActiveBg: '#F5F7FA',
  segmentActiveText: '#0F1419',
  segmentInactiveBg: '#252D38',
  segmentInactiveText: '#A0AEC0',
  incomeTint: 'rgba(76,175,80,0.16)',
  expenseTint: 'rgba(255,167,38,0.16)',
  chipBg: '#252D38',
  inputBg: '#252D38',
  border: '#2D3748',
  lavender: '#2C3E50',
  lavenderDeep: '#4DA2FF',
  mint: '#1E4D3D',
  mintDeep: '#4CAF50',
  peach: '#4A3428',
  peachDeep: '#FFA726',
  pink: '#4A1942',
  pinkDeep: '#E2B6CF',
  sky: '#1E3A4A',
  skyDeep: '#B8E6F5',
};

// ============================================
// SHARED CONSTANTS
// ============================================
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
