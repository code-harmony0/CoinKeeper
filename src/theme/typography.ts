/**
 * CoinKeeper Typography System
 * Font families, sizes, and weights
 */

import { TextStyle } from 'react-native';

export const FONT_FAMILY = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  // Fallback to system fonts if custom fonts aren't loaded
  systemRegular: 'System',
  systemBold: 'System',
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 56,
};

export const FONT_WEIGHT = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

export const LINE_HEIGHT = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 32,
  xxl: 36,
  xxxl: 40,
  huge: 48,
};

// Text Style Presets
export const TEXT_STYLES = {
  h1: {
    fontSize: FONT_SIZE.xxxl,
    lineHeight: LINE_HEIGHT.xxxl,
    fontWeight: FONT_WEIGHT.bold,
  },
  h2: {
    fontSize: FONT_SIZE.xxl,
    lineHeight: LINE_HEIGHT.xxl,
    fontWeight: FONT_WEIGHT.bold,
  },
  h3: {
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    fontWeight: FONT_WEIGHT.semibold,
  },
  h4: {
    fontSize: FONT_SIZE.lg,
    lineHeight: LINE_HEIGHT.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  body: {
    fontSize: FONT_SIZE.base,
    lineHeight: LINE_HEIGHT.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  bodyMedium: {
    fontSize: FONT_SIZE.base,
    lineHeight: LINE_HEIGHT.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  caption: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  amount: {
    fontSize: FONT_SIZE.huge,
    lineHeight: LINE_HEIGHT.huge,
    fontWeight: FONT_WEIGHT.bold,
  },
};
