import { Transaction } from '../types/transaction';

/**
 * A transaction needs review when nothing says what it was for — an SMS
 * import the resolver could not place, or an entry saved without a category.
 * Money that is not categorised silently falls out of budgets and reports.
 */
export const needsReview = (tx: Transaction): boolean => {
  if (tx.type === 'transfer_to_goal') return false;
  const name = (tx.category ?? '').trim().toLowerCase();
  return name === '' || name === 'unknown' || tx.categoryId === 'unknown';
};
