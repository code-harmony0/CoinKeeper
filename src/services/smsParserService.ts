import { NativeModules } from 'react-native';
import { MerchantLearningService } from './MerchantLearningService';
import { TransactionDraftService } from './TransactionDraftService';
import { TransactionDraft } from '../types/transactionDraft';
import { TransactionPredictionService } from './TransactionPredictionService';

const { SmsModule } = NativeModules;

export interface SmsMessage {
  id: string;
  address: string;
  date: string;
  body: string;
  type: string;
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

export const parseSmsToDraft = async (message: SmsMessage): Promise<TransactionDraft | null> => {
  const sms = message.body;
  const messageDate = new Date(Number(message.date) || Date.now()).toISOString();
  
  if (/otp|verification code|password|promotional/i.test(sms)) {
    return null;
  }

  let extractedAmount = 0;
  let extractedMerchant = '';
  let txType: 'debit' | 'credit' | null = null;
  let regexConfidence = 0;

  for (const regex of debitRegexList) {
    const match = sms.match(regex);
    if (match) {
      extractedAmount = cleanAmount(match[1]);
      extractedMerchant = match[2]?.trim().substring(0, 30);
      txType = 'debit';
      regexConfidence = 80;
      break;
    }
  }

  if (!txType) {
    for (const regex of creditRegexList) {
      const match = sms.match(regex);
      if (match) {
        extractedAmount = cleanAmount(match[1]);
        extractedMerchant = match[2]?.trim().substring(0, 30);
        txType = 'credit';
        regexConfidence = 80;
        break;
      }
    }
  }

  if (!txType) return null;

  // Predict Category
  const mlPred = await MerchantLearningService.predictCategory(extractedMerchant);
  
  // Create Draft
  const draft = TransactionDraftService.createDraft('sms', {
    amount_paise: extractedAmount * 100, // convert to paise
    merchant_name: extractedMerchant,
    category_id: mlPred.categoryId || undefined,
    date: messageDate,
    sms_id: message.id,
    confidence: Math.min(regexConfidence + (mlPred.confidence * 0.2), 100),
    draft_status: 'reviewing',
  });

  // Run duplicate & budget prediction against the draft
  const predictionRes = await TransactionPredictionService.predict(draft);
  
  draft.is_duplicate = predictionRes.isDuplicate;
  draft.prediction_reason = predictionRes.predictionReason || undefined;

  return draft;
};
