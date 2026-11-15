import { FinancialContextService } from './FinancialContextService';
import { answerLabel, routeQuestion, type StructuredReply } from './financialQnA';
import { LlmService } from './llm/LlmService';

export const AIProvider = {
  /**
   * Answers a question about the user's money, entirely on-device.
   *
   * Understanding comes first from keywords (instant, no model), then from the
   * optional on-device model when the keywords miss. Either way the model only
   * chooses WHICH label a question belongs to; every figure comes from the
   * local database and every explanation from the reviewed guide, so the model
   * cannot invent a fact.
   */
  async askQuestion(question: string): Promise<{ structuredReply: StructuredReply }> {
    const context = await FinancialContextService.buildContext();
    let label = routeQuestion(question);
    if (!label) {
      try {
        label = await LlmService.classifyIntent(question);
      } catch {
        label = null; // No model, or it failed to run: fall back to the plain answer.
      }
    }
    return { structuredReply: answerLabel(label, context) };
  },
};
