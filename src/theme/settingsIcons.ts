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

// One neutral ink tile for every settings row (v5): the icon says what the row
// is, so the rainbow of pastel tints is gone. The names stay so call sites keep
// working.
const INK_TILE: TintPair = {
  light: { bg: '#111111', icon: '#FFFFFF' },
  dark: { bg: '#2A2D35', icon: '#FFFFFF' },
};

export const SETTINGS_TINTS = {
  green: INK_TILE,
  orange: INK_TILE,
  indigo: INK_TILE,
  blue: INK_TILE,
  purple: INK_TILE,
  teal: INK_TILE,
  amber: INK_TILE,
} satisfies Record<string, TintPair>;

export type SettingsTintName = keyof typeof SETTINGS_TINTS;

// Logout — a separate destructive treatment, not the primary accent.
export const LOGOUT_COLORS = {
  light: { bg: '#FFEBEE', text: '#C62828' },
  dark: { bg: '#2D1F1F', text: '#C62828' },
};

// Icon container shape — rounded SQUARE, not a circle. 40x40, radius 12.
export const ICON_CONTAINER_SIZE = 48;
export const ICON_CONTAINER_RADIUS = 12;

// Settings card shadow — softer than the app's default cardShadow.
export const SETTINGS_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
