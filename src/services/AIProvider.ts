import { FinancialContextService } from './FinancialContextService';
import { answerFinancialQuestion, type StructuredReply } from './financialQnA';

export const AIProvider = {
  /**
   * Answers a question about the user's money.
   *
   * Runs entirely on-device against the local ledger — nothing is sent
   * anywhere, and every figure in the reply is read from the database rather
   * than generated. Questions outside what the ledger can answer get an
   * explicit "I can't answer that".
   */
  async askQuestion(question: string): Promise<{ structuredReply: StructuredReply }> {
    const context = await FinancialContextService.buildContext();
    return { structuredReply: answerFinancialQuestion(question, context) };
  },
};
