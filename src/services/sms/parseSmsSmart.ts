import { isNeverATransaction, parseSmsBody, type ParsedSms } from './parseSmsBody';
import { parseWithLibrary } from './libraryParser';

/** How the transaction was recovered — surfaced so review can show its origin. */
export type ParseRoute = 'rules' | 'library' | 'model';

export interface SmartParsedSms extends ParsedSms {
  via: ParseRoute;
  confidence: number;
}

/** A model-backed second opinion. Returns null when it cannot extract one. */
export type LlmExtractor = (body: string) => Promise<ParsedSms | null>;

const RULES_CONFIDENCE = 80;
/** Broader bank coverage than ours, but permissive, so ranked just below. */
const LIBRARY_CONFIDENCE = 70;
/**
 * Deliberately below the rules. A model extraction is a plausible reading,
 * not a known format, and the review screen sorts on this.
 */
const MODEL_CONFIDENCE = 55;

/**
 * A real inbox is overwhelmingly chatter — delivery notes, promotions, network
 * messages. Running the model over all of those would cost minutes per scan
 * and can only produce false positives: with no amount there is no
 * transaction to find.
 */
const MENTIONS_MONEY = /(?:rs\.?|inr|₹)\s?[\d,]/i;

export const mentionsMoney = (body: string): boolean => MENTIONS_MONEY.test(body ?? '');

/**
 * Parses a bank SMS, using the hand-written rules first and a model only for
 * formats the rules do not recognise.
 *
 * The model is never consulted about a message the rules actively rejected —
 * an OTP or a declined payment stays rejected, because a second opinion there
 * can only ever manufacture a transaction that did not happen.
 */
export const parseSmsSmart = async (
  body: string,
  extractLlm?: LlmExtractor,
): Promise<SmartParsedSms | null> => {
  const byRules = parseSmsBody(body);
  if (byRules) return { ...byRules, via: 'rules', confidence: RULES_CONFIDENCE };

  // Everything past this point is a format our own patterns did not recognise.
  // A rejected message stops here: neither the library nor the model may
  // resurrect an OTP or a declined payment into a transaction that never was.
  if (isNeverATransaction(body)) return null;

  const byLibrary = parseWithLibrary(body);
  if (byLibrary) return { ...byLibrary, via: 'library', confidence: LIBRARY_CONFIDENCE };

  if (!extractLlm || !MENTIONS_MONEY.test(body)) return null;

  try {
    const byModel = await extractLlm(body);
    return byModel ? { ...byModel, via: 'model', confidence: MODEL_CONFIDENCE } : null;
  } catch (error) {
    // A model that is missing, still downloading, or out of memory must never
    // take the SMS import down with it — the rules path already succeeded or
    // failed on its own merits.
    console.warn('[sms] model fallback unavailable:', error);
    return null;
  }
};
