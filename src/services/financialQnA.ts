import { Money } from '../utils/money';
import type { FinancialContext } from './FinancialContextService';

export interface StructuredReply {
  title: string;
  body: string;
  /** Route the UI can offer as a follow-up, when one is relevant. */
  action?: string;
}

const inr = (paise: number): string => Money.format(paise, { zeroDecimals: true });

type Intent = 'expenses' | 'income' | 'affordability' | 'bills' | 'balance' | 'categories';

/**
 * Keyword sets, most specific first. Deliberately not a model: the question
 * space here is small and closed, and a wrong-but-confident answer about
 * someone's money is worse than an honest "I can't answer that".
 */
const INTENTS: { intent: Intent; keywords: string[] }[] = [
  { intent: 'affordability', keywords: ['afford', 'safe to spend', 'can i spend', 'should i buy'] },
  { intent: 'bills', keywords: ['bill', 'due', 'owe', 'owing', 'upcoming'] },
  { intent: 'balance', keywords: ['balance', 'how much do i have', 'in my account'] },
  { intent: 'income', keywords: ['income', 'earn', 'salary', 'paid me', 'came in'] },
  { intent: 'categories', keywords: ['where does', 'where did', 'category', 'categories', 'biggest', 'most on', 'top spend'] },
  { intent: 'expenses', keywords: ['spent', 'spend', 'expense', 'expenses', 'outgoing'] },
];

const classify = (question: string): Intent | null => {
  const q = question.toLowerCase();
  for (const { intent, keywords } of INTENTS) {
    if (keywords.some(k => q.includes(k))) return intent;
  }
  return null;
};

const topCategory = (ctx: FinancialContext): { name: string; paise: number } | null => {
  const totals = new Map<string, number>();
  for (const tx of ctx.recentTransactions) {
    const name = tx.category || 'Uncategorised';
    totals.set(name, (totals.get(name) ?? 0) + tx.amountPaise);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return ranked.length ? { name: ranked[0][0], paise: ranked[0][1] } : null;
};

const UNKNOWN: StructuredReply = {
  title: "I can't answer that",
  body:
    'I only read what is in this app, so I can answer questions about your spending, ' +
    'income, bills, balance and safe-to-spend. I have no view of markets, other ' +
    'accounts, or the future.',
};

/**
 * Answers a question using only figures already computed from the local
 * ledger. Every number returned is traceable to a row in the database — the
 * function never estimates and never speculates.
 */
export const answerFinancialQuestion = (
  question: string,
  ctx: FinancialContext,
): StructuredReply => {
  switch (classify(question)) {
    case 'expenses':
      return {
        title: 'Spending this month',
        body: `You have spent ${inr(ctx.monthlyExpensesPaise)} so far this month.`,
        action: 'Reports',
      };

    case 'income':
      return {
        title: 'Income this month',
        body: `${inr(ctx.monthlyIncomePaise)} has come in this month.`,
        action: 'IncomeDetail',
      };

    case 'affordability':
      return {
        title: 'Safe to spend',
        body:
          `You have ${inr(ctx.safeToSpendPaise)} left to spend this month after ` +
          `your plan and upcoming bills. Anything beyond that comes out of savings.`,
        action: 'Budget',
      };

    case 'bills':
      return {
        title: 'Bills',
        body:
          ctx.upcomingBillsPaise > 0
            ? `${inr(ctx.upcomingBillsPaise)} of bills is still unpaid this cycle.`
            : 'No bills are outstanding this cycle.',
        action: 'Bills',
      };

    case 'balance':
      return {
        title: 'Balance',
        body: `Your tracked accounts hold ${inr(ctx.totalBalancePaise)}.`,
        action: 'Reports',
      };

    case 'categories': {
      const top = topCategory(ctx);
      return {
        title: 'Where your money goes',
        body: top
          ? `Your largest recent category is ${top.name}, at ${inr(top.paise)}.`
          : 'No transactions recorded yet, so there is nothing to break down.',
        action: 'Categories',
      };
    }

    default:
      return UNKNOWN;
  }
};
