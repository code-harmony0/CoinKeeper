/**
 * How a category name is written on screen.
 *
 * The ledger stores categories lowercase, and uses the sentinel `unknown` for
 * anything uncategorised. Three surfaces each grew their own private copy of
 * the title-casing rule — and the transactions list never got one at all, so
 * it showed a raw "unknown" under every uncategorised row while the home
 * screen showed "Uncategorized" for the same transactions.
 *
 * One function, every surface.
 */
export const categoryLabel = (name: string | null | undefined): string => {
  const raw = (name ?? '').trim();
  if (raw.length === 0) return 'Uncategorized';
  // The sentinel is a storage detail, not a word to show a user.
  if (raw.toLowerCase() === 'unknown') return 'Uncategorized';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};
