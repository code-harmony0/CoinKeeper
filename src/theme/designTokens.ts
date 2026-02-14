/**
 * Design Tokens - Finance App UI
 * Based on reference image with soft blue backgrounds and black primary buttons
 */

export const colors = {
  // Background Colors - Soft blue tints
  background: '#D4E7F4',           // Main background (soft blue)
  backgroundLight: '#E3EEF7',      // Lighter variant
  backgroundSecondary: '#F0F5FB',
  backgroundGradient: ['#D4E7F4', '#E3EEF7'],

  // Card & Surface - Pure white
  card: '#FFFFFF',
  cardSecondary: '#F7FAFC',
  cardTinted: '#EBF4FB',

  // Primary Action - BLACK (key change from previous design)
  primary: '#000000',
  primaryHover: '#1A1A1A',
  primaryLight: '#333333',
  primaryDark: '#000000',

  // Accent - Soft Blue
  accent: '#7BA5C9',
  accentLight: '#A8C5E8',
  accentMuted: '#D4E7F4',

  // Success - Muted Soft Green (reduced saturation)
  success: '#5FD68A',
  successLight: '#88E3A8',
  successMuted: '#C7EDDA',

  // Warning - Muted Orange (reduced brightness)
  warning: '#E8A800',
  warningLight: '#F5C05A',
  warningMuted: '#FFEBC7',

  // Error - Muted Coral (reduced saturation)
  error: '#E74C3C',
  errorLight: '#F08989',
  errorMuted: '#F7C5C5',
  errorBackground: '#FFF5F5',

  // Text Colors
  textPrimary: '#000000',          // Black for primary text
  textSecondary: '#4A5568',        // Dark gray
  textTertiary: '#A0AEC0',         // Medium gray
  textMuted: '#CBD5E0',            // Light gray
  textOnPrimary: '#FFFFFF',        // White on black buttons
  textOnCard: '#000000',

  // Pill Buttons - White backgrounds
  pillBackground: '#FFFFFF',
  pillBackgroundBlue: '#E3EEF7',
  pillBackgroundMint: '#E6F7F0',
  pillBackgroundOrange: '#FFF5E6',
  pillBorder: '#E2E8F0',
  pillActive: '#000000',

  // Balance Display
  balanceBackground: '#D4E7F4',
  balanceText: '#000000',
  balanceDecimal: '#718096',       // Lighter for decimal part

  // Icon Backgrounds - Subtle tints
  iconBackgroundBlue: '#E3EEF7',
  iconBackgroundGreen: '#E6F7F0',
  iconBackgroundOrange: '#FFF5E6',
  iconBackgroundPurple: '#EDE9FE',

  // Shadows - Ultra subtle (reference image style)
  shadow: 'rgba(0, 0, 0, 0.04)',        // Barely visible
  shadowMedium: 'rgba(0, 0, 0, 0.06)',  // Very subtle
  shadowDark: 'rgba(0, 0, 0, 0.08)',    // Subtle
  shadowLight: 'rgba(0, 0, 0, 0.02)',   // Almost invisible

  // Pure colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

/**
 * Spacing System - 4dp Grid
 */
export const spacing = {
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

/**
 * Typography System
 */
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Font sizes
  sizes: {
    xs: 12,
    s: 14,
    m: 16,
    l: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,      // For large balance numbers
    huge: 64,         // Extra large
  },

  // Predefined text styles
  display: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
    letterSpacing: -1,
    color: colors.textPrimary,
  },

  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },

  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.textPrimary,
  },

  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.textPrimary,
  },

  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.textSecondary,
  },

  bodyMedium: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: colors.textSecondary,
  },

  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
  },

  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.textTertiary,
  },

  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.5,
  },

  // Specific styles from reference
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
    letterSpacing: -1,
    color: colors.textPrimary,
  },

  balanceLabel: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
  },
};

/**
 * Border Radius
 */
export const radii = {
  xs: 8,
  s: 12,
  m: 16,
  l: 20,
  card: 24,        // Standard card radius
  cardLarge: 28,
  pill: 100,       // Fully rounded pills
  round: 999,
  button: 20,      // Button radius (from reference)
};

/**
 * Shadow System - Ultra subtle (reference image style)
 * Barely visible drop shadows that create depth without being obvious
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // Smallest shadow - almost invisible
  xs: {
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },

  // Small shadow - barely visible
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // Card shadow - very subtle (reference image style)
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  // Medium shadow - subtle
  md: {
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Large shadow - noticeable but not harsh
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  // Button shadow - for interactive elements
  button: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Floating shadow - for FAB and modals
  floating: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
};

/**
 * Animation Configurations
 */
export const animation = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  spring: {
    gentle: {
      damping: 20,
      stiffness: 120,
    },
    bouncy: {
      damping: 15,
      stiffness: 200,
    },
    snappy: {
      damping: 18,
      stiffness: 180,
    },
  },
};

/**
 * Icon Sizes
 */
export const iconSizes = {
  xs: 16,
  s: 20,
  m: 24,
  l: 28,
  xl: 32,
  xxl: 40,
};
