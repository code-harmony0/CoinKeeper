// Turns raw OCR text off a photographed receipt into structured fields.
// Receipts have no fixed schema, so this is heuristic (like smsParserService.ts's
// regex-based SMS parsing) rather than a guaranteed-correct extraction.

const TOTAL_LINE_REGEX = /(grand\s*total|total\s*amount|net\s*payable|amount\s*paid|amount\s*due|balance\s*due|total)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.\d{2}|[\d,]+)/i;
const ANY_AMOUNT_REGEX = /(?:rs\.?|inr|₹)\s*([\d,]+\.\d{2}|[\d,]+)|([\d,]+\.\d{2})/gi;
const DATE_REGEX = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b|\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/;

const cleanAmount = (raw: string): number => parseFloat(raw.replace(/,/g, ''));

const looksLikeAmountOrDate = (line: string): boolean =>
  /^[\d\s.,:\/\-₹rsinr]+$/i.test(line) || DATE_REGEX.test(line);

export interface ParsedReceipt {
  merchant_name?: string;
  amount_paise?: number;
  date?: string;
  confidence: number;
}

export const parseReceiptText = (rawText: string): ParsedReceipt => {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // Merchant name: receipts print the store name as the first prominent line.
  // Skip lines that are just numbers/dates/amounts (addresses, phone numbers,
  // register codes commonly sit below the name, so the first readable line wins).
  const merchant_name = lines.find(l => l.length >= 3 && !looksLikeAmountOrDate(l))?.slice(0, 40);

  // Amount: prefer an explicit "Total"/"Amount Due" line over guessing.
  let amount_paise: number | undefined;
  let confidence = 40;

  for (const line of lines) {
    const match = line.match(TOTAL_LINE_REGEX);
    if (match) {
      amount_paise = Math.round(cleanAmount(match[2]) * 100);
      confidence = 85;
      break;
    }
  }

  // Fallback: no labeled total found — the largest currency-shaped number on
  // the receipt is usually the grand total (line items are smaller amounts).
  if (amount_paise === undefined) {
    const candidates: number[] = [];
    let m: RegExpExecArray | null;
    ANY_AMOUNT_REGEX.lastIndex = 0;
    while ((m = ANY_AMOUNT_REGEX.exec(rawText)) !== null) {
      const val = cleanAmount(m[1] || m[2]);
      if (!Number.isNaN(val) && val > 0) candidates.push(val);
    }
    if (candidates.length > 0) {
      amount_paise = Math.round(Math.max(...candidates) * 100);
      confidence = 55;
    }
  }

  const dateMatch = rawText.match(DATE_REGEX);
  const date = dateMatch ? new Date(dateMatch[0]).toISOString() : undefined;

  if (!merchant_name) confidence = Math.max(0, confidence - 20);

  return { merchant_name, amount_paise, date, confidence };
};
