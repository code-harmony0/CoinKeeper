/**
 * Reviewed money-basics guide that ships inside the app.
 *
 * Why this exists instead of letting a 270M model "know" finance: a model that
 * small states wrong facts with full confidence. Here the model only decides
 * WHICH topic a question is about; the words the person reads are written and
 * reviewed in this file. Everything is evergreen: no tax slabs, interest rates
 * or limits that change, and no product recommendations.
 */
export interface Topic {
  id: string;
  title: string;
  /** Lower-case phrases; any match selects the topic. Include common misspellings and Hinglish. */
  keywords: string[];
  body: string;
}

export const TOPICS: Topic[] = [
  {
    id: 'budget_50_30_20',
    title: 'The 50/30/20 rule',
    keywords: ['50/30/20', '50 30 20', 'budget rule', 'how to budget', 'budgeting', 'budget kaise'],
    body:
      'A simple way to split what you earn: about half for needs (rent, food, bills), about 30% for wants, and about 20% for savings. ' +
      'It is a starting point, not a law. If your rent is high, shift the split and keep savings the last thing you cut.',
  },
  {
    id: 'emergency_fund',
    title: 'Emergency fund',
    keywords: ['emergency fund', 'emergency savings', 'rainy day', 'emergency money'],
    body:
      'An emergency fund is money set aside only for shocks like a job loss or a medical bill. A common target is 3 to 6 months of your usual spending, ' +
      'kept somewhere safe and easy to reach, not in something that can drop in value.',
  },
  {
    id: 'sip_basics',
    title: 'SIP',
    keywords: ['sip', 'systematic investment', 'sip kya'],
    body:
      'A SIP (systematic investment plan) puts a fixed amount into a mutual fund every month. Because you invest on a schedule, you buy more units when prices are low and fewer when high, ' +
      'and you do not have to time the market. Returns are not guaranteed and can be negative in the short term.',
  },
  {
    id: 'mutual_fund_vs_fd',
    title: 'Mutual fund vs fixed deposit',
    keywords: ['mutual fund', 'fixed deposit', ' fd ', 'fd vs', 'fd or'],
    body:
      'A fixed deposit pays a rate set in advance, so it is predictable. A mutual fund pools money into stocks or bonds, so it can grow more but can also fall. ' +
      'Money you need within a few years usually suits the predictable option; money you will not touch for many years can take more ups and downs.',
  },
  {
    id: 'emi_loans',
    title: 'EMIs and loans',
    keywords: ['emi', 'loan', 'borrow', 'interest on loan'],
    body:
      'An EMI is a fixed monthly payment that covers part of the loan and the interest. Early on, most of each EMI is interest. ' +
      'A shorter loan costs less in total interest but has a higher EMI. Many people keep total EMIs under about a third of their monthly income.',
  },
  {
    id: 'credit_score',
    title: 'Credit score',
    keywords: ['credit score', 'cibil', 'credit card score', 'credit report'],
    body:
      'A credit score summarises how reliably you repay. Paying every bill and EMI on time matters most, then keeping card use well below your limit. ' +
      'Applying for many loans in a short time can lower it.',
  },
  {
    id: 'upi_safety',
    title: 'UPI safety',
    keywords: ['upi safe', 'upi scam', 'upi fraud', 'scam', 'fraud', 'phishing', 'qr scam'],
    body:
      'You never enter your UPI PIN to receive money. If someone asks for your PIN, an OTP, or sends a "collect request" you did not expect, decline it. ' +
      'Check the name shown before you pay, and report a fraud to your bank quickly.',
  },
  {
    id: 'chit_funds',
    title: 'Chit funds',
    keywords: ['chit fund', 'chit', 'kuri', 'chitty'],
    body:
      'In a chit fund a group pays a fixed amount every month and, each month, one member receives the pot, decided by auction or draw. ' +
      'Check that the chit is registered, read the foreman\'s terms, and remember that a member who receives early is still bound to keep paying.',
  },
  {
    id: 'insurance_basics',
    title: 'Insurance basics',
    keywords: ['insurance', 'term plan', 'health cover', 'life cover'],
    body:
      'Insurance covers a big, unlikely loss so it cannot wreck your finances. Health insurance covers hospital bills; term life insurance pays your family if you die. ' +
      'Treat it as protection, not as an investment, and compare what is covered before the price.',
  },
  {
    id: 'inflation',
    title: 'Inflation',
    keywords: ['inflation', 'prices rising', 'mehngai'],
    body:
      'Inflation is prices rising over time, so the same money buys less later. Cash sitting idle loses buying power slowly, which is why long-term money is usually invested for growth, not left idle.',
  },
  {
    id: 'saving_vs_investing',
    title: 'Saving vs investing',
    keywords: ['saving vs investing', 'save or invest', 'saving or investing', 'difference between saving'],
    body:
      'Saving means keeping money safe and available for near-term needs. Investing means taking some risk for growth over years. ' +
      'Build an emergency fund first, then invest what you will not need soon.',
  },
  {
    id: 'debt_payoff',
    title: 'Paying off debt',
    keywords: ['pay off debt', 'repay debt', 'clear debt', 'debt free', 'credit card debt'],
    body:
      'Two common methods: pay the highest-interest debt first to save the most money, or clear the smallest balance first for quick wins. ' +
      'Either way, pay at least the minimum on everything and avoid adding new debt while you clear it.',
  },
  {
    id: 'compounding',
    title: 'Compounding',
    keywords: ['compounding', 'compound interest', 'power of compounding'],
    body:
      'Compounding means earning returns on your earlier returns. It is small at first and large after many years, which is why starting early, even with a small amount, helps more than starting late with a big one.',
  },
  {
    id: 'tax_basics',
    title: 'Tax saving',
    keywords: ['save tax', 'tax saving', 'income tax', 'tax kaise', '80c', 'itr'],
    body:
      'Tax rules and limits change, so check the current rules or ask a tax professional. In general, keep your income and investment records, ' +
      'and do not choose an investment only for the tax benefit.',
  },
  {
    id: 'net_worth',
    title: 'Net worth',
    keywords: ['net worth', 'networth'],
    body: 'Net worth is everything you own minus everything you owe. Tracking it every few months shows whether you are moving forward, even when a single month feels flat.',
  },
  {
    id: 'impulse_spending',
    title: 'Impulse spending',
    keywords: ['impulse', 'overspend', 'stop spending', 'spend less', 'control spending', 'kharcha kam'],
    body:
      'Try a 24-hour wait before any non-essential purchase, and unsubscribe from shopping alerts. ' +
      'Set a small weekly "fun" amount you can spend without guilt, so the budget feels realistic.',
  },
  {
    id: 'gold_basics',
    title: 'Gold',
    keywords: ['gold', 'sone', 'sovereign gold', 'gold etf'],
    body:
      'Gold can hold its value over very long periods and often moves differently from stocks, but it pays no income and its price swings. ' +
      'Many people keep only a modest share of their savings in it. Physical gold adds making charges and storage worries; gold funds or bonds avoid those.',
  },
  {
    id: 'rent_vs_buy',
    title: 'Rent or buy a home',
    keywords: ['rent or buy', 'rent vs buy', 'buy a house', 'buy a home', 'buying a home', 'ghar kharidna'],
    body:
      'Buying builds an asset but ties up a large down payment, adds EMI, maintenance and fees, and is hard to undo. Renting keeps you flexible and your savings free to invest. ' +
      'Compare the full monthly cost of owning with rent, and only buy if you plan to stay for many years.',
  },
  {
    id: 'epf_ppf',
    title: 'EPF and PPF',
    keywords: ['epf', 'ppf', 'provident fund', 'pf balance'],
    body:
      'EPF is retirement saving taken from your salary, usually matched by your employer. PPF is a government-backed long-term savings scheme you open yourself. ' +
      'Both lock money for years, so they suit long-term goals, not emergencies. Rates and rules change, so check the current ones.',
  },
  {
    id: 'retirement_basics',
    title: 'Saving for retirement',
    keywords: ['retirement', 'retire', 'pension', 'nps'],
    body:
      'Retirement is the goal where starting early helps most, because the money has decades to grow. Aim to set aside a fixed share of every salary, increase it when you get a raise, ' +
      'and avoid dipping into it for other goals.',
  },
  {
    id: 'credit_card_use',
    title: 'Using a credit card well',
    keywords: ['credit card', 'card bill', 'minimum due', 'card limit'],
    body:
      'A credit card is a short loan. Pay the full statement every month and the interest is avoided; paying only the minimum lets interest build fast. ' +
      'Keep your spending well below your limit and never withdraw cash on it.',
  },
  {
    id: 'stock_basics',
    title: 'Stocks',
    keywords: ['stock market', 'share market', 'what is a stock', 'what are stocks', 'stocks', 'sensex', 'nifty'],
    body:
      'A stock is a small share of ownership in a company. Prices rise and fall, sometimes sharply, so the money should be what you will not need for years. ' +
      'Spreading across many companies, through an index fund for example, lowers the risk of one going wrong.',
  },
  {
    id: 'goal_saving',
    title: 'Saving for a goal',
    keywords: ['save for a goal', 'saving for a goal', 'goal saving', 'save for a trip', 'save for a phone', 'save for wedding', 'sinking fund'],
    body:
      'Divide the goal amount by the months you have to get a monthly number, and set that aside as soon as you are paid. ' +
      'Keep it in a separate place so it does not get spent, and track it in Goals so you can see the progress.',
    },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    keywords: ['subscription', 'subscriptions', ' ott ', 'netflix cost', 'cancel subscription'],
    body:
      'Small recurring charges add up quietly. Once a quarter, list every subscription, cancel what you did not use in the last month, ' +
      'and pick one service from each type instead of several.',
  },
  {
    id: 'why_track',
    title: 'Why track spending',
    keywords: ['why track', 'why should i track', 'why track expenses', 'benefit of tracking'],
    body:
      'You cannot change what you cannot see. Tracking shows where money really goes, which is rarely where you guess, and makes a budget realistic. ' +
      'Even a few weeks of honest records is enough to spot the easy savings.',
  },

];

export const TOPIC_IDS: string[] = TOPICS.map(t => t.id);

const LEARN_CUE = /\b(what is|what's|what are|explain|meaning|tell me about|how does|how do|why|difference|should i|kya hai|kya hota)\b/i;

export const hasLearnCue = (question: string): boolean => LEARN_CUE.test(question);

/** Keyword match against the guide. Padded with spaces so " fd " matches a word, not "afford". */
export const findTopic = (question: string): Topic | null => {
  const q = ` ${question.toLowerCase()} `;
  return TOPICS.find(t => t.keywords.some(k => q.includes(k))) ?? null;
};

export const topicById = (id: string): Topic | null => TOPICS.find(t => t.id === id) ?? null;