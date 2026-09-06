import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddTransactionSheet } from '../../src/components/modals/AddTransactionSheet';
import { SMS_PERMISSION_DENIED } from '../../src/services/smsParserService';

// A denied SMS permission is recoverable — the user can grant it. If the sheet
// replaces that reason with a generic "Could not read SMS inbox." the user has
// no idea what to do, which is how this feature stayed silently dead before.
jest.mock('../../src/services/smsParserService', () => ({
  SMS_PERMISSION_DENIED: 'CoinKeeper needs permission to read your bank SMS.',
  fetchRecentSms: jest.fn(),
  parseSmsToDraft: jest.fn(),
}));

jest.mock('../../src/store/database', () => ({
  getDb: () => ({
    execute: jest.fn(async () => ({ rows: [] })),
    transaction: jest.fn(async (fn: any) => fn({ execute: jest.fn(async () => ({ rows: [] })) })),
  }),
}));

jest.mock('../../src/services/MerchantLearningService', () => ({
  MerchantLearningService: {
    getFavorites: jest.fn(async () => []),
    getRecent: jest.fn(async () => []),
    learnCorrection: jest.fn(async () => undefined),
    updateFrequency: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/TransactionPredictionService', () => ({
  TransactionPredictionService: {
    predict: jest.fn(async () => ({
      categoryId: null,
      accountId: null,
      isRecurring: false,
      isDuplicate: false,
      predictionReason: null,
      confidence: 0,
    })),
    evaluateBudgetImpact: jest.fn(async () => null),
  },
}));

jest.mock('../../src/services/EcosystemIntegrationService', () => ({
  EcosystemIntegrationService: { notifyDraftSaved: jest.fn(async () => undefined) },
}));

describe('AddTransactionSheet SMS permission denial', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows why SMS could not be read instead of a generic failure', async () => {
    const { fetchRecentSms } = require('../../src/services/smsParserService');
    fetchRecentSms.mockRejectedValueOnce(new Error(SMS_PERMISSION_DENIED));

    const { getByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={jest.fn()} />,
    );

    fireEvent.press(getByText('SMS'));

    await waitFor(() => expect(getByText(SMS_PERMISSION_DENIED)).toBeTruthy());
  });
});
