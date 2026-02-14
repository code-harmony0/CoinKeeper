// Theme tokens for futuristic glass dock
export const DOCK_THEME = {
  // Container
  container: {
    bg: 'rgba(255,255,255,0.12)',
    blur: 35,
    border: 'rgba(255,255,255,0.15)',
    radius: 36,
    shadow: 'rgba(0,0,0,0.12)',
    shadowRadius: 32,
    height: 72,
  },
  
  // Tab states
  tab: {
    inactive: {
      scale: 0.85,
      opacity: 0.55,
      iconColor: 'rgba(18, 23, 35, 0.35)',
      size: 42,
    },
    active: {
      scale: 1.2,
      opacity: 1,
      iconColor: '#121723',
      size: 52,
      glowStrength: 0.35,
    },
    center: {
      scale: 1.35,
      size: 58,
      elevated: -8,
    },
  },
  
  // Tooltip
  tooltip: {
    bg: 'rgba(255,255,255,0.85)',
    blur: 20,
    radius: 12,
    padding: { h: 14, v: 8 },
    offset: -48,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  
  // Per-tab accent colors (neon glow)
  accents: ['#B5FFE8', '#FFC8F3', '#BCF2FF', '#F1FF8F', '#D9B3FF'] as const,
  
  // Screen backgrounds
  backgrounds: ['#C2DFF7', '#D8E2FA', '#CFD9F1', '#E8DFF5', '#C2DFF7'] as const,
};

export type TabKey = 'home' | 'wallet' | 'center' | 'activity' | 'profile';
export const TABS: TabKey[] = ['home', 'wallet', 'center', 'activity', 'profile'];

export const TAB_LABELS: Record<TabKey, string> = {
  home: 'Home',
  wallet: 'Wallet',
  center: 'Actions',
  activity: 'Activity',
  profile: 'Profile',
};
