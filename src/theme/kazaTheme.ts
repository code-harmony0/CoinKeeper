/**
 * Kaza uses the app-wide design system (specTheme, DESIGN.md §11). The only
 * Kaza-specific piece is which palette tint each prayer wears, so the list
 * reads as a day arc: dawn, midday, afternoon, dusk, night.
 */
export { useSpecTheme as useKazaTheme } from './specTheme';

export type PrayerTint = 'lavender' | 'pink' | 'mint' | 'peach' | 'sky';

export const PRAYER_TINT: Record<string, PrayerTint> = {
  Fajr: 'lavender',
  Dhuhr: 'sky',
  Asr: 'peach',
  Maghrib: 'pink',
  Isha: 'mint',
  Witr: 'lavender',
};
