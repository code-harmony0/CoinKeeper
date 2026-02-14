/**
 * CoinKeeper Theme - UPDATED COLOR PALETTE
 * Soft blue/lavender gradient backgrounds, dark navy buttons
 */

// ============================================
// COLORS
// ============================================
export const THEME_COLORS = {
  // BACKGROUND GRADIENT COLORS
  background: '#C2DFF7',           // Primary soft blue
  backgroundGradient1: '#D8E2FA',  // Lavender tint
  backgroundGradient2: '#D7F3F4',  // Mint tint
  backgroundGradient3: '#CFD9F1',  // Periwinkle tint
  
  // SURFACES
  surface: '#FFFFFF',
  surfaceTint: '#F0F7FF',
  
  // TEXT
  textPrimary: '#1E2A33',
  textSecondary: '#5A6B7C',
  textMuted: '#94A3B8',
  
  // ACCENTS
  lavender: '#E6DFFD',
  mint: '#A8E6CF',
  peach: '#FFDAB9',
  
  // FUNCTIONAL
  error: '#FFCCD5',
  errorText: '#9B2C2C',
  success: '#A8E6CF',
  successText: '#065F46',
  
  // UI
  border: '#E2E8F0',
  divider: '#F1F5F9',
  shadow: '#1E2A33',
  
  // BUTTONS - Dark Navy
  buttonPrimary: '#121723',
  buttonText: '#FFFFFF',
  
  // ACTIVE
  activeTab: '#E6DFFD',
  accent: '#121723',
};

// ============================================
// TYPOGRAPHY
// ============================================
export const THEME_TYPOGRAPHY = {
  balance: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -1 },
  h1: { fontSize: 26, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const },
};

// ============================================
// SPACING
// ============================================
export const THEME_SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 28,
};

// ============================================
// RADIUS
// ============================================
export const THEME_RADIUS = {
  sm: 14, md: 18, lg: 22, xl: 26, xxl: 30, pill: 50,
};

// ============================================
// SHADOWS
// ============================================
export const THEME_SHADOWS = {
  card: {
    shadowColor: THEME_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  elevated: {
    shadowColor: THEME_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
};

// ============================================
// ANIMATION
// ============================================
export const THEME_ANIMATION = {
  spring: { damping: 18, stiffness: 180, mass: 0.8 },
  scale: { pressed: 0.94, normal: 1 },
};

// ============================================
// ICONS
// ============================================
export const THEME_ICONS = {
  sm: 18, md: 22, lg: 26, xl: 30,
  strokeWidth: 2.2,
};

export const THEME = {
  colors: THEME_COLORS,
  typography: THEME_TYPOGRAPHY,
  spacing: THEME_SPACING,
  radius: THEME_RADIUS,
  shadows: THEME_SHADOWS,
  animation: THEME_ANIMATION,
  icons: THEME_ICONS,
};

export default THEME;
