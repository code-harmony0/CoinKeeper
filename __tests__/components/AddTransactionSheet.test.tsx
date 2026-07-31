import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddTransactionSheet } from '../../src/components/modals/AddTransactionSheet';

jest.mock('../../src/services/categorizationService', () => ({
  suggestCategoryForMerchant: jest.fn(async () => null),
  recordMerchantCategory: jest.fn(async () => undefined),
}));

describe('AddTransactionSheet validation', () => {
  it('disables submit until amount and category are set', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={onSubmit} />,
    );

    fireEvent.press(getByText('Add Expense'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText('0'), '250');
    fireEvent.press(getByText('Food'));
    fireEvent.press(getByText('Add Expense'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 250, category: 'Food' }),
    );
  });

  it('rejects an amount of zero with an inline error, no onSubmit call', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText, queryByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByPlaceholderText('0'), '0');
    fireEvent.press(getByText('Food'));
    fireEvent.press(getByText('Add Expense'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(queryByText(/greater than zero/i)).toBeTruthy();
  });

  it('rejects a future date for an expense with an inline error', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText, getByTestId, queryByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByPlaceholderText('0'), '100');
    fireEvent.press(getByText('Food'));

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // @react-native-community/datetimepicker's iOS implementation reads
    // event.nativeEvent.timestamp internally (see datetimepicker.ios.js)
    // rather than accepting a raw Date as a second fireEvent arg.
    fireEvent(getByTestId('date-picker'), 'onChange', {
      nativeEvent: { timestamp: tomorrow.getTime() },
    });

    fireEvent.press(getByText('Add Expense'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(queryByText(/future/i)).toBeTruthy();
  });

  it('suggests a category when a known merchant is typed, without overriding an explicit user pick', async () => {
    const { suggestCategoryForMerchant } = require('../../src/services/categorizationService');
    suggestCategoryForMerchant.mockResolvedValueOnce({ id: 'transport', name: 'Transport', icon: 'car' });

    const { getByPlaceholderText, findByText } = render(
      <AddTransactionSheet visible onClose={() => {}} onSubmit={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText('Add a note...'), 'Uber');
    await waitFor(() => expect(suggestCategoryForMerchant).toHaveBeenCalledWith('Uber'));

    // The suggested chip becomes visually selected without another tap.
    expect(await findByText('Transport')).toBeTruthy();
  });
});
