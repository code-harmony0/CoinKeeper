import { firestore } from '@react-native-firebase/firestore';
import { addDocument, updateDocument, deleteDocument, onSnapshotCollection } from './firestoreService';
import { Transaction } from '../types/transaction';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AddTransactionData extends Omit<Transaction, 'id' | 'userId' | 'createdAt'> {
  userId: string;
  createdAt: firestore.FieldValue; // Use Firestore's FieldValue.serverTimestamp()
}

interface UpdateTransactionData extends Partial<Omit<Transaction, 'id' | 'userId'>> {
  updatedAt?: firestore.FieldValue;
}

/**
 * Service for managing user transactions in Firestore.
 * All transactions will be stored under a 'transactions' collection with a 'userId' field.
 */
export const transactionService = {

  /**
   * Adds a new transaction for a user.
   * @param userId The ID of the user creating the transaction.
   * @param transactionData The transaction data (excluding ID and userId).
   * @returns The newly added transaction with its Firestore ID.
   */
  addTransaction: async (transactionData: Omit<Transaction, 'id'> & {userId: string}): Promise<Transaction> => {
    try {
      const data: AddTransactionData = {
        ...transactionData,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      const newTransaction = await addDocument<AddTransactionData>('transactions', data);
      return newTransaction as Transaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  },

  /**
   * Updates an existing transaction.
   * @param transactionId The ID of the transaction to update.
   * @param updates The partial transaction data to update.
   */
  updateTransaction: async (transactionId: string, updates: UpdateTransactionData): Promise<void> => {
    try {
      const data: UpdateTransactionData = {
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      await updateDocument('transactions', transactionId, data);
    } catch (error) {
      console.error(`Error updating transaction ${transactionId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a transaction.
   * @param transactionId The ID of the transaction to delete.
   */
  deleteTransaction: async (transactionId: string): Promise<void> => {
    try {
      await deleteDocument('transactions', transactionId);
    } catch (error) {
      console.error(`Error deleting transaction ${transactionId}:`, error);
      throw error;
    }
  },

  /**
   * Sets up a real-time listener for a user's transactions.
   * @param userId The ID of the user whose transactions to listen for.
   * @param onResult Callback function to handle the array of transactions.
   * @param onError Optional callback to handle errors.
   * @returns An unsubscribe function.
   */
  onTransactionsSnapshot: (userId: string, onResult: (transactions: Transaction[]) => void, onError?: (error: Error) => void) => {
    return onSnapshotCollection<Transaction>(
      'transactions',
      onResult,
      onError,
      [['userId', '==', userId]],
      ['createdAt', 'desc'] // Order by creation date, newest first
    );
  },

  // TODO: Add methods for fetching transactions with pagination, filtering by category/date range etc.
};
