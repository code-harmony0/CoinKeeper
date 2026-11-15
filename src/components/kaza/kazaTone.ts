import { useKazaTheme } from '../../theme/kazaTheme';

/** The accent-rotation tints a flat "bucket" card can wear (DESIGN.md §2/§7). */
export type KazaTint = 'lavender' | 'pink' | 'mint' | 'peach' | 'sky';

/**
 * Colours for content sitting ON a tinted card. Secondary text on a coloured
 * surface is tinted from the foreground, never the grey `textSecondary`,
 * which drops under 4.5:1 on pastel fills.
 */
export const useKazaTone = (tint: KazaTint) => {
  const { colors } = useKazaTheme();
  return {
    bg: colors[tint],
    deep: colors[`${tint}Deep` as const],
    ink: colors.textPrimary,
    /** ~72% of the foreground: readable secondary text on any tint. */
    inkMuted: `${colors.textPrimary}B8`,
    /** A fill track that reads on the tint in light and dark. */
    track: `${colors.card}99`,
    /** A neutral chip that sits on the tint. */
    chip: `${colors.card}B3`,
  };
};
