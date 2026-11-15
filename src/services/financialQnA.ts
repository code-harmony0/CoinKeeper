import { Money } from '../utils/money';
import type { FinancialContext } from './FinancialContextService';
import { TOPIC_IDS, findTopic, hasLearnCue, topicById } from './knowledge/financeKnowledge';

export interface StructuredReply {
  title: string;
  body: string;
  /** Route the UI can offer as a follow-up, when one is relevant. */
  action?: string;
}

const inr = (paise: number): string => Money.format(paise, { zeroDecimals: true });

export type Intent =
  | 'expenses'
  | 'income'
  | 'affordability'
  | 'bills'
  | 'balance'
  | 'categories'
  | 'advice'
  | 'greeting';

/** Every intent the app can answer. The on-device model may only pick from this list. */
export const INTENT_NAMES: Intent[] = [
  'expenses',
  'income',
  'affordability',
  'bills',
  'balance',
  'categories',
  'advice',
  'greeting',
];

/**
 * Keyword sets, most specific first. Deliberately not a model: the question
 * space here is small and closed, and a wrong-but-confident answer about
 * someone's money is worse than an honest "I can't answer that".
 */
const INTENTS: { intent: Intent; keywords: string[] }[] = [
  { intent: 'affordability', keywords: ['afford', 'safe to spend', 'can i spend', 'should i buy'] },
  { intent: 'advice', keywords: ['improve', 'advice', 'tip', 'save more', 'reduce', 'cut down', 'habit', 'habbit', 'budget better', 'how can i'] },
  { intent: 'bills', keywords: ['bill', 'due', 'owe', 'owing', 'upcoming'] },
  { intent: 'balance', keywords: ['balance', 'how much do i have', 'in my account'] },
  { intent: 'income', keywords: ['income', 'earn', 'salary', 'paid me', 'came in'] },
  { intent: 'categories', keywords: ['where does', 'where did', 'category', 'categories', 'biggest', 'most on', 'top spend'] },
  { intent: 'greeting', keywords: ['hello', 'thanks', 'thank you', 'good morning', 'good evening'] },
  { intent: 'expenses', keywords: ['spent', 'spend', 'expense', 'expenses', 'outgoing'] },
];

/** Whole-word greetings, so "hey" matches but "they" does not. */
const GREETING = /^\s*(hi|hey|hello|yo|hola|namaste|sup)\b/i;

export const classifyQuestion = (question: string): Intent | null => {
  if (GREETING.test(question)) return 'greeting';
  const q = question.toLowerCase();
  for (const { intent, keywords } of INTENTS) {
    if (keywords.some(k => q.includes(k))) return intent;
  }
  return null;
};

const topCategory = (ctx: FinancialContext): { name: string; paise: number } | null => {
  const totals = new Map<string, number>();
  // Spending only: a salary is not a category you can trim.
  for (const tx of ctx.recentTransactions.filter(t => !t.type || t.type === 'expense')) {
    const name = tx.category || 'Uncategorised';
    totals.set(name, (totals.get(name) ?? 0) + tx.amountPaise);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return ranked.length ? { name: ranked[0][0], paise: ranked[0][1] } : null;
};


const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * Tips built only from the user's own figures. Each sentence is a fact from the
 * ledger plus a plain suggestion; with too little data it says so.
 */
const adviceReply = (ctx: FinancialContext): StructuredReply => {
  const lines: string[] = [];
  const top = topCategory(ctx);
  const recentTotal = ctx.recentTransactions.filter(t => !t.type || t.type === 'expense').reduce((sum, t) => sum + t.amountPaise, 0);

  if (ctx.monthlyIncomePaise > 0 && ctx.monthlyExpensesPaise > 0) {
    const share = pct(ctx.monthlyExpensesPaise, ctx.monthlyIncomePaise);
    lines.push(
      share >= 80
        ? `You have spent ${share}% of what came in this month, so there is little room left. Pausing one non-essential purchase this week would help most.`
        : `You have spent ${share}% of what came in this month, which leaves room to save.`,
    );
  }
  if (top && recentTotal > 0) {
    lines.push(
      `${top.name} is your biggest recent category at ${inr(top.paise)} (${pct(top.paise, recentTotal)}% of your latest spending). That is the easiest place to trim.`,
    );
  }
  if (ctx.upcomingBillsPaise > 0) {
    lines.push(`${inr(ctx.upcomingBillsPaise)} of bills is still unpaid. Paying on time avoids surprises.`);
  }
  if (lines.length === 0) {
    return {
      title: 'Not enough yet',
      body: 'Add a few expenses and your income, and I can point out where to save.',
      action: 'Add',
    };
  }
  return { title: 'Where you can improve', body: lines.join(' '), action: 'Reports' };
};

const greetingReply = (ctx: FinancialContext): StructuredReply => ({
  title: 'Hi',
  body:
    ctx.monthlyExpensesPaise > 0
      ? `You have spent ${inr(ctx.monthlyExpensesPaise)} this month and ${inr(ctx.safeToSpendPaise)} is safe to spend. Ask me about spending, bills, income or how to improve.`
      : 'Ask me about your spending, bills, income, or how to improve.',
});

export const UNKNOWN: StructuredReply = {
  title: "I can't answer that",
  body:
    'I only read what is in this app. Try: "How much did I spend?", "Where did my money go?", ' +
    '"What bills are due?" or "How can I improve?". I have no view of markets, other accounts, or the future.',
};

/**
 * Answers a question using only figures already computed from the local
 * ledger. Every number returned is traceable to a row in the database — the
 * function never estimates and never speculates.
 */
export const answerIntent = (intent: Intent | null, ctx: FinancialContext): StructuredReply => {
  switch (intent) {
    case 'advice':
      return adviceReply(ctx);

    case 'greeting':
      return greetingReply(ctx);

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

/** Keyword answer only; AIProvider adds the on-device model for questions this cannot place. */
export const answerFinancialQuestion = (question: string, ctx: FinancialContext): StructuredReply =>
  answerIntent(classifyQuestion(question), ctx);

/** Everything a question can be routed to: the app's own numbers, or a guide topic. */
export type Label = Intent | string;
export const ALL_LABELS: string[] = [...INTENT_NAMES, ...TOPIC_IDS];

/**
 * Keyword routing. A guide topic wins when the person is asking to learn
 * ("what is a SIP") or nothing else matched; "how much EMI did I pay" still
 * goes to their own numbers.
 */
export const routeQuestion = (question: string): Label | null => {
  const intent = classifyQuestion(question);
  const topic = findTopic(question);
  if (topic && (hasLearnCue(question) || !intent)) return topic.id;
  return intent;
};

const topicReply = (id: string, ctx: FinancialContext): StructuredReply | null => {
  const topic = topicById(id);
  if (!topic) return null;
  let personal = '';
  // One line tied to their own figures where it genuinely helps.
  if (id === 'emergency_fund' && ctx.monthlyExpensesPaise > 0) {
    personal = ` Using what you have spent so far this month (${inr(ctx.monthlyExpensesPaise)}), that would be ${inr(ctx.monthlyExpensesPaise * 3)} to ${inr(ctx.monthlyExpensesPaise * 6)}. It becomes more accurate as the month fills in.`;
  }
  if (id === 'budget_50_30_20' && ctx.monthlyIncomePaise > 0) {
    personal = ` On ${inr(ctx.monthlyIncomePaise)} coming in, that is about ${inr(Math.round(ctx.monthlyIncomePaise * 0.5))} for needs, ${inr(Math.round(ctx.monthlyIncomePaise * 0.3))} for wants and ${inr(Math.round(ctx.monthlyIncomePaise * 0.2))} for savings.`;
  }
  return { title: topic.title, body: topic.body + personal, action: id === 'chit_funds' ? 'Groups' : undefined };
};

export const answerLabel = (label: Label | null, ctx: FinancialContext): StructuredReply =>
  (label && topicReply(label, ctx)) || answerIntent(label as Intent | null, ctx);
