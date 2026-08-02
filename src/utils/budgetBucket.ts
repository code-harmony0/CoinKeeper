export type BudgetBucket = 'needs' | 'wants' | 'savings';

const NEEDS_KEYWORDS = [
  'rent', 'mortgage', 'emi', 'grocer', 'utilit', 'insurance', 'electric',
  'water bill', 'gas bill', 'medical', 'health', 'loan', 'education', 'school',
  'tuition', 'fee', 'transport', 'fuel',
];

const SAVINGS_KEYWORDS = [
  'invest', 'saving', 'goal', 'mutual fund', 'sip', 'deposit', 'retirement', 'emergency fund',
];

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True if `name` contains `keyword` starting at a word boundary. Left-boundary
 * only (not `\bkeyword\b`) so stems like "grocer" still match "groceries" and
 * "electric" still matches "electricity" — but "fee" no longer matches inside
 * "coffee", since there's no boundary before the "fee" substring there.
 */
const hasKeywordAt = (name: string, keyword: string): boolean =>
  new RegExp(`\\b${escapeRegExp(keyword)}`).test(name);

/**
 * Best-effort default classification for existing/newly-created categories —
 * a starting point the user can always override in the category editor, not
 * a source of truth. Savings checked first since "Emergency Fund" contains
 * no needs keyword but should never fall through to needs/wants.
 */
export const classifyBudgetBucket = (categoryName: string): BudgetBucket => {
  const name = categoryName.toLowerCase();
  if (SAVINGS_KEYWORDS.some(k => hasKeywordAt(name, k))) return 'savings';
  if (NEEDS_KEYWORDS.some(k => hasKeywordAt(name, k))) return 'needs';
  return 'wants';
};
