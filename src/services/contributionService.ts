/**
 * contributionService.ts
 * Firestore service for managing contributions and transactions
 * Follows groupService.ts pattern with real-time listeners and atomic updates
 */

import firestore from '@react-native-firebase/firestore';
import { Contribution, ContributionStatus } from '../types/transaction';

const CONTRIBUTIONS_COLLECTION = 'contributions';
const AUDIT_LOG_COLLECTION = 'contributionAuditLog';

/**
 * Real-time listener for contributions by group
 */
export const subscribeToContributions = (
  groupId: string,
  callback: (contributions: Contribution[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const unsubscribe = firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .where('groupId', '==', groupId)
      .orderBy('dueDate', 'desc')
      .onSnapshot(
        (snapshot) => {
          const contributions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate(),
            paidAt: doc.data().paidAt?.toDate(),
            approvedAt: doc.data().approvedAt?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Contribution[];
          callback(contributions);
        },
        (error) => {
          console.error('Error subscribing to contributions:', error);
          errorCallback?.(error);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up contributions subscription:', error);
    errorCallback?.(error as Error);
    return () => {};
  }
};

/**
 * Real-time listener for all contributions (admin view)
 */
export const subscribeToAllContributions = (
  callback: (contributions: Contribution[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const unsubscribe = firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .orderBy('dueDate', 'desc')
      .limit(100) // Performance limit
      .onSnapshot(
        (snapshot) => {
          const contributions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate(),
            paidAt: doc.data().paidAt?.toDate(),
            approvedAt: doc.data().approvedAt?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Contribution[];
          callback(contributions);
        },
        (error) => {
          console.error('Error subscribing to all contributions:', error);
          errorCallback?.(error);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up all contributions subscription:', error);
    errorCallback?.(error as Error);
    return () => {};
  }
};

/**
 * Real-time listener for pending approval contributions
 */
export const subscribeToPendingContributions = (
  callback: (contributions: Contribution[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const unsubscribe = firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const contributions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate(),
            paidAt: doc.data().paidAt?.toDate(),
            approvedAt: doc.data().approvedAt?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Contribution[];
          callback(contributions);
        },
        (error) => {
          console.error('Error subscribing to pending contributions:', error);
          errorCallback?.(error);
        }
      );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up pending contributions subscription:', error);
    errorCallback?.(error as Error);
    return () => {};
  }
};

/**
 * Create a new contribution
 */
export const createContribution = async (
  data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const now = firestore.Timestamp.now();
    const docRef = await firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .add({
        ...data,
        dueDate: firestore.Timestamp.fromDate(data.dueDate),
        paidAt: data.paidAt ? firestore.Timestamp.fromDate(data.paidAt) : null,
        approvedAt: data.approvedAt ? firestore.Timestamp.fromDate(data.approvedAt) : null,
        createdAt: now,
        updatedAt: now,
      });

    // Audit log
    await logAudit({
      contributionId: docRef.id,
      action: 'created',
      performedBy: data.userId,
      timestamp: now.toDate(),
      metadata: { groupId: data.groupId, amount: data.amount },
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating contribution:', error);
    throw error;
  }
};

/**
 * Bulk create contributions (for CSV import)
 */
export const bulkCreateContributions = async (
  contributions: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>[],
  performedBy: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const batch = firestore().batch();
  const now = firestore.Timestamp.now();
  const errors: string[] = [];
  let success = 0;

  try {
    for (const contribution of contributions) {
      try {
        const docRef = firestore().collection(CONTRIBUTIONS_COLLECTION).doc();
        batch.set(docRef, {
          ...contribution,
          dueDate: firestore.Timestamp.fromDate(contribution.dueDate),
          paidAt: contribution.paidAt ? firestore.Timestamp.fromDate(contribution.paidAt) : null,
          approvedAt: contribution.approvedAt ? firestore.Timestamp.fromDate(contribution.approvedAt) : null,
          createdAt: now,
          updatedAt: now,
        });
        success++;
      } catch (error) {
        errors.push(`Failed to add contribution for user ${contribution.userId}: ${error}`);
      }
    }

    await batch.commit();

    // Audit log for bulk operation
    await logAudit({
      contributionId: 'bulk',
      action: 'bulk_created',
      performedBy,
      timestamp: now.toDate(),
      metadata: { count: success, errors: errors.length },
    });

    return { success, failed: errors.length, errors };
  } catch (error) {
    console.error('Error in bulk create contributions:', error);
    throw error;
  }
};

/**
 * Update contribution status
 */
export const updateContributionStatus = async (
  contributionId: string,
  status: ContributionStatus,
  performedBy: string,
  notes?: string
): Promise<void> => {
  try {
    const now = firestore.Timestamp.now();
    const updateData: any = {
      status,
      updatedAt: now,
    };

    if (status === 'paid') {
      updateData.paidAt = now;
    } else if (status === 'approved') {
      updateData.approvedAt = now;
      updateData.approvedBy = performedBy;
    }

    if (notes) {
      updateData.notes = notes;
    }

    await firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .doc(contributionId)
      .update(updateData);

    // Audit log
    await logAudit({
      contributionId,
      action: `status_changed_${status}`,
      performedBy,
      timestamp: now.toDate(),
      metadata: { status, notes },
    });
  } catch (error) {
    console.error('Error updating contribution status:', error);
    throw error;
  }
};

/**
 * Batch approve contributions
 */
export const batchApproveContributions = async (
  contributionIds: string[],
  performedBy: string
): Promise<{ success: number; failed: number }> => {
  const batch = firestore().batch();
  const now = firestore.Timestamp.now();
  let success = 0;
  let failed = 0;

  try {
    for (const id of contributionIds) {
      try {
        const docRef = firestore().collection(CONTRIBUTIONS_COLLECTION).doc(id);
        batch.update(docRef, {
          status: 'approved',
          approvedAt: now,
          approvedBy: performedBy,
          updatedAt: now,
        });
        success++;
      } catch (error) {
        console.error(`Failed to approve contribution ${id}:`, error);
        failed++;
      }
    }

    await batch.commit();

    // Audit log
    await logAudit({
      contributionId: 'batch',
      action: 'batch_approved',
      performedBy,
      timestamp: now.toDate(),
      metadata: { count: success, failed },
    });

    return { success, failed };
  } catch (error) {
    console.error('Error in batch approve:', error);
    throw error;
  }
};

/**
 * Batch reject contributions
 */
export const batchRejectContributions = async (
  contributionIds: string[],
  performedBy: string,
  reason?: string
): Promise<{ success: number; failed: number }> => {
  const batch = firestore().batch();
  const now = firestore.Timestamp.now();
  let success = 0;
  let failed = 0;

  try {
    for (const id of contributionIds) {
      try {
        const docRef = firestore().collection(CONTRIBUTIONS_COLLECTION).doc(id);
        batch.update(docRef, {
          status: 'failed',
          notes: reason || 'Rejected by admin',
          updatedAt: now,
        });
        success++;
      } catch (error) {
        console.error(`Failed to reject contribution ${id}:`, error);
        failed++;
      }
    }

    await batch.commit();

    // Audit log
    await logAudit({
      contributionId: 'batch',
      action: 'batch_rejected',
      performedBy,
      timestamp: now.toDate(),
      metadata: { count: success, failed, reason },
    });

    return { success, failed };
  } catch (error) {
    console.error('Error in batch reject:', error);
    throw error;
  }
};

/**
 * Mark contribution as paid
 */
export const markContributionAsPaid = async (
  contributionId: string,
  paymentMethod: string,
  transactionId: string,
  performedBy: string
): Promise<void> => {
  try {
    const now = firestore.Timestamp.now();
    await firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .doc(contributionId)
      .update({
        status: 'paid',
        paidAt: now,
        paymentMethod,
        transactionId,
        updatedAt: now,
      });

    // Audit log
    await logAudit({
      contributionId,
      action: 'marked_paid',
      performedBy,
      timestamp: now.toDate(),
      metadata: { paymentMethod, transactionId },
    });
  } catch (error) {
    console.error('Error marking contribution as paid:', error);
    throw error;
  }
};

/**
 * Get contribution by ID
 */
export const getContributionById = async (
  contributionId: string
): Promise<Contribution | null> => {
  try {
    const doc = await firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .doc(contributionId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data()?.dueDate?.toDate(),
      paidAt: doc.data()?.paidAt?.toDate(),
      approvedAt: doc.data()?.approvedAt?.toDate(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as Contribution;
  } catch (error) {
    console.error('Error getting contribution by ID:', error);
    throw error;
  }
};

/**
 * Delete contribution
 */
export const deleteContribution = async (
  contributionId: string,
  performedBy: string
): Promise<void> => {
  try {
    await firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .doc(contributionId)
      .delete();

    // Audit log
    await logAudit({
      contributionId,
      action: 'deleted',
      performedBy,
      timestamp: new Date(),
      metadata: {},
    });
  } catch (error) {
    console.error('Error deleting contribution:', error);
    throw error;
  }
};

/**
 * Audit log helper
 */
const logAudit = async (data: {
  contributionId: string;
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
    // Don't throw - audit log failure shouldn't break the main operation
  }
};

/**
 * Get contributions analytics for a group
 */
export const getContributionsAnalytics = async (groupId: string) => {
  try {
    const snapshot = await firestore()
      .collection(CONTRIBUTIONS_COLLECTION)
      .where('groupId', '==', groupId)
      .get();

    const contributions = snapshot.docs.map((doc) => doc.data());

    const total = contributions.length;
    const paid = contributions.filter((c) => c.status === 'paid').length;
    const pending = contributions.filter((c) => c.status === 'pending').length;
    const overdue = contributions.filter(
      (c) =>
        c.status === 'pending' &&
        c.dueDate &&
        c.dueDate.toDate() < new Date()
    ).length;

    const totalAmount = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const paidAmount = contributions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    return {
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      collectionRate: total > 0 ? (paid / total) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting contributions analytics:', error);
    throw error;
  }
};
