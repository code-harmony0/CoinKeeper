import { useState, useCallback } from 'react';
import { smsParserService } from '../services/smsParserService';
import { Transaction } from '../types/transaction';
import { useAuth } from './useAuth'; // To link parsed transactions to the user

/**
 * Hook to read and parse SMS messages for transaction details.
 * Handles permission requests, SMS parsing, and provides loading/error states.
 */
export const useSmsReader = () => {
  const { user } = useAuth();
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readSmsAndParse = useCallback(async () => {
    if (!user) {
      setError('User not authenticated to read SMS.');
      return [];
    }

    setIsLoading(true);
    setError(null);
    setParsedTransactions([]);

    try {
      const transactions = await smsParserService.readAndParseSms(user.uid);
      setParsedTransactions(transactions);
      return transactions;
    } catch (err: any) {
      setError(err.message || 'Failed to read and parse SMS.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Function to save a parsed transaction, potentially after user confirmation
  const saveParsedTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) {
      setError('User not authenticated to save transaction.');
      throw new Error('User not authenticated.');
    }
    setError(null);
    try {
      const savedTransaction = await smsParserService.autoCreateTransaction({
        ...transaction,
        userId: user.uid,
      });
      return savedTransaction;
    } catch (err: any) {
      setError(err.message || 'Failed to save parsed transaction.');
      throw err;
    }
  }, [user]);

  return {
    parsedTransactions,
    isLoading,
    error,
    readSmsAndParse,
    saveParsedTransaction,
  };
};
