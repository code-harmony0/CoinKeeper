/**
 * contributionService.ts
 * Firestore service for managing contributions and transactions
 * Follows groupService.ts pattern with real-time listeners and atomic updates
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from '@react-native-firebase/firestore';
import { Contribution, ContributionStatus } from '../types/transaction';

const CONTRIBUTIONS_COLLECTION = 'contributions';
const AUDIT_LOG_COLLECTION = 'contributionAuditLog';

export const subscribeToContributions = (
  groupId: string,
  callback: (contributions: Contribution[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, CONTRIBUTIONS_COLLECTION),
      where('groupId', '==', groupId),
      orderBy('dueDate', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contributions = snapshot.docs.map((docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data(),
          dueDate: docSnap.data().dueDate?.toDate(),
          paidAt: docSnap.data().paidAt?.toDate(),
          approvedAt: docSnap.data().approvedAt?.toDate(),
          createdAt: docSnap.data().createdAt?.toDate(),
          updatedAt: docSnap.data().updatedAt?.toDate(),
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

export const subscribeToAllContributions = (
  callback: (contributions: Contribution[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, CONTRIBUTIONS_COLLECTION),
      orderBy('dueDate', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contributions = snapshot.docs.map((docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data(),
          dueDate: docSnap.data().dueDate?.toDate(),
          paidAt: docSnap.data().paidAt?.toDate(),
          approvedAt: docSnap.data().approvedAt?.toDate(),
          createdAt: docSnap.data().createdAt?.toDate(),
          updatedAt: docSnap.data().updatedAt?.toDate(),
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

export const subscribeToPendingContributions = (
  callback: (contributions: Contribution[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, CONTRIBUTIONS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contributions = snapshot.docs.map((docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data(),
          dueDate: docSnap.data().dueDate?.toDate(),
          paidAt: docSnap.data().paidAt?.toDate(),
          approvedAt: docSnap.data().approvedAt?.toDate(),
          createdAt: docSnap.data().createdAt?.toDate(),
          updatedAt: docSnap.data().updatedAt?.toDate(),
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

export const createContribution = async (
  data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const db = getFirestore();
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, CONTRIBUTIONS_COLLECTION), {
      ...data,
      dueDate: Timestamp.fromDate(data.dueDate),
      paidAt: data.paidAt ? Timestamp.fromDate(data.paidAt) : null,
      approvedAt: data.approvedAt ? Timestamp.fromDate(data.approvedAt) : null,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit({
      contributionId: docRef.id,
      action: 'created',
      performedBy: data.userId || data.memberId || 'system',
      timestamp: now.toDate(),
      metadata: { groupId: data.groupId, amount: data.amount },
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating contribution:', error);
    throw error;
  }
};

export const bulkCreateContributions = async (
  contributions: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>[],
  performedBy: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const db = getFirestore();
  const batch = writeBatch(db);
  const now = Timestamp.now();
  const errors: string[] = [];
  let success = 0;

  try {
    for (const contribution of contributions) {
      try {
        const docRef = doc(collection(db, CONTRIBUTIONS_COLLECTION));
        batch.set(docRef, {
          ...contribution,
          dueDate: Timestamp.fromDate(contribution.dueDate),
          paidAt: contribution.paidAt ? Timestamp.fromDate(contribution.paidAt) : null,
          approvedAt: contribution.approvedAt ? Timestamp.fromDate(contribution.approvedAt) : null,
          createdAt: now,
          updatedAt: now,
        });
        success++;
      } catch (error) {
        errors.push(`Failed to add contribution for user ${contribution.userId}: ${error}`);
      }
    }

    await batch.commit();

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

export const updateContributionStatus = async (
  contributionId: string,
  status: ContributionStatus,
  performedBy: string,
  notes?: string
): Promise<void> => {
  try {
    const db = getFirestore();
    const now = Timestamp.now();
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

    await updateDoc(doc(db, CONTRIBUTIONS_COLLECTION, contributionId), updateData);

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

export const batchApproveContributions = async (
  contributionIds: string[],
  performedBy: string
): Promise<{ success: number; failed: number }> => {
  const db = getFirestore();
  const batch = writeBatch(db);
  const now = Timestamp.now();
  let success = 0;
  let failed = 0;

  try {
    for (const id of contributionIds) {
      try {
        const docRef = doc(db, CONTRIBUTIONS_COLLECTION, id);
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

export const batchRejectContributions = async (
  contributionIds: string[],
  performedBy: string,
  reason?: string
): Promise<{ success: number; failed: number }> => {
  const db = getFirestore();
  const batch = writeBatch(db);
  const now = Timestamp.now();
  let success = 0;
  let failed = 0;

  try {
    for (const id of contributionIds) {
      try {
        const docRef = doc(db, CONTRIBUTIONS_COLLECTION, id);
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

export const markContributionAsPaid = async (
  contributionId: string,
  paymentMethod: string,
  transactionId: string,
  performedBy: string
): Promise<void> => {
  try {
    const db = getFirestore();
    const now = Timestamp.now();
    await updateDoc(doc(db, CONTRIBUTIONS_COLLECTION, contributionId), {
      status: 'paid',
      paidAt: now,
      paymentMethod,
      transactionId,
      updatedAt: now,
    });

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

export const getContributionById = async (
  contributionId: string
): Promise<Contribution | null> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, CONTRIBUTIONS_COLLECTION, contributionId));

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      ...data,
      dueDate: data?.dueDate?.toDate(),
      paidAt: data?.paidAt?.toDate(),
      approvedAt: data?.approvedAt?.toDate(),
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    } as Contribution;
  } catch (error) {
    console.error('Error getting contribution by ID:', error);
    throw error;
  }
};

export const deleteContribution = async (
  contributionId: string,
  performedBy: string
): Promise<void> => {
  try {
    const db = getFirestore();
    await deleteDoc(doc(db, CONTRIBUTIONS_COLLECTION, contributionId));

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

const logAudit = async (data: {
  contributionId: string;
  action: string;
  performedBy: string;
  timestamp: Date;
  metadata: any;
}): Promise<void> => {
  try {
    const db = getFirestore();
    await addDoc(collection(db, AUDIT_LOG_COLLECTION), {
      ...data,
      timestamp: Timestamp.fromDate(data.timestamp),
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

export const getContributionsAnalytics = async (groupId: string) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, CONTRIBUTIONS_COLLECTION),
      where('groupId', '==', groupId)
    );
    const snapshot = await getDocs(q);

    const contributions = snapshot.docs.map((docSnap: any) => docSnap.data());

    const total = contributions.length;
    const paid = contributions.filter((c: any) => c.status === 'paid').length;
    const pending = contributions.filter((c: any) => c.status === 'pending').length;
    const overdue = contributions.filter(
      (c: any) =>
        c.status === 'pending' &&
        c.dueDate &&
        c.dueDate.toDate() < new Date()
    ).length;

    const totalAmount = contributions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
    const paidAmount = contributions
      .filter((c: any) => c.status === 'paid')
      .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

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
