/**
 * paymentConfirmationService.ts
 * Firestore service for managing payment confirmations
 * Follows contributionService.ts pattern with real-time listeners and audit logging
 */

import firestore from '@react-native-firebase/firestore';
import { PaymentConfirmation, PaymentConfirmationStatus } from '../types/paymentConfirmation';

const COLLECTION = 'payment_confirmations';
const AUDIT_LOG_COLLECTION = 'auditLogs';

/**
 * Real-time listener for all payment confirmations (admin view)
 */
export const subscribeToAllConfirmations = (
  callback: (confirmations: PaymentConfirmation[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const unsubscribe = firestore()
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot(
        (snapshot) => {
          const confirmations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PaymentConfirmation[];
          callback(confirmations);
        },
        (error) => {
          console.error('Error subscribing to payment confirmations:', error);
          errorCallback?.(error);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up payment confirmations subscription:', error);
    errorCallback?.(error as Error);
    return () => {};
  }
};

/**
 * Real-time listener for pending payment confirmations
 */
export const subscribeToPendingConfirmations = (
  callback: (confirmations: PaymentConfirmation[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const unsubscribe = firestore()
      .collection(COLLECTION)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const confirmations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PaymentConfirmation[];
          callback(confirmations);
        },
        (error) => {
          console.error('Error subscribing to pending confirmations:', error);
          errorCallback?.(error);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up pending confirmations subscription:', error);
    errorCallback?.(error as Error);
    return () => {};
  }
};

/**
 * Real-time listener for disputed payment confirmations
 */
export const subscribeToDisputedConfirmations = (
  callback: (confirmations: PaymentConfirmation[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const unsubscribe = firestore()
      .collection(COLLECTION)
      .where('status', '==', 'disputed')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const confirmations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PaymentConfirmation[];
          callback(confirmations);
        },
        (error) => {
          console.error('Error subscribing to disputed confirmations:', error);
          errorCallback?.(error);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up disputed confirmations subscription:', error);
    errorCallback?.(error as Error);
    return () => {};
  }
};

/**
 * Real-time listener for confirmations by group
 */
export const subscribeToGroupConfirmations = (
  groupId: string,
  callback: (confirmations: PaymentConfirmation[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const unsubscribe = firestore()
      .collection(COLLECTION)
      .where('groupId', '==', groupId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const confirmations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PaymentConfirmation[];
          callback(confirmations);
        },
        (error) => {
          console.error('Error subscribing to group confirmations:', error);
          errorCallback?.(error);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up group confirmations subscription:', error);
    errorCallback?.(error as Error);
    return () => {};
  }
};

/**
 * Create a new payment confirmation
 */
export const createPaymentConfirmation = async (
  data: Omit<PaymentConfirmation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const now = firestore.Timestamp.now();
    const docRef = await firestore()
      .collection(COLLECTION)
      .add({
        ...data,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

    await logAudit({
      entityId: docRef.id,
      entityType: 'payment_confirmation',
      action: 'created',
      performedBy: data.memberId,
      timestamp: now.toDate(),
      metadata: { groupId: data.groupId, amount: data.amount, method: data.paymentMethod },
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating payment confirmation:', error);
    throw error;
  }
};

/**
 * Confirm a payment
 */
export const confirmPayment = async (
  confirmationId: string,
  confirmedBy: string,
  confirmedByName: string,
  notes?: string
): Promise<void> => {
  try {
    const now = firestore.Timestamp.now();
    await firestore()
      .collection(COLLECTION)
      .doc(confirmationId)
      .update({
        status: 'confirmed',
        confirmedBy,
        confirmedByName,
        confirmedAt: now,
        notes: notes || null,
        updatedAt: now,
      });

    await logAudit({
      entityId: confirmationId,
      entityType: 'payment_confirmation',
      action: 'confirmed',
      performedBy: confirmedBy,
      timestamp: now.toDate(),
      metadata: { notes },
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};

/**
 * Reject a payment
 */
export const rejectPayment = async (
  confirmationId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<void> => {
  try {
    const now = firestore.Timestamp.now();
    await firestore()
      .collection(COLLECTION)
      .doc(confirmationId)
      .update({
        status: 'rejected',
        rejectionReason,
        updatedAt: now,
      });

    await logAudit({
      entityId: confirmationId,
      entityType: 'payment_confirmation',
      action: 'rejected',
      performedBy: rejectedBy,
      timestamp: now.toDate(),
      metadata: { rejectionReason },
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    throw error;
  }
};

/**
 * Raise a dispute on a payment
 */
export const disputePayment = async (
  confirmationId: string,
  disputedBy: string,
  disputeReason: string
): Promise<void> => {
  try {
    const now = firestore.Timestamp.now();
    await firestore()
      .collection(COLLECTION)
      .doc(confirmationId)
      .update({
        status: 'disputed',
        disputeReason,
        updatedAt: now,
      });

    await logAudit({
      entityId: confirmationId,
      entityType: 'payment_confirmation',
      action: 'disputed',
      performedBy: disputedBy,
      timestamp: now.toDate(),
      metadata: { disputeReason },
    });
  } catch (error) {
    console.error('Error disputing payment:', error);
    throw error;
  }
};

/**
 * Batch confirm payments
 */
export const batchConfirmPayments = async (
  confirmationIds: string[],
  confirmedBy: string,
  confirmedByName: string
): Promise<{ success: number; failed: number }> => {
  const batch = firestore().batch();
  const now = firestore.Timestamp.now();
  let success = 0;
  let failed = 0;

  try {
    for (const id of confirmationIds) {
      try {
        const docRef = firestore().collection(COLLECTION).doc(id);
        batch.update(docRef, {
          status: 'confirmed',
          confirmedBy,
          confirmedByName,
          confirmedAt: now,
          updatedAt: now,
        });
        success++;
      } catch (error) {
        console.error(`Failed to confirm payment ${id}:`, error);
        failed++;
      }
    }

    await batch.commit();

    await logAudit({
      entityId: 'batch',
      entityType: 'payment_confirmation',
      action: 'batch_confirmed',
      performedBy: confirmedBy,
      timestamp: now.toDate(),
      metadata: { count: success, failed },
    });

    return { success, failed };
  } catch (error) {
    console.error('Error in batch confirm:', error);
    throw error;
  }
};

/**
 * Get confirmation by ID
 */
export const getConfirmationById = async (
  confirmationId: string
): Promise<PaymentConfirmation | null> => {
  try {
    const doc = await firestore()
      .collection(COLLECTION)
      .doc(confirmationId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as PaymentConfirmation;
  } catch (error) {
    console.error('Error getting confirmation by ID:', error);
    throw error;
  }
};

/**
 * Get payment confirmation stats
 */
export const getConfirmationStats = async (): Promise<{
  totalPending: number;
  totalConfirmed: number;
  totalRejected: number;
  totalDisputed: number;
  pendingAmount: number;
  confirmedAmount: number;
  confirmationRate: number;
}> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTION)
      .get();

    const confirmations = snapshot.docs.map((doc) => doc.data());

    const totalPending = confirmations.filter((c) => c.status === 'pending').length;
    const totalConfirmed = confirmations.filter((c) => c.status === 'confirmed').length;
    const totalRejected = confirmations.filter((c) => c.status === 'rejected').length;
    const totalDisputed = confirmations.filter((c) => c.status === 'disputed').length;

    const pendingAmount = confirmations
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const confirmedAmount = confirmations
      .filter((c) => c.status === 'confirmed')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const total = confirmations.length;
    const confirmationRate = total > 0 ? (totalConfirmed / total) * 100 : 0;

    return {
      totalPending,
      totalConfirmed,
      totalRejected,
      totalDisputed,
      pendingAmount,
      confirmedAmount,
      confirmationRate,
    };
  } catch (error) {
    console.error('Error getting confirmation stats:', error);
    throw error;
  }
};

/**
 * Audit log helper
 */
const logAudit = async (data: {
  entityId: string;
  entityType: string;
  action: string;
  performedBy: string;
  timestamp: Date;
  metadata: any;
}): Promise<void> => {
  try {
    await firestore()
      .collection(AUDIT_LOG_COLLECTION)
      .add({
        ...data,
        timestamp: firestore.Timestamp.fromDate(data.timestamp),
      });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};
