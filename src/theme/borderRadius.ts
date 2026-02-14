/**
 * CoinKeeper Border Radius System
 * Rounded corners: 20-28px for premium feel
 */

export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  round: 9999,
};

export type RadiusType = keyof typeof RADIUS;
