import { initLlama, type LlamaContext } from 'llama.rn';
import type { ParsedSms } from '../sms/parseSmsBody';
import { LlmModelManager, modelPath } from './LlmModelManager';
import {
  SMS_EXTRACTION_SCHEMA,
  buildSmsExtractionPrompt,
  parseExtractionResponse,
} from './smsExtraction';

let context: LlamaContext | null = null;
let loading: Promise<LlamaContext | null> | null = null;

/**
 * Loads the model once and keeps it resident. Returns null whenever the model
 * is not installed or will not load — every caller treats that as "no second
 * opinion available", never as an error worth surfacing.
 */
const getContext = async (): Promise<LlamaContext | null> => {
  if (context) return context;
  if (loading) return loading;

  loading = (async () => {
    if ((await LlmModelManager.getState()) !== 'ready') return null;
    try {
      context = await initLlama({
        model: modelPath(),
        // The prompt plus one bank SMS fits comfortably; a larger window costs
        // memory on exactly the low-end devices this needs to work on.
        n_ctx: 1024,
        n_gpu_layers: 0,
      });
      return context;
    } catch (error) {
      console.warn('[llm] could not load model:', error);
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
};

export const LlmService = {
  isLoaded: (): boolean => context !== null,

  async warmUp(): Promise<boolean> {
    return (await getContext()) !== null;
  },

  async unload(): Promise<void> {
    await context?.release().catch(() => undefined);
    context = null;
  },

  /**
   * Second-opinion extraction for a bank SMS the rules did not recognise.
   *
   * Generation is grammar-constrained to the extraction schema, and the result
   * is validated against the source message before it is trusted — see
   * parseExtractionResponse.
   */
  async extractSms(body: string): Promise<ParsedSms | null> {
    const ctx = await getContext();
    if (!ctx) return null;

    const { text } = await ctx.completion({
      prompt: buildSmsExtractionPrompt(body),
      // Deterministic: the same message must always parse the same way, or
      // the review queue changes under the user between runs.
      temperature: 0,
      n_predict: 128,
      response_format: { type: 'json_schema', json_schema: { schema: SMS_EXTRACTION_SCHEMA } },
    });

    return parseExtractionResponse(text ?? '', body);
  },
};
