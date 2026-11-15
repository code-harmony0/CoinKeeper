import { INTENT_NAMES } from '../financialQnA';
import { TOPICS } from '../knowledge/financeKnowledge';

/**
 * The prompt the on-device model sees. tools/ai-training/make_dataset.py
 * writes training examples in EXACTLY this shape, so a fine-tuned model and the
 * app never drift apart. Change one, regenerate the dataset, retrain.
 */
export const buildIntentPrompt = (question: string): string =>
  `Pick the label that best matches the question about personal money. Reply with JSON only.\n\n` +
  `Labels: ${[...INTENT_NAMES, ...TOPICS.map(t => t.id)].join(', ')}\n\n` +
  `Question: ${question.slice(0, 200)}\nJSON:`;
