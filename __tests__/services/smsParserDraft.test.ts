jest.mock('react-native', () => ({
  NativeModules: {},
  PermissionsAndroid: {
    request: jest.fn(),
    PERMISSIONS: { READ_SMS: 'android.permission.READ_SMS' },
    RESULTS: { GRANTED: 'granted' },
  },
}));

jest.mock('../../src/services/MerchantLearningService', () => ({
  MerchantLearningService: {
    predictCategory: jest.fn(async () => ({ categoryId: null, confidence: 0 })),
  },
}));

jest.mock('../../src/services/TransactionPredictionService', () => ({
  TransactionPredictionService: {
    predict: jest.fn(async () => ({ isDuplicate: false, predictionReason: null })),
  },
}));

jest.mock('../../src/services/llm/LlmService', () => ({
  LlmService: {
    extractSms: jest.fn(async () => ({ amountPaise: 30000, merchant: 'MODEL', type: 'debit' })),
  },
}));

jest.mock('../../src/services/sms/smsMissLog', () => ({
  SmsMissLog: { record: jest.fn(async () => undefined) },
}));

import { parseSmsToDraft } from '../../src/services/smsParserService';
import { LlmService } from '../../src/services/llm/LlmService';
import { SmsMissLog } from '../../src/services/sms/smsMissLog';

const sms = (body: string) => ({
  id: '1',
  address: 'HDFCBK',
  date: String(new Date('2026-07-14T09:00:00Z').getTime()),
  body,
  type: '1',
});

describe('parseSmsToDraft', () => {
  it('marks a debit SMS as an expense', async () => {
    const draft = await parseSmsToDraft(sms('Rs.500.00 debited from a/c XX1234 to SWIGGY'));

    expect(draft!.type).toBe('expense');
  });

  it('marks a credit SMS as income, not an expense', async () => {
    const draft = await parseSmsToDraft(
      sms('Your a/c XX1234 is credited with Rs 50,000.00 on 01-07-26 by ACME PAYROLL'),
    );

    expect(draft!.type).toBe('income');
  });

  it('stores the amount in paise without float drift', async () => {
    const draft = await parseSmsToDraft(sms('Rs.1250.55 debited from a/c XX1 to SWIGGY'));

    expect(draft!.amount_paise).toBe(125055);
  });

  it('returns nothing for a message that is not a transaction', async () => {
    expect(await parseSmsToDraft(sms('123456 is your OTP'))).toBeNull();
  });

  describe('whole-inbox scans', () => {
    const unrecognised = sms('Rs 300 gone from wallet towards something new');

    beforeEach(() => jest.clearAllMocks());

    it('skips the on-device model when asked to', async () => {
      expect(await parseSmsToDraft(unrecognised, { useModel: false })).toBeNull();
      expect(LlmService.extractSms).not.toHaveBeenCalled();
    });

    it('still uses the model by default', async () => {
      expect(await parseSmsToDraft(unrecognised)).toMatchObject({ amount_paise: 30000 });
      expect(LlmService.extractSms).toHaveBeenCalled();
    });

    it('does not log chatter with no amount as a parsing miss', async () => {
      await parseSmsToDraft(sms('Your parcel is out for delivery'), { useModel: false });
      expect(SmsMissLog.record).not.toHaveBeenCalled();
    });
  });
});
