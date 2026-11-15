import { answerFinancialQuestion, answerLabel, classifyQuestion, routeQuestion } from '../../src/services/financialQnA';
import type { FinancialContext } from '../../src/services/FinancialContextService';

const context: FinancialContext = {
  totalBalancePaise: 4200000, // ₹42,000
  monthlyIncomePaise: 8000000, // ₹80,000
  monthlyExpensesPaise: 2537500, // ₹25,375
  upcomingBillsPaise: 5000000, // ₹50,000
  safeToSpendPaise: 1200000, // ₹12,000
  recentTransactions: [
    { amountPaise: 120000, merchant: 'Swiggy', category: 'Food', date: '2026-07-14' },
    { amountPaise: 45000, merchant: 'Metro', category: 'Transport', date: '2026-07-13' },
  ],
};

describe('answerFinancialQuestion', () => {
  it('answers how much was spent this month with the real total', () => {
    const reply = answerFinancialQuestion('how much have I spent this month?', context);

    expect(reply.body).toContain('25,375');
  });

  it('answers income questions with the real income total', () => {
    const reply = answerFinancialQuestion('what was my income?', context);

    expect(reply.body).toContain('80,000');
  });

  it('answers affordability questions from safe-to-spend', () => {
    const reply = answerFinancialQuestion('can I afford a new phone?', context);

    expect(reply.body).toContain('12,000');
    expect(reply.action).toBe('Budget');
  });

  it('answers bill questions with what is still owed', () => {
    const reply = answerFinancialQuestion('what bills are due?', context);

    expect(reply.body).toContain('50,000');
    expect(reply.action).toBe('Bills');
  });

  it('answers balance questions from account balances', () => {
    const reply = answerFinancialQuestion('what is my balance?', context);

    expect(reply.body).toContain('42,000');
  });

  it('names the top spending category from recent transactions', () => {
    const reply = answerFinancialQuestion('where does my money go?', context);

    expect(reply.body).toContain('Food');
  });

  it('says plainly that it does not know rather than inventing an answer', () => {
    const reply = answerFinancialQuestion('will bitcoin go up next year?', context);

    expect(reply.title).toBe("I can't answer that");
    expect(reply.body).toMatch(/spending|income|bills/i);
    expect(reply.body).not.toMatch(/\d{2},\d{3}/);
  });

  it('does not claim a bill total when no bills are tracked', () => {
    const reply = answerFinancialQuestion('any bills due?', {
      ...context,
      upcomingBillsPaise: 0,
    });

    expect(reply.body).toMatch(/no bills|nothing/i);
  });

  it('does not name a top category when there are no transactions', () => {
    const reply = answerFinancialQuestion('where does my money go?', {
      ...context,
      recentTransactions: [],
    });

    expect(reply.body).toMatch(/no transactions|nothing recorded/i);
  });

  it('greets back instead of refusing', () => {
    expect(classifyQuestion('hey')).toBe('greeting');
    expect(classifyQuestion('they said no')).not.toBe('greeting');
    expect(answerFinancialQuestion('hey', context).title).toBe('Hi');
  });

  it('gives tips built only from the ledger when asked how to improve', () => {
    const reply = answerFinancialQuestion('Tell me how can I improve it', context);

    expect(reply.title).toBe('Where you can improve');
    expect(reply.body).toContain('Food');
    expect(reply.body).toContain('32%');
  });

  it('treats a misspelt "habbit" as a request for advice', () => {
    expect(classifyQuestion('What is my spending habbit')).toBe('advice');
  });

  it('explains a money concept from the reviewed guide when asked to learn', () => {
    expect(routeQuestion('what is a SIP?')).toBe('sip_basics');
    const reply = answerLabel(routeQuestion('how big should my emergency fund be, explain'), context);
    expect(reply.title).toBe('Emergency fund');
    // Personalised with the real monthly spend (25,375 x 3 = 76,125).
    expect(reply.body).toContain('76,125');
  });

  it('keeps "how much EMI did I pay" on the person\'s own numbers', () => {
    expect(routeQuestion('how much have I spent on emi')).toBe('expenses');
  });

  it('does not mistake "afford" for the FD topic', () => {
    expect(routeQuestion('can I afford a new phone?')).toBe('affordability');
  });

  it('answers the newer guide topics and ignores near-miss words', () => {
    expect(routeQuestion('is gold a good investment')).toBe('gold_basics');
    expect(routeQuestion('should I rent or buy a house')).toBe('rent_vs_buy');
    expect(routeQuestion('what is ppf')).toBe('epf_ppf');
    expect(routeQuestion('someone sent me a bottle')).not.toBe('subscriptions');
  });
});
