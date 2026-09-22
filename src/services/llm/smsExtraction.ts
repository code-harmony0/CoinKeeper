import { Money } from '../../utils/money';
import { cleanMerchant, type ParsedSms } from '../sms/parseSmsBody';

/**
 * JSON schema handed to llama.rn's `response_format`, which compiles it to a
 * GBNF grammar. Constraining generation is what makes a 270M model usable
 * here: it cannot wander off into prose if the grammar forbids it.
 */
export const SMS_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    is_transaction: { type: 'boolean' },
    amount: { type: 'string' },
    merchant: { type: 'string' },
    direction: { type: 'string', enum: ['debit', 'credit'] as const },
  },
  required: ['is_transaction'],
} as const;

export const buildSmsExtractionPrompt = (body: string): string =>
  `Extract the transaction from this bank SMS. Reply with JSON only.

Rules:
- Set is_transaction to false for OTPs, balance alerts, promotions, payment
  requests, and any declined, failed, refunded or reversed transaction.
- Copy the amount exactly as it appears in the message. Never calculate it.
- direction is "debit" when money leaves the account, "credit" when it arrives.
- merchant is the other party's name only.

SMS: ${body}

JSON:`;

/** Digits only, so "1,250.55" and "1250.55" compare equal. */
const digitsOf = (value: string): string => value.replace(/[^\d]/g, '');

const extractJsonObject = (raw: string): unknown => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};

/**
 * Validates a model's extraction against the message it came from.
 *
 * A small model will occasionally produce a confident, well-formed, entirely
 * invented number. The amount is therefore only accepted if its digits appear
 * in the source SMS — the model is allowed to *find* the amount, never to
 * compute or imagine one.
 */
export const parseExtractionResponse = (
  raw: string,
  sourceBody: string,
): ParsedSms | null => {
  const parsed = extractJsonObject(raw ?? '') as Record<string, unknown> | null;
  if (!parsed || parsed.is_transaction !== true) return null;

  const { amount, merchant, direction } = parsed;

  if (typeof amount !== 'string' && typeof amount !== 'number') return null;
  if (typeof merchant !== 'string' && merchant !== undefined) return null;
  if (direction !== 'debit' && direction !== 'credit') return null;

  const amountText = String(amount);
  const digits = digitsOf(amountText);
  if (!digits || !digitsOf(sourceBody).includes(digits)) return null;

  const amountPaise = Money.toPaise(amountText.replace(/,/g, ''));
  if (amountPaise <= 0) return null;

  return {
    amountPaise,
    merchant: cleanMerchant(typeof merchant === 'string' ? merchant : ''),
    type: direction,
  };
};
