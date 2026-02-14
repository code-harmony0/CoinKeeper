/**
 * CoinKeeper Spacing System
 * Consistent spacing scale for all layouts
 */

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
};

export type SpacingType = keyof typeof SPACING;

// Layout constants
export const LAYOUT = {
  containerPadding: SPACING.md,
  screenPaddingHorizontal: SPACING.lg,
  screenPaddingVertical: SPACING.xl,
  cardPadding: SPACING.md,
  sectionSpacing: SPACING.xl,
  listItemSpacing: SPACING.sm,
};
