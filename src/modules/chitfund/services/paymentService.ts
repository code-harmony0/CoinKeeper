/**
 * Payment Service
 * Client-side service for payment operations and queries
 */

import firestore from '@react-native-firebase/firestore';
import type {
  Payment,
  CreatePaymentData,
  ScheduledPayment,
  ScheduledPaymentFilters,
  PaymentHistoryFilters,
  PaginationOptions,
  PaginatedResult,
  CollectionMetrics,
} from '../types/payment';

const COLLECTIONS = {
  SCHEDULED_PAYMENTS: 'scheduledPayments',
  PAYMENTS: 'payments',
  RECONCILIATIONS: 'paymentReconciliations',
};

export const paymentService = {
  // ==================== SCHEDULED PAYMENTS ====================

  /**
   * Get scheduled payments with filters and pagination
   */
  getScheduledPayments: async (
    filters: ScheduledPaymentFilters = {},
    pagination: PaginationOptions = { limit: 20, orderBy: 'dueDate', orderDirection: 'asc' }
  ): Promise<PaginatedResult<ScheduledPayment>> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.SCHEDULED_PAYMENTS)
        .orderBy(pagination.orderBy || 'dueDate', pagination.orderDirection || 'asc')
        .limit(pagination.limit + 1);

      // Apply filters
      if (filters.groupId) {
        query = query.where('groupId', '==', filters.groupId);
      }

      if (filters.memberId) {
        query = query.where('memberId', '==', filters.memberId);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.where('status', 'in', filters.status);
      }

      if (filters.autoDebitOnly) {
        query = query.where('autoDebitEnabled', '==', true);
      }

      if (filters.dateRange) {
        query = query
          .where('dueDate', '>=', firestore.Timestamp.fromDate(filters.dateRange.start))
          .where('dueDate', '<=', firestore.Timestamp.fromDate(filters.dateRange.end));
      }

      if (pagination.cursor) {
        query = query.startAfter(pagination.cursor);
      }

      const snapshot = await query.get();
      const docs = snapshot.docs;
      const hasMore = docs.length > pagination.limit;
      const data = docs.slice(0, pagination.limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduledPayment[];

      return {
        data,
        hasMore,
        nextCursor: hasMore ? docs[pagination.limit - 1] : undefined,
      };
    } catch (error) {
      console.error('[paymentService] Error fetching scheduled payments:', error);
      throw new Error('Failed to fetch scheduled payments');
    }
  },

  /**
   * Subscribe to scheduled payments (real-time)
   */
  onScheduledPaymentsSnapshot: (
    callback: (payments: ScheduledPayment[]) => void,
    onError?: (error: Error) => void,
    filters: ScheduledPaymentFilters = {}
  ) => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.SCHEDULED_PAYMENTS)
        .orderBy('dueDate', 'asc')
        .limit(100);

      if (filters.groupId) {
        query = query.where('groupId', '==', filters.groupId);
      }

      if (filters.memberId) {
        query = query.where('memberId', '==', filters.memberId);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.where('status', 'in', filters.status);
      }

      return query.onSnapshot(
        snapshot => {
          const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as ScheduledPayment[];
          callback(payments);
        },
        error => {
          console.error('[paymentService] Snapshot error:', error);
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('[paymentService] Error setting up listener:', error);
      throw new Error('Failed to set up scheduled payments listener');
    }
  },

  /**
   * Get upcoming payments for a time window
   */
  getUpcomingPayments: async (
    windowDays: number = 7,
    groupId?: string
  ): Promise<ScheduledPayment[]> => {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + windowDays);

      let query = firestore()
        .collection(COLLECTIONS.SCHEDULED_PAYMENTS)
        .where('status', 'in', ['pending', 'reminded'])
        .where('dueDate', '>=', firestore.Timestamp.fromDate(now))
        .where('dueDate', '<=', firestore.Timestamp.fromDate(endDate))
        .orderBy('dueDate', 'asc');

      if (groupId) {
        query = query.where('groupId', '==', groupId);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduledPayment[];
    } catch (error) {
      console.error('[paymentService] Error fetching upcoming payments:', error);
      throw new Error('Failed to fetch upcoming payments');
    }
  },

  /**
   * Get overdue payments
   */
  getOverduePayments: async (groupId?: string): Promise<ScheduledPayment[]> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.SCHEDULED_PAYMENTS)
        .where('status', '==', 'overdue')
        .orderBy('dueDate', 'asc');

      if (groupId) {
        query = query.where('groupId', '==', groupId);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduledPayment[];
    } catch (error) {
      console.error('[paymentService] Error fetching overdue payments:', error);
      throw new Error('Failed to fetch overdue payments');
    }
  },

  // ==================== PAYMENTS ====================

  /**
   * Record a new payment
   */
  recordPayment: async (data: CreatePaymentData): Promise<string> => {
    try {
      const paymentData = {
        ...data,
        status: 'initiated' as const,
        reconciliationStatus: 'pending' as const,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await firestore().collection(COLLECTIONS.PAYMENTS).add(paymentData);
      return docRef.id;
    } catch (error) {
      console.error('[paymentService] Error recording payment:', error);
      throw new Error('Failed to record payment');
    }
  },

  /**
   * Get payment by ID
   */
  getPaymentById: async (paymentId: string): Promise<Payment | null> => {
    try {
      const doc = await firestore().collection(COLLECTIONS.PAYMENTS).doc(paymentId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as Payment;
    } catch (error) {
      console.error('[paymentService] Error fetching payment:', error);
      throw new Error('Failed to fetch payment');
    }
  },

  /**
   * Get payment history with filters and pagination
   */
  getPaymentHistory: async (
    filters: PaymentHistoryFilters = {},
    pagination: PaginationOptions = { limit: 20, orderBy: 'createdAt', orderDirection: 'desc' }
  ): Promise<PaginatedResult<Payment>> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.PAYMENTS)
        .orderBy(pagination.orderBy || 'createdAt', pagination.orderDirection || 'desc')
        .limit(pagination.limit + 1);

      if (filters.memberId) {
        query = query.where('memberId', '==', filters.memberId);
      }

      if (filters.groupId) {
        query = query.where('groupId', '==', filters.groupId);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.where('status', 'in', filters.status);
      }

      if (pagination.cursor) {
        query = query.startAfter(pagination.cursor);
      }

      const snapshot = await query.get();
      const docs = snapshot.docs;
      const hasMore = docs.length > pagination.limit;
      const data = docs.slice(0, pagination.limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Payment[];

      return {
        data,
        hasMore,
        nextCursor: hasMore ? docs[pagination.limit - 1] : undefined,
      };
    } catch (error) {
      console.error('[paymentService] Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  },

  /**
   * Subscribe to payments (real-time)
   */
  onPaymentsSnapshot: (
    callback: (payments: Payment[]) => void,
    onError?: (error: Error) => void,
    filters: PaymentHistoryFilters = {}
  ) => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.PAYMENTS)
        .orderBy('createdAt', 'desc')
        .limit(50);

      if (filters.memberId) {
        query = query.where('memberId', '==', filters.memberId);
      }

      if (filters.groupId) {
        query = query.where('groupId', '==', filters.groupId);
      }

      return query.onSnapshot(
        snapshot => {
          const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Payment[];
          callback(payments);
        },
        error => {
          console.error('[paymentService] Payments snapshot error:', error);
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('[paymentService] Error setting up payments listener:', error);
      throw new Error('Failed to set up payments listener');
    }
  },

  // ==================== METRICS ====================

  /**
   * Get collection metrics
   */
  getCollectionMetrics: async (groupId?: string): Promise<CollectionMetrics> => {
    try {
      const now = firestore.Timestamp.now();

      // Get scheduled payments counts
      let scheduledQuery = firestore().collection(COLLECTIONS.SCHEDULED_PAYMENTS);
      let paymentsQuery = firestore().collection(COLLECTIONS.PAYMENTS);

      if (groupId) {
        scheduledQuery = scheduledQuery.where('groupId', '==', groupId) as typeof scheduledQuery;
        paymentsQuery = paymentsQuery.where('groupId', '==', groupId) as typeof paymentsQuery;
      }

      const [pendingSnapshot, overdueSnapshot, paidSnapshot, successPaymentsSnapshot] = await Promise.all([
        scheduledQuery.where('status', 'in', ['pending', 'reminded']).get(),
        scheduledQuery.where('status', '==', 'overdue').get(),
        scheduledQuery.where('status', '==', 'paid').get(),
        paymentsQuery.where('status', '==', 'success').get(),
      ]);

      const pending = pendingSnapshot.docs.map(doc => doc.data());
      const overdue = overdueSnapshot.docs.map(doc => doc.data());
      const paid = paidSnapshot.docs.map(doc => doc.data());
      const successPayments = successPaymentsSnapshot.docs.map(doc => doc.data());

      const pendingAmount = pending.reduce((sum, p) => sum + (p.amount || 0), 0);
      const overdueAmount = overdue.reduce((sum, p) => sum + (p.amount || 0), 0);
      const collectedAmount = successPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const totalScheduled = pending.length + overdue.length + paid.length;
      const collectionRate = totalScheduled > 0 ? (paid.length / totalScheduled) * 100 : 0;

      return {
        totalScheduled,
        totalPending: pending.length,
        totalOverdue: overdue.length,
        totalPaid: paid.length,
        totalAmount: pendingAmount + overdueAmount + collectedAmount,
        collectedAmount,
        pendingAmount,
        overdueAmount,
        collectionRate: Math.round(collectionRate * 100) / 100,
        autoDebitSuccessRate: 0, // Calculate from auto-debit jobs if needed
        averageDelayDays: 0, // Calculate from payment history if needed
        remindersSentToday: 0,
        autoDebitsProcessedToday: 0,
        updatedAt: now,
      };
    } catch (error) {
      console.error('[paymentService] Error fetching metrics:', error);
      throw new Error('Failed to fetch collection metrics');
    }
  },

  // ==================== RECONCILIATION ====================

  /**
   * Get pending reconciliations
   */
  getPendingReconciliations: async (limit: number = 50) => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.RECONCILIATIONS)
        .where('status', 'in', ['unmatched', 'mismatch'])
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[paymentService] Error fetching reconciliations:', error);
      throw new Error('Failed to fetch pending reconciliations');
    }
  },
};
