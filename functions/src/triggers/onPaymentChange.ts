/**
 * Firestore Triggers
 * Event-driven updates for payment status changes
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSystemAction } from '../utils/auditLogger';

const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';
const PAYMENTS_COLLECTION = 'payments';
const CONTRIBUTIONS_COLLECTION = 'contributions';
const GROUPS_COLLECTION = 'groups';
const MEMBERS_COLLECTION = 'group_members';

/**
 * On Payment Status Change
 * Syncs payment status to contributions and transactions
 */
export const onPaymentStatusChange = functions.firestore
  .document(`${PAYMENTS_COLLECTION}/{paymentId}`)
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const paymentId = context.params.paymentId;

    // Only process status changes
    if (before.status === after.status) {
      return null;
    }

    console.log(`[onPaymentStatusChange] Payment ${paymentId}: ${before.status} -> ${after.status}`);

    const db = admin.firestore();

    try {
      if (after.status === 'success') {
        // Payment succeeded - update contributions and group totals
        const batch = db.batch();

        // Create or update contribution
        if (after.scheduledPaymentId) {
          const contributionQuery = await db
            .collection(CONTRIBUTIONS_COLLECTION)
            .where('transactionId', '==', paymentId)
            .limit(1)
            .get();

          if (contributionQuery.empty) {
            // Create new contribution
            const contributionRef = db.collection(CONTRIBUTIONS_COLLECTION).doc();
            batch.set(contributionRef, {
              groupId: after.groupId,
              userId: after.memberId,
              userName: after.memberName,
              amount: after.amount,
              status: 'paid',
              paymentMethod: after.method,
              transactionId: paymentId,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            // Update existing contribution
            const contributionDoc = contributionQuery.docs[0];
            batch.update(contributionDoc.ref, {
              status: 'paid',
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        // Update group total pooled
        const groupRef = db.collection(GROUPS_COLLECTION).doc(after.groupId);
        batch.update(groupRef, {
          totalPooled: admin.firestore.FieldValue.increment(after.amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update member total contributed
        const memberQuery = await db
          .collection(MEMBERS_COLLECTION)
          .where('groupId', '==', after.groupId)
          .where('userId', '==', after.memberId)
          .limit(1)
          .get();

        if (!memberQuery.empty) {
          batch.update(memberQuery.docs[0].ref, {
            totalContributed: admin.firestore.FieldValue.increment(after.amount),
            contributionStatus: 'paid',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();

        await logSystemAction(
          'payment_success',
          PAYMENTS_COLLECTION,
          paymentId,
          {
            groupId: after.groupId,
            memberId: after.memberId,
            amount: after.amount,
            method: after.method,
          },
          true
        );
      } else if (after.status === 'failed') {
        // Payment failed - update contribution status if exists
        const contributionQuery = await db
          .collection(CONTRIBUTIONS_COLLECTION)
          .where('transactionId', '==', paymentId)
          .limit(1)
          .get();

        if (!contributionQuery.empty) {
          await contributionQuery.docs[0].ref.update({
            status: 'failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        await logSystemAction(
          'payment_failed',
          PAYMENTS_COLLECTION,
          paymentId,
          {
            groupId: after.groupId,
            memberId: after.memberId,
            amount: after.amount,
            error: after.lastError,
          },
          true
        );
      } else if (after.status === 'refunded') {
        // Payment refunded - reverse the contribution
        const batch = db.batch();

        // Revert group total
        const groupRef = db.collection(GROUPS_COLLECTION).doc(after.groupId);
        batch.update(groupRef, {
          totalPooled: admin.firestore.FieldValue.increment(-after.amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Revert member total
        const memberQuery = await db
          .collection(MEMBERS_COLLECTION)
          .where('groupId', '==', after.groupId)
          .where('userId', '==', after.memberId)
          .limit(1)
          .get();

        if (!memberQuery.empty) {
          batch.update(memberQuery.docs[0].ref, {
            totalContributed: admin.firestore.FieldValue.increment(-after.amount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Update contribution
        const contributionQuery = await db
          .collection(CONTRIBUTIONS_COLLECTION)
          .where('transactionId', '==', paymentId)
          .limit(1)
          .get();

        if (!contributionQuery.empty) {
          batch.update(contributionQuery.docs[0].ref, {
            status: 'refunded',
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();

        await logSystemAction(
          'payment_refunded',
          PAYMENTS_COLLECTION,
          paymentId,
          {
            groupId: after.groupId,
            memberId: after.memberId,
            amount: after.amount,
            reason: after.refundReason,
          },
          true
        );
      }

      return null;
    } catch (error) {
      console.error(`[onPaymentStatusChange] Error processing payment ${paymentId}:`, error);

      await logSystemAction(
        'payment_success',
        PAYMENTS_COLLECTION,
        paymentId,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  });

/**
 * On Scheduled Payment Status Change
 * Updates aggregates when scheduled payment status changes
 */
export const onScheduledPaymentStatusChange = functions.firestore
  .document(`${SCHEDULED_PAYMENTS_COLLECTION}/{paymentId}`)
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const paymentId = context.params.paymentId;

    if (before.status === after.status) {
      return null;
    }

    console.log(`[onScheduledPaymentStatusChange] Payment ${paymentId}: ${before.status} -> ${after.status}`);

    // Log status changes
    await logSystemAction(
      after.status === 'paid'
        ? 'scheduled_payment_marked_paid'
        : after.status === 'overdue'
        ? 'scheduled_payment_marked_overdue'
        : 'scheduled_payment_updated',
      SCHEDULED_PAYMENTS_COLLECTION,
      paymentId,
      {
        previousStatus: before.status,
        newStatus: after.status,
        groupId: after.groupId,
        memberId: after.memberId,
      },
      true
    );

    return null;
  });
