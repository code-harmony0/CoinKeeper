/**
 * CoinKeeper Theme Export
 * Central export for all theme tokens
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
export * from './borderRadius';

import { COLORS } from './colors';
import { SPACING, LAYOUT } from './spacing';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, TEXT_STYLES } from './typography';
import { SHADOWS } from './shadows';
import { RADIUS } from './borderRadius';

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  layout: LAYOUT,
  fonts: {
    family: FONT_FAMILY,
    size: FONT_SIZE,
    weight: FONT_WEIGHT,
  },
  textStyles: TEXT_STYLES,
  shadows: SHADOWS,
  radius: RADIUS,
} as const;

export type Theme = typeof theme;
