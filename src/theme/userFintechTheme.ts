export const USER_FINTECH_THEME = {
  colors: {
    background: '#F3F6FA',
    surface: '#FFFFFF',
    surfaceFrosted: 'rgba(255, 255, 255, 0.96)',
    surfaceSubtle: '#F1F5F9',
    border: '#E5E7EB',
    divider: '#E5E7EB',
    overlay: 'rgba(17, 24, 39, 0.32)',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnAccent: '#FFFFFF',
    brandBlue: '#3B82F6',
    brandBlueMuted: '#3B82F6',
    brandBlueSoft: '#EFF6FF',
    positive: '#15803D',
    positiveSoft: '#DCFCE7',
    negative: '#B91C1C',
    negativeSoft: '#FEE2E2',
    warning: '#C2410C',
    warningSoft: '#FEF3C7',
    chartBlue: '#3B82F6',
    chartGreen: '#10B981',
    chartAmber: '#F59E0B',
    chartPurple: '#8B5CF6',
  },
  typography: {
    balance: { fontSize: 44, fontWeight: '600' as const, letterSpacing: -1 },
    sectionTitle: { fontSize: 18, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '500' as const },
    bodySmall: { fontSize: 14, fontWeight: '500' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    label: { fontSize: 12, fontWeight: '500' as const },
    small: { fontSize: 11, fontWeight: '500' as const },
  },
  spacing: {
    x1: 8,
    x2: 16,
    x3: 24,
    x4: 32,
  },
  radius: {
    card: 20,
    cardLarge: 24,
    chip: 12,
    pill: 999,
    button: 12,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
  },
  animation: {
    quick: 120,
    medium: 200,
  },
} as const;

export type UserFintechTheme = typeof USER_FINTECH_THEME;

export default USER_FINTECH_THEME;
