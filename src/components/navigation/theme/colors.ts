// Theme tokens for expanding bottom tab
export const TAB_COLORS = {
  // Screen backgrounds per tab
  backgrounds: ['#C2DFF7', '#E8D5F2', '#D4F5E9', '#FFE5D9'] as const,
  
  // Tab accent colors (distinct pastels)
  accents: ['#A8D8EA', '#E2B6CF', '#98E4C1', '#FFD4B8'] as const,
  
  // Active tab
  activeBg: 'rgba(255,255,255,0.95)',
  activeIcon: '#121723',
  activeText: '#121723',
  
  // Inactive tab
  inactiveBg: 'rgba(255,255,255,0.40)',
  inactiveIcon: 'rgba(18, 23, 35, 0.4)',
  
  // Bar
  barBg: 'rgba(255,255,255,0.85)',
  barShadow: 'rgba(18, 23, 35, 0.12)',
  barBorder: 'rgba(255,255,255,0.25)',
};

export type TabKey = 'home' | 'groups' | 'approve' | 'settings';
export const TABS: TabKey[] = ['home', 'groups', 'approve', 'settings'];

export const TAB_LABELS: Record<TabKey, string> = {
  home: 'Home',
  groups: 'Groups',
  approve: 'Approve',
  settings: 'Settings',
};

// Animation configs
export const SPRING_CONFIG = {
  stiffness: 180,
  damping: 16,
};

export const TIMING_CONFIG = {
  labelFade: 120,
  labelSlide: 120,
};

// Sizing
export const TAB_SIZING = {
  expandedWidth: 115,
  collapsedWidth: 52,
  height: 48,
  expandedRadius: 24,
  collapsedRadius: 26,
  iconSize: 22,
  labelSize: 13,
  labelWeight: '700' as const,
  letterSpacing: -0.3,
};
