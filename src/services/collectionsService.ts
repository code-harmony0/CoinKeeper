import firestore from '@react-native-firebase/firestore';
import type {
  UpcomingPayment,
  OverduePayment,
  PaymentHistory,
  AutoDebitSchedule,
  ReminderAutomation,
  CollectionStats,
} from '../types/collection';

const COLLECTIONS = {
  UPCOMING_PAYMENTS: 'upcoming_payments',
  PAYMENT_HISTORY: 'payment_history',
  AUTO_DEBIT_SCHEDULES: 'auto_debit_schedules',
  REMINDER_AUTOMATION: 'reminder_automation',
};

export const collectionsService = {
  // ==================== UPCOMING PAYMENTS ====================

  getUpcomingPayments: async (groupId?: string): Promise<UpcomingPayment[]> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.UPCOMING_PAYMENTS)
        .where('status', 'in', ['scheduled', 'reminded'])
        .orderBy('dueDate', 'asc');

      if (groupId) {
        query = query.where('groupId', '==', groupId) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UpcomingPayment[];
    } catch (error) {
      console.error('[collectionsService] Error fetching upcoming payments:', error);
      throw new Error('Failed to fetch upcoming payments');
    }
  },

  getOverduePayments: async (): Promise<OverduePayment[]> => {
    try {
      const now = firestore.Timestamp.now();
      const snapshot = await firestore()
        .collection(COLLECTIONS.UPCOMING_PAYMENTS)
        .where('status', '==', 'overdue')
        .where('dueDate', '<', now)
        .orderBy('dueDate', 'asc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OverduePayment[];
    } catch (error) {
      console.error('[collectionsService] Error fetching overdue payments:', error);
      throw new Error('Failed to fetch overdue payments');
    }
  },

  markAsPaid: async (paymentId: string, paymentData: Partial<PaymentHistory>): Promise<void> => {
    try {
      const batch = firestore().batch();

      // Update payment status
      const paymentRef = firestore().collection(COLLECTIONS.UPCOMING_PAYMENTS).doc(paymentId);
      batch.update(paymentRef, {
        status: 'paid',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create payment history record
      const historyRef = firestore().collection(COLLECTIONS.PAYMENT_HISTORY).doc();
      batch.set(historyRef, {
        ...paymentData,
        paymentId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      console.error('[collectionsService] Error marking payment as paid:', error);
      throw new Error('Failed to mark payment as paid');
    }
  },

  scheduleReminder: async (paymentId: string, reminderData: Partial<ReminderAutomation>): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.UPCOMING_PAYMENTS)
        .doc(paymentId)
        .update({
          reminderSent: true,
          reminderSentDate: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[collectionsService] Error scheduling reminder:', error);
      throw new Error('Failed to schedule reminder');
    }
  },

  // ==================== REAL-TIME LISTENERS ====================

  onUpcomingPaymentsSnapshot: (
    callback: (payments: UpcomingPayment[]) => void,
    onError?: (error: Error) => void,
    groupId?: string
  ) => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.UPCOMING_PAYMENTS)
        .where('status', 'in', ['scheduled', 'reminded', 'pending'])
        .orderBy('dueDate', 'asc');

      if (groupId) {
        query = query.where('groupId', '==', groupId) as any;
      }

      return query.onSnapshot(
        snapshot => {
          const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as UpcomingPayment[];
          callback(payments);
        },
        error => {
          console.error('[collectionsService] Snapshot error:', error);
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('[collectionsService] Error setting up listener:', error);
      throw new Error('Failed to set up listener');
    }
  },

  // ==================== PAYMENT HISTORY ====================

  getPaymentHistory: async (memberId?: string): Promise<PaymentHistory[]> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.PAYMENT_HISTORY)
        .orderBy('paidDate', 'desc')
        .limit(100);

      if (memberId) {
        query = query.where('memberId', '==', memberId) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentHistory[];
    } catch (error) {
      console.error('[collectionsService] Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  },

  // ==================== AUTO-DEBIT ====================

  getAutoDebitSchedules: async (groupId?: string): Promise<AutoDebitSchedule[]> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.AUTO_DEBIT_SCHEDULES)
        .where('enabled', '==', true);

      if (groupId) {
        query = query.where('groupId', '==', groupId) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AutoDebitSchedule[];
    } catch (error) {
      console.error('[collectionsService] Error fetching auto-debit schedules:', error);
      throw new Error('Failed to fetch auto-debit schedules');
    }
  },

  enableAutoDebit: async (scheduleData: Omit<AutoDebitSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      await firestore().collection(COLLECTIONS.AUTO_DEBIT_SCHEDULES).add({
        ...scheduleData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[collectionsService] Error enabling auto-debit:', error);
      throw new Error('Failed to enable auto-debit');
    }
  },

  // ==================== STATS ====================

  getCollectionStats: async (): Promise<CollectionStats> => {
    try {
      const upcomingSnapshot = await firestore()
        .collection(COLLECTIONS.UPCOMING_PAYMENTS)
        .where('status', 'in', ['scheduled', 'reminded', 'pending'])
        .get();

      const overdueSnapshot = await firestore()
        .collection(COLLECTIONS.UPCOMING_PAYMENTS)
        .where('status', '==', 'overdue')
        .get();

      const historySnapshot = await firestore()
        .collection(COLLECTIONS.PAYMENT_HISTORY)
        .where('status', '==', 'completed')
        .get();

      const upcoming = upcomingSnapshot.docs.map(doc => doc.data() as UpcomingPayment);
      const overdue = overdueSnapshot.docs.map(doc => doc.data() as OverduePayment);
      const history = historySnapshot.docs.map(doc => doc.data() as PaymentHistory);

      const totalCollected = history.reduce((sum, h) => sum + h.amount, 0);
      const totalPending = upcoming.reduce((sum, u) => sum + u.amount, 0);
      const overdueAmount = overdue.reduce((sum, o) => sum + o.amount, 0);

      return {
        totalUpcoming: upcoming.length,
        totalOverdue: overdue.length,
        totalCollected,
        totalPending,
        overdueAmount,
        collectionRate: history.length / (history.length + overdue.length) * 100 || 0,
        autoDebitSuccessRate: 0, // Calculate from auto-debit history
        averageDelayDays: 0, // Calculate from payment delays
      };
    } catch (error) {
      console.error('[collectionsService] Error fetching collection stats:', error);
      throw new Error('Failed to fetch collection stats');
    }
  },
};
