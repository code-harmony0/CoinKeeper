import { FinancialContextService } from './FinancialContextService';

export const AIProvider = {
  /**
   * Mocks a call to an LLM, returning a structured JSON response.
   * In production, this would call fetch('https://api.openai.com/...').
   */
  async askQuestion(prompt: string): Promise<any> {
    const context = await FinancialContextService.buildContext();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Basic heuristic mock response based on the structured context
    return {
      structuredReply: {
        title: "Financial Analysis",
        body: `Based on your recent transactions, you have spent ₹${(context.monthlyExpensesPaise / 100).toLocaleString()} this month. Your safe-to-spend balance is ₹${(context.safeToSpendPaise / 100).toLocaleString()} after accounting for upcoming bills.`,
        action: "View Budget"
      }
    };
  }
};
