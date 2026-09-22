import { Money } from '../../utils/money';

export interface ParsedSms {
  amountPaise: number;
  merchant: string;
  type: 'debit' | 'credit';
}

/**
 * Messages that mention an amount but never represent money leaving or
 * entering the account. Checked before anything else: a false transaction is
 * far more damaging than a missed one, because the user has to notice it to
 * correct it.
 */
const NEVER_A_TRANSACTION = [
  /\botp\b|one[- ]time[- ]password|verification code/i,
  /\bdeclined\b|\bfailed\b|\bunsuccessful\b|insufficient funds/i,
  /\breversed\b|\brefund(ed)?\b|\bchargeback\b/i,
  /statement is ready/i,
  /\brequested\b|requesting|\bcollect request\b/i,
  /\bt&c\b|terms and conditions|apply now|\boffer\b|\bloan of\b|\beligible for\b/i,
  // Autopay and EMI reminders announce a debit that has not happened yet; the
  // real one arrives as its own SMS on the day.
  /\bwill be (?:debited|deducted|charged)\b|received (?:today )?for processing/i,
  // Renewal reminders quote the price of a payment not yet made. A completed
  // one reads "Recharge of INR 299 is successful", never "recharge with Rs".
  /\bignore if already (?:paid|recharged)\b|\brenew your plan with\b|\brecharge with\s*(?:rs\.?|inr|₹)/i,
  // A credit-card bill payment only moves money already counted as the bank debit.
  /\breceived (?:on|towards) your\b[^.]*\bcredit card\b|received your payment/i,
];

/** The verbs that mean money actually moved. */
const MOVEMENT =
  /\bdebited\b|\bcredited\b|\bdeducted\b|\bspent\b|\bwithdrawn\b|used for|payment of|\breceived\b|\bpaid\b|\bsent\b|\bdeposited\b|\b(?:txn|transaction) of\b|done at/i;

/**
 * Balance wording is only disqualifying on its own. Most real alerts quote the
 * running balance after the transaction ("... debited ... Avl Bal Rs 12,000"),
 * and treating that as a balance enquiry silently dropped genuine spending.
 */
const BALANCE_ONLY = /\bbalance is\b|\bavl bal\b|\bavailable balance\b/i;

/** `1,25,000.00` and `500` alike. Indian grouping is not uniform, so just allow commas. */
const AMOUNT = String.raw`([\d,]+(?:\.\d{1,2})?)`;
const CURRENCY = String.raw`(?:rs\.?|inr|₹)`;

/**
 * Each pattern captures the amount first and, where the format carries one,
 * the counterparty second. Ordered most-specific first — a card alert also
 * loosely matches the generic debit shapes, and would lose its merchant.
 */
const DEBIT_PATTERNS: RegExp[] = [
  // "Rs 3500.00 sent via UPI on ... to RAVI KUMAR.Ref:..." — Federal Bank and
  // several other UPI issuers use "sent", which no other pattern covers.
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+sent\b.*?\sto\s+(.+)`, 'i'),
  // "Sent Rs.51.00 from XX9722 to NAME on ..." — Kotak and HDFC, often one
  // field per line, so the gap to "to" may span newlines.
  new RegExp(String.raw`\bsent\s*${CURRENCY}\s*${AMOUNT}[\s\S]*?\bto\s+(.+)`, 'i'),
  // "Jerry has received Rs 6000 from your A/c" is money leaving, despite "received".
  new RegExp(String.raw`has received\s*${CURRENCY}\s*${AMOUNT}[\s\S]*?\bfrom your\b()`, 'i'),
  // "NEFT ... for Rs. 22050.00 has been credited to the beneficiary account" — likewise outgoing.
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}[^.]*?credited to (?:the )?beneficiary()`, 'i'),
  // "Dear UPI user A/C X0891 debited by 80.00 on date 09Sep26 trf to NAME" —
  // SBI's current UPI alert names no currency at all, so the amount stands bare.
  new RegExp(String.raw`\bdebited by\s*(?:${CURRENCY}\s*)?${AMOUNT}.*?\s(?:to|at|for)\s+(.+)`, 'i'),
  new RegExp(String.raw`\bdebited by\s*(?:${CURRENCY}\s*)?${AMOUNT}()`, 'i'),
  // "...PETROL Worth Rs.553.60 by CASH in Vehicle at Jio-bp Pump, KRC049" —
  // a fuel receipt. Read here so the card-paid variant is not taken as income.
  new RegExp(String.raw`worth\s*${CURRENCY}\s*${AMOUNT}\s+by\s+\w+\b.*?\bat\s+(.+)`, 'i'),
  // Telecom and utility bills name a service, not a payee: "Recharge of INR 299
  // is successful for your Airtel Mobile", "we have processed Rs.299 for your
  // Airtel Mobile", "we've received Rs.3004 against your Airtel Wi-Fi" — the
  // last is money the user paid, however much it reads like a credit.
  new RegExp(String.raw`recharge of\s*${CURRENCY}\s*${AMOUNT}\s+is success(?:ful)?\s+for your\s+(.+)`, 'i'),
  new RegExp(String.raw`processed\s*${CURRENCY}\s*${AMOUNT}\s+for your\s+(.+)`, 'i'),
  new RegExp(String.raw`received\s*${CURRENCY}\s*${AMOUNT}\s+against your\s+(.+)`, 'i'),
  new RegExp(String.raw`recharge of\s*${CURRENCY}\s*${AMOUNT}\s+is success\b()`, 'i'),
  // A charge names itself in its "towards" or "For:" clause rather than naming a shop.
  new RegExp(String.raw`debited for\s*${CURRENCY}\s*${AMOUNT}.*?\btowards\s+(.+)`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+debited\b[^.]*\.\s*For:\s*(.+)`, 'i'),
  // "Low Balance Alert! Rs.707.69 +GST charged ..." — a real fee. Anchored on
  // the charged amount so the account balance quoted afterwards is not taken.
  // Named after what it was charged for ("low balance"), not left blank — a
  // blank name fell back to "HDFC Bank", and a fee called "HDFC Bank" is
  // invisible to anything looking for fees.
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s*(?:\+\s*GST\s*)?charged\s+for\s+(.+?)\s+in\s+your\b`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s*(?:\+\s*GST\s*)?charged\b()`, 'i'),
  new RegExp(String.raw`used for\s*${CURRENCY}\s*${AMOUNT}\s*(?:at|for)\s+(.+)`, 'i'),
  new RegExp(String.raw`spent\s*${CURRENCY}\s*${AMOUNT}.*?\s(?:at|to)\s+(.+)`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+spent\b.*?\s(?:at|to)\s+(.+)`, 'i'),
  // "Your txn of ₹2,351.00 at Amazon on your ... credit card"
  new RegExp(String.raw`\b(?:txn|transaction|purchase)\s+of\s*${CURRENCY}\s*${AMOUNT}\s+(?:at|to)\s+(.+)`, 'i'),
  // SBI debit card: "transaction number 1234 for Rs.383.00 by SBI Debit Card 0000 done at DMART"
  new RegExp(String.raw`for\s*${CURRENCY}\s*${AMOUNT}[^.]*?\bdone at\s+(.+)`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+withdrawn\b\s*@?\s*(?:at\s+)?(.+)`, 'i'),
  new RegExp(String.raw`payment of\s*${CURRENCY}\s*${AMOUNT}\s*to\s+(.+)`, 'i'),
  // ICICI: "Acct XX123 debited for Rs 500.00 on 01-Sep-26; SWIGGY credited."
  new RegExp(String.raw`debited (?:for|with)\s*${CURRENCY}\s*${AMOUNT}[^;]*;\s*(.+?)\s+credited`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+(?:has been\s+)?(?:debited|deducted|paid).*?\s(?:to|at|for)\s+(.+)`, 'i'),
  new RegExp(String.raw`(?:debited|deducted)\s*(?:by|with|for)?\s*${CURRENCY}\s*${AMOUNT}.*?\s(?:to|at|for)\s+(.+)`, 'i'),
  // Amount only — a real debit with no counterparty named.
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+(?:has been\s+)?(?:debited|deducted)()`, 'i'),
  new RegExp(String.raw`(?:debited|deducted)\s*(?:by|with|for)?\s*${CURRENCY}\s*${AMOUNT}()`, 'i'),
];

const CREDIT_PATTERNS: RegExp[] = [
  // SBI's bare-amount shape again, the other way round.
  new RegExp(String.raw`\bcredited by\s*(?:${CURRENCY}\s*)?${AMOUNT}.*?\s(?:from|by)\s+(.+)`, 'i'),
  new RegExp(String.raw`\bcredited by\s*(?:${CURRENCY}\s*)?${AMOUNT}()`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+deposited()`, 'i'),
  new RegExp(String.raw`cashback of\s*${CURRENCY}\s*${AMOUNT}()`, 'i'),
  new RegExp(String.raw`credited\s*(?:with|by)?\s*${CURRENCY}\s*${AMOUNT}.*?\s(?:from|by)\s+(.+)`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+(?:has been\s+)?credited.*?\s(?:from|by)\s+(.+)`, 'i'),
  new RegExp(String.raw`received\s*${CURRENCY}\s*${AMOUNT}.*?\s(?:from|by)\s+(.+)`, 'i'),
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}\s+(?:has been\s+)?credited()`, 'i'),
];

/**
 * Bank SMS pads the counterparty with everything from UPI handles to
 * reference numbers. What the user recognises is the name, so strip the rest.
 */
export const cleanMerchant = (raw: string): string => {
  let name = (raw ?? '').trim();

  name = name.replace(/^vpa\s+/i, '');
  // "-Deposit by transfer from AL ANSARI EXCHANGE" — the preamble is the
  // bank's wording for how the money arrived, not who sent it.
  name = name.replace(/^[-\s]*(?:deposit\s+by\s+)?(?:transfer\s+from\s+)/i, '');
  // A charge's clause runs on into what it was charged for: "annual
  // maintenance charges for your SBI Debit Card ending 0891".
  name = name.split(/\s+for your\s+/i)[0];
  // "DEBIT CARD ANNUAL FEE-Dec-2025-EPR2722639198766"
  name = name.split(/-[A-Z][a-z]{2}-\d/)[0];
  // Everything from a date, channel, reference, or trailing clause onwards is
  // metadata. "on"/"dated" need a following digit so a merchant like
  // "PAYTM ON CALL" survives; "via" is always a channel, never part of a name.
  name = name.split(/\s+(?:on|dated)\s+\d/i)[0];
  name = name.split(/\s+via\s+/i)[0];
  name = name.split(/\s*\(/)[0];
  // "Jio-bp Pump, KRC049 Belgau KR at 00:07" — the branch code, address and
  // time that follow the name are not what the user recognises.
  name = name.split(/,\s/)[0];
  name = name.split(/\s+at\s+\d/i)[0];
  name = name.split(/[\s.]+(?:upi\s*)?ref(?:erence)?(?:\s*(?:no|id))?\.?[\s:]/i)[0];
  // Account, order and plan ids trail a service name ("Airtel Wi-Fi
  // 083123637445_wifi"). After the reference rule, so "UBER Ref 1234567890"
  // loses the whole clause rather than keeping a dangling "Ref".
  name = name.split(/\s+\d{6,}/)[0];
  name = name.split(/\.\s|\.$/)[0];
  name = name.split(/\s+(?:has|have|is|was|from your|on your|on \d)/i)[0];
  // A UPI handle identifies the payee by its local part.
  name = name.replace(/@\S+$/, '');
  name = name.replace(/[\s,;:-]+$/, '').trim();

  return name.substring(0, 30);
};

const match = (body: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const m = body.match(pattern);
    if (m) return { amount: m[1], merchant: m[2] ?? '' };
  }
  return null;
};

/**
 * Extracts a transaction from a bank SMS body, or returns null when the
 * message is not one. Pure and synchronous so every supported bank format is
 * directly testable — the categorisation and duplicate checks happen upstream.
 */
/**
 * True when the message is one we have positively decided is not a
 * transaction, as opposed to one we simply failed to recognise. The
 * difference matters to any fallback parser: an unrecognised format is worth
 * a second opinion, a rejected OTP is not.
 */
/**
 * SBI sends card alerts in stylised Unicode ("𝗌𝗉𝖾𝗇𝗍") that no ASCII pattern
 * can match. NFKC folds those, and full-width digits, back to plain text.
 */
const normalize = (body: string): string => (body ?? '').normalize('NFKC');

export const isNeverATransaction = (body: string): boolean => {
  const text = normalize(body);
  if (NEVER_A_TRANSACTION.some(re => re.test(text))) return true;
  return BALANCE_ONLY.test(text) && !MOVEMENT.test(text);
};

export const parseSmsBody = (raw: string): ParsedSms | null => {
  if (!raw) return null;
  const body = normalize(raw);
  if (isNeverATransaction(body)) return null;

  const debit = match(body, DEBIT_PATTERNS);
  const hit = debit ?? match(body, CREDIT_PATTERNS);
  if (!hit) return null;

  // Money.toPaise rounds, so 1250.55 stays 125055 rather than drifting to
  // 125054.99 the way a bare `* 100` does.
  const amountPaise = Money.toPaise(hit.amount);
  if (amountPaise <= 0) return null;

  return {
    amountPaise,
    merchant: cleanMerchant(hit.merchant),
    type: debit ? 'debit' : 'credit',
  };
};
