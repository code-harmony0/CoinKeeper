import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddTransactionSheet } from '../../src/components/modals/AddTransactionSheet';

// This suite previously targeted an older manual-entry UI (category chips, a
// date picker, a submit button literally labelled "Add Expense", and a
// suggestCategoryForMerchant service call) that no longer exists — the
// component evolved into a multi-mode (manual/SMS/scan) sheet driven by a
// merchant-prediction engine, and the test was never updated. Rewritten
// against the actual current contract: a free-text amount + merchant input,
// a StickySaveBar whose "Save" button is disabled until both are set, and
// TransactionPredictionService (not categorizationService) supplying the
// predicted category.

jest.mock('../../src/store/database', () => ({
  getDb: () => ({
    // The sheet resolves a predicted category id to its display name, so the
    // categories query has to answer with something.
    execute: jest.fn(async (sql: string) =>
      /FROM categories/i.test(sql)
        ? { rows: [{ id: 'transport', name: 'Transport', icon: 'car' }] }
        : { rows: [] },
    ),
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


describe('AddTransactionSheet validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('disables Save until both amount and merchant are set', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={onSubmit} />,
    );

    fireEvent.press(getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText('0'), '250');
    fireEvent.press(getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('treats a zero amount as empty and keeps Save disabled', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByPlaceholderText('0'), '0');
    // The merchant field only renders once the amount is non-empty — with
    // amount '0' it never appears, so there's no way to also fill it in.
    expect(queryByPlaceholderText('Where did you spend?')).toBeNull();

    fireEvent.press(getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits once amount and merchant are both filled', async () => {
    jest.useFakeTimers();
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByPlaceholderText('0'), '250');
    fireEvent.changeText(getByPlaceholderText('Where did you spend?'), 'Coffee Shop');

    fireEvent.press(getByText('Save'));
    // handleSave shows a success state for 600ms before actually calling
    // onSubmit — advance past that instead of waiting on a real timer.
    jest.advanceTimersByTime(700);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount_paise: 25000, merchant_name: 'Coffee Shop' }),
        'expense',
      ),
    );

    jest.useRealTimers();
  });

  it('surfaces a predicted category once a merchant is typed', async () => {
    const { TransactionPredictionService } = require('../../src/services/TransactionPredictionService');
    TransactionPredictionService.predict.mockResolvedValueOnce({
      categoryId: 'transport',
      accountId: null,
      isRecurring: false,
      isDuplicate: false,
      predictionReason: 'Based on your previous transactions at Uber',
      confidence: 80,
    });

    const { getByPlaceholderText, findAllByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText('0'), '250');
    fireEvent.changeText(getByPlaceholderText('Where did you spend?'), 'Uber');

    await waitFor(() =>
      expect(TransactionPredictionService.predict).toHaveBeenCalledWith(
        expect.objectContaining({ merchant_name: 'Uber' }),
      ),
    );

    // The display NAME, never the raw category id. Appears twice by design:
    // the PredictionBanner ("Looks like Transport") and the StickySaveBar's
    // sub-label ("as Transport").
    expect(await findAllByText(/transport/i)).toHaveLength(2);
  });
});
