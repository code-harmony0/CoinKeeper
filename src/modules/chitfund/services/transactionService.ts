/**
 * Transaction Service — Firestore CRUD for user transactions
 * Collection: 'transactions' (per-user, filtered by userId)
 */
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type { Transaction } from '../../../types/transaction';

const COLLECTION = 'transactions';

const getCurrentUserId = (): string => {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
};

export const transactionService = {
  addTransaction: async (
    data: Omit<Transaction, 'id' | 'date'>,
  ): Promise<Transaction> => {
    try {
      const userId = getCurrentUserId();
      const db = getFirestore();
      const ref = doc(collection(db, COLLECTION));
      const docData = {
        ...data,
        userId,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await setDoc(ref, docData);

      const snapshot = await getDoc(ref);
      const savedData = snapshot.data() as any;
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

  deleteTransaction: async (id: string): Promise<void> => {
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
      console.error('[transactionService] Error deleting transaction:', error);
      throw error;
    }
  },

  updateTransaction: async (
    id: string,
    updates: Partial<Transaction>,
  ): Promise<void> => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, COLLECTION, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[transactionService] Error updating transaction:', error);
      throw error;
    }
  },

  onTransactionsSnapshot: (
    callback: (transactions: Transaction[]) => void,
    onError?: (error: Error) => void,
  ) => {
    try {
      const userId = getCurrentUserId();
      const db = getFirestore();
      const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(500)
      );

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const txs = snapshot.docs.map((docSnap: any) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
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
