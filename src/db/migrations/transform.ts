/**
 * Pure row-transform helpers used by 002_finance.ts. Kept separate from the
 * migration runner so they can be unit tested without a real database — op-
 * sqlite is a native JSI module with no Jest-safe mock, so anything that
 * needs a live `db` handle can only be verified on a real device/emulator.
 * These functions are the part of the migration that CAN be honestly tested.
 */

export type LegacyType = 'income' | 'expense' | 'debit' | 'credit' | string;

/** personal_transactions used 'debit'/'credit'; transactions used 'income'/'expense'. Unify. */
export const mapLegacyType = (raw: LegacyType): 'income' | 'expense' => {
  if (raw === 'debit' || raw === 'expense') return 'expense';
  return 'income';
};

/**
 * Legacy `date` columns are ISO strings from `new Date().toISOString()`.
 * Returns unix ms, or null if the row's date can't be parsed — callers must
 * skip rows that return null rather than silently coercing to "now", which
 * would corrupt trend/budget math exactly the way the plan's own critique
 * of the SMS parser (Task 5.2) warns against.
 */
export const parseOccurredAt = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const ms = Date.parse(dateStr);
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Converts a legacy REAL rupee amount to integer paise. Returns null for
 * non-finite or non-positive values — the new schema's
 * CHECK (amount_paise > 0) would reject them anyway, and a migration must
 * not crash on one bad legacy row; it should skip and let the caller log it.
 */
export const toPaiseFromLegacyAmount = (amount: number | null | undefined): number | null => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
};

/** Normalizes a free-text category name for case-insensitive de-duplication. */
export const normalizeCategoryName = (name: string | null | undefined): string =>
  (name ?? 'Other').trim() || 'Other';
