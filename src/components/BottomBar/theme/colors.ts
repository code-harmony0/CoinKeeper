export type TabKey = 'home' | 'groups' | 'activity' | 'approvals' | 'settings';

export interface TabTheme {
  background: string;
  barFill: string;
  iconInactive: string;
  iconActive: string;
  fabFill: string;
}

export const TAB_THEMES: Record<TabKey, TabTheme> = {
  home: {
    background: '#C2DFF7',
    barFill: '#FFFFFF',
    iconInactive: 'rgba(0,0,0,0.25)',
    iconActive: '#121723',
    fabFill: '#121723',
  },
  groups: {
    background: '#D8E2FA',
    barFill: '#FFFFFF',
    iconInactive: 'rgba(0,0,0,0.25)',
    iconActive: '#121723',
    fabFill: '#121723',
  },
  activity: {
    background: '#CFD9F1',
    barFill: '#FFFFFF',
    iconInactive: 'rgba(0,0,0,0.25)',
    iconActive: '#121723',
    fabFill: '#121723',
  },
  approvals: {
    background: '#CFD9F1',
    barFill: '#FFFFFF',
    iconInactive: 'rgba(0,0,0,0.25)',
    iconActive: '#121723',
    fabFill: '#121723',
  },
  settings: {
    background: '#C2DFF7',
    barFill: '#FFFFFF',
    iconInactive: 'rgba(0,0,0,0.25)',
    iconActive: '#121723',
    fabFill: '#121723',
  },
};

export const TAB_KEYS: TabKey[] = ['home', 'groups', 'activity', 'approvals', 'settings'];

export const BACKGROUND_COLORS = TAB_KEYS.map((key) => TAB_THEMES[key].background);

export const BAR_CONSTANTS = {
  HEIGHT: 72,
  CORNER_RADIUS: 28,
  WAVE_RADIUS: 38,
  WAVE_DEPTH: 28,
  FAB_SIZE: 56,
  SHADOW_COLOR: '#121723',
  SHADOW_OPACITY: 0.08,
  SHADOW_RADIUS: 24,
};
