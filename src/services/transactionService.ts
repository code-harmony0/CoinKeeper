/**
 * Transaction Service — Firestore CRUD for user transactions
 * Collection: 'transactions' (per-user, filtered by userId)
 */
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type { Transaction } from '../types/transaction';

const COLLECTION = 'transactions';

const getCurrentUserId = (): string => {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
};

export const transactionService = {
  /**
   * Add a new transaction
   */
  addTransaction: async (
    data: Omit<Transaction, 'id' | 'date'>,
  ): Promise<Transaction> => {
    try {
      const userId = getCurrentUserId();
      const ref = firestore().collection(COLLECTION).doc();
      const doc = {
        ...data,
        userId,
        date: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      await ref.set(doc);

      // Fetch the document to get actual server timestamps
      const snapshot = await ref.get();
      const savedData = snapshot.data();
      return {
        id: ref.id,
        ...data,
        date: savedData?.date?.toDate
          ? savedData.date.toDate().toISOString()
          : new Date().toISOString(),
      };
    } catch (error) {
      console.error('[transactionService] Error adding transaction:', error);
      throw error;
    }
  },

  /**
   * Delete a transaction
   */
  deleteTransaction: async (id: string): Promise<void> => {
    try {
      await firestore().collection(COLLECTION).doc(id).delete();
    } catch (error) {
      console.error('[transactionService] Error deleting transaction:', error);
      throw error;
    }
  },

  /**
   * Update a transaction
   */
  updateTransaction: async (
    id: string,
    updates: Partial<Transaction>,
  ): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTION)
        .doc(id)
        .update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[transactionService] Error updating transaction:', error);
      throw error;
    }
  },

  /**
   * Real-time listener for current user's transactions
   */
  onTransactionsSnapshot: (
    callback: (transactions: Transaction[]) => void,
    onError?: (error: Error) => void,
  ) => {
    try {
      const userId = getCurrentUserId();
      const unsubscribe = firestore()
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .limit(500)
        .onSnapshot(
          snapshot => {
            const txs = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                amount: data.amount,
                type: data.type,
                category: data.category,
                categoryIcon: data.categoryIcon || 'other',
                description: data.description,
                date: data.date?.toDate?.()
                  ? data.date.toDate().toISOString()
                  : data.date || new Date().toISOString(),
                paymentMethod: data.paymentMethod,
              } as Transaction;
            });
            callback(txs);
          },
          error => {
            console.error('[transactionService] Snapshot error:', error);
            onError?.(error);
          },
        );
      return unsubscribe;
    } catch (error) {
      console.error('[transactionService] Error setting up listener:', error);
      throw error;
    }
  },
};
