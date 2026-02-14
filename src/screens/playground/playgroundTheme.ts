export const PLAYGROUND_THEME = {
  colors: {
    bgBlue1: '#C2DFF7',
    bgBlue2: '#D8E2FA',
    bgBlue3: '#CFD9F1',
    inkDark: '#121723',
    surface: '#FFFFFF',
    surfaceGlass: 'rgba(255, 255, 255, 0.75)',
    textSecondary: '#5A6B7C',
    accent: '#6366F1',
    mint: '#A8E6CF',
    error: '#EF4444',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 50,
  },
  shadow: {
    light: {
      shadowColor: '#121723',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 4,
    },
    medium: {
      shadowColor: '#121723',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

export type TabName = 'home' | 'groups' | 'fab' | 'approvals' | 'settings';

export const TABS: TabName[] = ['home', 'groups', 'fab', 'approvals', 'settings'];
