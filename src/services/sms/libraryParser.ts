import { getTransactionInfo } from 'transaction-sms-parser';
import { Money } from '../../utils/money';
import { cleanMerchant, type ParsedSms } from './parseSmsBody';

/**
 * Second rules tier: the MIT `transaction-sms-parser` library, which covers
 * roughly two dozen Indian banks, cards and wallets our own patterns do not.
 *
 * It is deliberately permissive — on "Payment of Rs 500 to SWIGGY has been
 * declined" it happily reports a ₹500 debit — so it must only ever be called
 * for messages that have already cleared our reject-list, and its output is
 * accepted only when it names a direction. An amount on its own (a balance
 * alert, an OTP) is not a transaction.
 */
/**
 * True when the library's merchant is a fragment cut out of the middle of a
 * word — on "keep the Order ID for future reference." it returns "erence",
 * which then became the name of the transaction. No name is better than that.
 */
const startsMidWord = (merchant: string | null | undefined, body: string): boolean => {
  const name = (merchant ?? '').trim();
  if (!name) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !new RegExp(String.raw`(?:^|[^A-Za-z])${escaped}`, 'i').test(body);
};

export const parseWithLibrary = (body: string): ParsedSms | null => {
  if (!body?.trim()) return null;

  let info;
  try {
    info = getTransactionInfo(body);
  } catch {
    // Third-party regex on arbitrary text: a throw here must not take the
    // whole SMS import down.
    return null;
  }

  const { type, amount, merchant } = info?.transaction ?? {};
  if (type !== 'debit' && type !== 'credit') return null;

  const amountPaise = Money.toPaise(String(amount ?? '').replace(/,/g, ''));
  if (amountPaise <= 0) return null;

  return { amountPaise, merchant: cleanMerchant(startsMidWord(merchant, body) ? '' : merchant ?? ''), type };
};
