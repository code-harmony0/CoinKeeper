import { FinancialContextService } from './FinancialContextService';
import { answerIntent, classifyQuestion, type StructuredReply } from './financialQnA';
import { LlmService } from './llm/LlmService';

export const AIProvider = {
  /**
   * Answers a question about the user's money, entirely on-device.
   *
   * Understanding comes first from keywords (instant, no model), then from the
   * optional on-device model when the keywords miss. Either way the model only
   * chooses WHICH question was asked; every figure in the reply is read from
   * the local database, never generated.
   */
  async askQuestion(question: string): Promise<{ structuredReply: StructuredReply }> {
    const context = await FinancialContextService.buildContext();
    let intent = classifyQuestion(question);
    if (!intent) {
      try {
        intent = await LlmService.classifyIntent(question);
      } catch {
        intent = null; // No model, or it failed to run: fall back to the plain answer.
      }
    }
    return { structuredReply: answerIntent(intent, context) };
  },
};
