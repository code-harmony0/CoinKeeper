/**
 * Exact icon-tint pairs and logout-button colors from AdminSettingsScreen —
 * the canonical settings-screen palette, extracted directly from that file
 * so admin and user Settings never drift apart. Each pair is a light pastel
 * background + a matching deep/saturated icon color for the same hue.
 */

export interface TintPair {
  light: { bg: string; icon: string };
  dark: { bg: string; icon: string };
}

export const SETTINGS_TINTS = {
  green: { light: { bg: '#E8F5E9', icon: '#2E7D32' }, dark: { bg: '#1B3B22', icon: '#4CAF50' } },
  orange: { light: { bg: '#FFF3E0', icon: '#E65100' }, dark: { bg: '#4A3428', icon: '#FFA726' } },
  indigo: { light: { bg: '#E8EAF6', icon: '#3F51B5' }, dark: { bg: '#23204C', icon: '#7B7AEA' } },
  blue: { light: { bg: '#E3F2FD', icon: '#1565C0' }, dark: { bg: '#1A2F4C', icon: '#4DA2FF' } },
  purple: { light: { bg: '#F3E5F5', icon: '#7B1FA2' }, dark: { bg: '#321F3A', icon: '#BA68C8' } },
  teal: { light: { bg: '#E0F2F1', icon: '#00796B' }, dark: { bg: '#173C38', icon: '#26A69A' } },
  amber: { light: { bg: '#FFF8E1', icon: '#F9A825' }, dark: { bg: '#403B26', icon: '#FBC02D' } },
} satisfies Record<string, TintPair>;

export type SettingsTintName = keyof typeof SETTINGS_TINTS;

// Logout — a separate destructive treatment, not the primary accent.
export const LOGOUT_COLORS = {
  light: { bg: '#FFEBEE', text: '#C62828' },
  dark: { bg: '#2D1F1F', text: '#C62828' },
};

// Icon container shape — rounded SQUARE, not a circle. 40x40, radius 12.
export const ICON_CONTAINER_SIZE = 40;
export const ICON_CONTAINER_RADIUS = 12;

// Settings card shadow — softer than the app's default cardShadow.
export const SETTINGS_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
