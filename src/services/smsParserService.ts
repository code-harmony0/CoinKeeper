import { NativeModules, PermissionsAndroid } from 'react-native';
import { MerchantLearningService } from './MerchantLearningService';
import { TransactionDraftService } from './TransactionDraftService';
import { TransactionDraft } from '../types/transactionDraft';
import { TransactionPredictionService } from './TransactionPredictionService';
import { mentionsMoney, parseSmsSmart } from './sms/parseSmsSmart';
import { LlmService } from './llm/LlmService';
import { isNeverATransaction } from './sms/parseSmsBody';
import { SmsMissLog } from './sms/smsMissLog';
import { resolveBank } from './sms/bankRegistry';

const { SmsModule } = NativeModules;

export interface SmsMessage {
  id: string;
  address: string;
  date: string;
  body: string;
  type: string;
}

/** Shown to the user when READ_SMS is not granted. Callers surface this verbatim. */
export const SMS_PERMISSION_DENIED =
  'CoinKeeper needs permission to read your bank SMS. Enable SMS access to import transactions automatically.';

/**
 * Every SMS read routes through here, so the runtime permission request lives here too.
 * The AndroidManifest declaration alone is not enough on Android 6+: without this the
 * native content://sms/inbox query throws SecurityException and the inbox reads empty.
 */
export const fetchRecentSms = async (limit: number = 500): Promise<SmsMessage[]> => {
  if (!SmsModule) {
    console.warn('SmsModule is not available. Are you on iOS?');
    return [];
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: 'Read your bank messages',
      message:
        'CoinKeeper reads only bank and payment SMS to fill in transactions for you. Messages never leave your phone.',
      buttonNegative: 'Not now',
      buttonPositive: 'Allow',
    },
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error(SMS_PERMISSION_DENIED);
  }

  return await SmsModule.getSmsMessages(limit);
};

export const parseSmsToDraft = async (
  message: SmsMessage,
  // A whole-inbox scan passes false: one model call per unrecognised message,
  // across thousands of messages, is what made the scan look frozen.
  { useModel = true }: { useModel?: boolean } = {},
): Promise<TransactionDraft | null> => {
  const messageDate = new Date(Number(message.date) || Date.now()).toISOString();

  // Rules first; the on-device model is consulted only for formats the rules
  // do not recognise, and only when it has been downloaded.
  const parsed = await parseSmsSmart(message.body, useModel ? LlmService.extractSms : undefined);
  if (!parsed) {
    // A rejected message is a correct refusal, not a gap in coverage, and a
    // message with no amount is chatter. Only unrecognised money messages are
    // worth recording as evidence.
    if (mentionsMoney(message.body) && !isNeverATransaction(message.body)) {
      await SmsMissLog.record({
        id: message.id,
        body: message.body,
        sender: message.address,
        receivedAt: Number(message.date) || null,
      }).catch(() => undefined);
    }
    return null;
  }

  const bank = resolveBank(message.address);
  const { amountPaise } = parsed;
  // Some alerts genuinely name no counterparty — a fee, an ATM withdrawal. The
  // bank that sent the message is still more use to the user than "Unknown".
  const extractedMerchant = parsed.merchant || bank.name;
  // A credit is income. Without this every salary SMS imported as an expense.
  const txType = parsed.type === 'credit' ? 'income' : 'expense';
  const regexConfidence = parsed.confidence;

  // Predict Category
  const mlPred = await MerchantLearningService.predictCategory(extractedMerchant);
  
  // Create Draft
  const draft = TransactionDraftService.createDraft('sms', {
    type: txType,
    amount_paise: amountPaise,
    merchant_name: extractedMerchant,
    category_id: mlPred.categoryId || undefined,
    date: messageDate,
    parse_route: parsed.via,
    sms_id: message.id,
    bank_id: bank.id,
    bank_name: bank.name,
    confidence: Math.min(regexConfidence + (mlPred.confidence * 0.2), 100),
    draft_status: 'reviewing',
  });

  // Run duplicate & budget prediction against the draft
  const predictionRes = await TransactionPredictionService.predict(draft);
  
  draft.is_duplicate = predictionRes.isDuplicate;
  draft.prediction_reason = predictionRes.predictionReason || undefined;

  return draft;
};
