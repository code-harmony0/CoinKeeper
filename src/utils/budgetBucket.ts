export type BudgetBucket = 'needs' | 'wants' | 'savings';

const NEEDS_KEYWORDS = [
  'rent', 'mortgage', 'emi', 'grocer', 'utilit', 'insurance', 'electric',
  'water bill', 'gas bill', 'medical', 'health', 'loan', 'education', 'school',
  'tuition', 'fee', 'transport', 'fuel',
];

const SAVINGS_KEYWORDS = [
  'invest', 'saving', 'goal', 'mutual fund', 'sip', 'deposit', 'retirement', 'emergency fund',
];

/**
 * Best-effort default classification for existing/newly-created categories —
 * a starting point the user can always override in the category editor, not
 * a source of truth. Savings checked first since "Emergency Fund" contains
 * no needs keyword but should never fall through to needs/wants.
 */
export const classifyBudgetBucket = (categoryName: string): BudgetBucket => {
  const name = categoryName.toLowerCase();
  if (SAVINGS_KEYWORDS.some(k => name.includes(k))) return 'savings';
  if (NEEDS_KEYWORDS.some(k => name.includes(k))) return 'needs';
  return 'wants';
};
