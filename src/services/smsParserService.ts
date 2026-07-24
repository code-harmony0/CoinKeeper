import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export interface SmsMessage {
  id: string;
  address: string;
  date: string;
  body: string;
  type: string;
}

export interface ParsedTransaction {
  amount: number;
  merchant: string;
  type: 'debit' | 'credit';
  originalSms: string;
  date: string;
}

const debitRegexList = [
  /spent (?:rs\.?|inr) ?([\d,]+\.?\d*).*? (?:at|on|to) (.*?)(?: on| via|\.|$)/i,
  /(?:rs\.?|inr) ?([\d,]+\.?\d*) (?:debited|deducted).*?(?:to|for) (.*?)(?: on| via|\.|$)/i,
  /debited (?:rs\.?|inr) ?([\d,]+\.?\d*).*?(?:to|for) (.*?)(?: on| via|\.|$)/i,
  /payment of (?:rs\.?|inr) ?([\d,]+\.?\d*).*?to (.*?)(?: on| via|\.|$)/i,
];

const creditRegexList = [
  /(?:rs\.?|inr) ?([\d,]+\.?\d*) credited.*?(?:from|by) (.*?)(?: on| via|\.|$)/i,
  /credited (?:with )?(?:rs\.?|inr) ?([\d,]+\.?\d*).*?(?:from|by) (.*?)(?: on| via|\.|$)/i,
  /received (?:rs\.?|inr) ?([\d,]+\.?\d*).*?(?:from|by) (.*?)(?: on| via|\.|$)/i,
];

export const fetchRecentSms = async (limit: number = 500): Promise<SmsMessage[]> => {
  if (!SmsModule) {
    console.warn('SmsModule is not available. Are you on iOS?');
    return [];
  }
  return await SmsModule.getSmsMessages(limit);
};

const cleanAmount = (amountStr: string) => parseFloat(amountStr.replace(/,/g, ''));

export const parseSmsToTransaction = (sms: string): ParsedTransaction | null => {
  // Ignore OTPs and promotional messages early
  if (/otp|verification code|password|promotional/i.test(sms)) {
    return null;
  }

  // Check debit patterns
  for (const regex of debitRegexList) {
    const match = sms.match(regex);
    if (match) {
      return {
        amount: cleanAmount(match[1]),
        merchant: match[2]?.trim().substring(0, 30), // Limit length
        type: 'debit',
        originalSms: sms,
        date: new Date().toISOString(), // In real app, parse from sms date
      };
    }
  }

  // Check credit patterns
  for (const regex of creditRegexList) {
    const match = sms.match(regex);
    if (match) {
      return {
        amount: cleanAmount(match[1]),
        merchant: match[2]?.trim().substring(0, 30),
        type: 'credit',
        originalSms: sms,
        date: new Date().toISOString(),
      };
    }
  }

  return null;
};
