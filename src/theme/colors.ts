/**
 * CoinKeeper Neumorphic Banking Color System
 * Modern banking UI with soft pastels and professional accents
 */

export const COLORS = {
  // ===== PRIMARY COLORS (Banking Theme) =====
  // iOS Blue - Primary accent
  primaryBlue: '#007AFF',
  primaryBlueDark: '#0051D5',
  primaryBlueLight: '#4DA2FF',

  // Gradient backgrounds
  backgroundGradientStart: '#E6F0FA',
  backgroundGradientEnd: '#DDEEFF',

  // ===== TEXT COLORS (Banking Theme) =====
  textPrimary: '#1A1A1A',         // Primary text
  textSecondary: '#6B7280',       // Secondary text
  textTertiary: '#9CA3AF',        // Tertiary text
  textOnPrimary: '#FFFFFF',       // White on colored backgrounds
  textOnSurface: '#1A1A1A',       // Black on light surfaces

  // ===== SURFACE COLORS =====
  surfaceLight: '#FFFFFF',        // Cards and elevated surfaces
  surfaceSecondary: '#F4F6F8',    // Secondary surfaces
  surfaceElevated: '#FFFFFF',     // Elevated cards
  surfaceOverlay: 'rgba(255, 255, 255, 0.95)', // Glassmorphism
  surfaceDim: '#F5F6FA',          // Subtle backgrounds

  // ===== ICON COLORS =====
  iconPrimary: '#007AFF',
  iconSecondary: '#4B5563',
  iconTertiary: '#9CA3AF',

  // ===== LEGACY COMPATIBILITY =====
  // Keep old names for backward compatibility
  babyBlue: '#007AFF',
  softPeach: '#FFDAB9',
  mintGreen: '#5FD68A',
  lavender: '#8B7FD9',
  offWhite: '#FFFFFF',
  navyText: '#1A1A1A',
  grayText: '#6B7280',
  lightGray: '#9CA3AF',
  borderGray: '#E5E7EB',
  backgroundGray: '#F5F6FA',
  errorPink: '#FF6B6B',
  infoBLue: '#007AFF',
  warningYellow: '#FFF4CC',

  // Success and Error
  successGreen: '#5FD68A',
  successGreenDark: '#4BC275',
  successGreenLight: '#7FDE9F',
  errorCoral: '#E74C3C',
  errorCoralDark: '#D63031',
  errorCoralLight: '#F08989',
  warningAmber: '#E8A800',

  // ===== GRADIENTS =====
  gradientHero: ['#667EEA', '#764BA2'],
  gradientIncome: ['#5FD68A', '#4ECDC4'],
  gradientExpense: ['#E89AC7', '#C44569'],
  gradientBudget: ['#F5A862', '#E8A800'],
  gradientPrimary: ['#007AFF', '#0051D5'],
  gradientAccent: ['#8B7FD9', '#A599E0'],
  gradientSuccess: ['#5FD68A', '#7FDE9F'],
  gradientBlue: ['#007AFF', '#4DA2FF'],
  gradientPeach: ['#FFDAB9', '#FFD0A6'],
  gradientMint: ['#5FD68A', '#7FDE9F'],
  gradientLavender: ['#8B7FD9', '#A599E0'],
  gradientPinkBlue: ['#FF6B9D', '#007AFF'],

  // Admin gradients
  gradientAdminHero: ['#2C3E50', '#34495E'],
  gradientAdminAlert: ['#E74C3C', '#C0392B'],
  gradientAdminSuccess: ['#27AE60', '#229954'],
  gradientAdminNeutral: ['#7F8C8D', '#95A5A6'],

  // ===== CATEGORY COLORS =====
  categories: {
    food: '#E8A800',
    transport: '#007AFF',
    shopping: '#E89AC7',
    entertainment: '#8B7FD9',
    bills: '#F5A862',
    health: '#5FD68A',
    education: '#4DA2FF',
    others: '#9CA3AF',
  },

  // ===== BACKGROUND & SURFACE =====
  background: '#E6F0FA',
  surface: '#FFFFFF',
  overlay: 'rgba(26, 29, 41, 0.65)',
  scrim: 'rgba(0, 0, 0, 0.48)',

  // ===== BORDER & DIVIDER =====
  border: '#E5E7EB',
  borderLight: 'rgba(120, 120, 150, 0.12)',
  divider: 'rgba(120, 120, 150, 0.08)',

  // ===== CHART COLORS =====
  chartColors: [
    '#007AFF',
    '#8B7FD9',
    '#5FD68A',
    '#FFB84D',
    '#FF6B9D',
    '#4ECDC4',
    '#FFA07A',
    '#A599E0',
  ],

  // ===== SEMANTIC COLORS =====
  semantic: {
    info: '#007AFF',
    success: '#5FD68A',
    warning: '#FFB84D',
    error: '#FF6B6B',
    neutral: '#9CA3AF',
  },

  // ===== ELEVATION TINTS =====
  elevation: {
    level0: 'rgba(0, 122, 255, 0)',
    level1: 'rgba(0, 122, 255, 0.05)',
    level2: 'rgba(0, 122, 255, 0.08)',
    level3: 'rgba(0, 122, 255, 0.11)',
    level4: 'rgba(0, 122, 255, 0.12)',
    level5: 'rgba(0, 122, 255, 0.14)',
  },

  // ===== NEUMORPHIC SHADOWS =====
  neumorphic: {
    shadow: 'rgba(0, 0, 0, 0.1)',
    highlight: 'rgba(255, 255, 255, 0.6)',
  },
};

export type ColorType = keyof typeof COLORS;

// Color utility functions
export const hexToRGBA = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getContrastText = (backgroundColor: string): string => {
  // Simple luminance check - return white or black text
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? COLORS.textPrimary : COLORS.textOnPrimary;
};
