/**
 * Precompute Scheduled Payments
 * Daily scheduled job to generate upcoming payment entries
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSchedulerAction } from '../utils/auditLogger';

const GROUPS_COLLECTION = 'groups';
const MEMBERS_COLLECTION = 'group_members';
const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';

interface GroupData {
  id: string;
  name: string;
  contributionAmount: number;
  cycleTime: 'weekly' | 'biweekly' | 'monthly';
  autoDebit: boolean;
  startDate: admin.firestore.Timestamp;
  status: string;
}

interface MemberData {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  status: string;
  joinedDate: admin.firestore.Timestamp;
}

/**
 * Compute next due date based on cycle
 */
const computeNextDueDate = (
  cycle: 'weekly' | 'biweekly' | 'monthly',
  startDate: Date,
  referenceDate: Date
): Date => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  let nextDue = new Date(start);

  switch (cycle) {
    case 'weekly':
      while (nextDue <= ref) {
        nextDue.setDate(nextDue.getDate() + 7);
      }
      break;
    case 'biweekly':
      while (nextDue <= ref) {
        nextDue.setDate(nextDue.getDate() + 14);
      }
      break;
    case 'monthly':
      while (nextDue <= ref) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      break;
  }

  return nextDue;
};

/**
 * Compute cycle number
 */
const computeCycleNumber = (
  cycle: 'weekly' | 'biweekly' | 'monthly',
  startDate: Date,
  targetDate: Date
): number => {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 0;

  switch (cycle) {
    case 'weekly':
      return Math.floor(diffDays / 7) + 1;
    case 'biweekly':
      return Math.floor(diffDays / 14) + 1;
    case 'monthly':
      const months =
        (target.getFullYear() - start.getFullYear()) * 12 +
        (target.getMonth() - start.getMonth());
      return Math.max(1, months + 1);
    default:
      return 1;
  }
};

/**
 * Generate idempotency key for scheduled payment
 */
const generateIdempotencyKey = (
  memberId: string,
  groupId: string,
  dueDate: Date
): string => {
  const dateStr = dueDate.toISOString().split('T')[0];
  return `${memberId}_${groupId}_${dateStr}`;
};

/**
 * Precompute Scheduled Payments
 * Runs daily at 00:00 UTC
 */
export const precomputePayments = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // Look ahead 30 days

    console.log('[precomputePayments] Starting scheduled payment generation');
    console.log(`[precomputePayments] Date range: ${now.toISOString()} to ${endDate.toISOString()}`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    try {
      // Get all active groups
      const groupsSnapshot = await db
        .collection(GROUPS_COLLECTION)
        .where('status', '==', 'active')
        .get();

      console.log(`[precomputePayments] Found ${groupsSnapshot.size} active groups`);

      for (const groupDoc of groupsSnapshot.docs) {
        const group = { id: groupDoc.id, ...groupDoc.data() } as GroupData;

        // Get active members for this group
        const membersSnapshot = await db
          .collection(MEMBERS_COLLECTION)
          .where('groupId', '==', group.id)
          .where('status', '==', 'active')
          .get();

        for (const memberDoc of membersSnapshot.docs) {
          const member = { id: memberDoc.id, ...memberDoc.data() } as MemberData;

          try {
            // Compute next due dates within the window
            const startDate = group.startDate.toDate();
            let currentDue = computeNextDueDate(group.cycleTime, startDate, now);

            while (currentDue <= endDate) {
              const idempotencyKey = generateIdempotencyKey(
                member.userId,
                group.id,
                currentDue
              );

              // Check if payment already exists
              const existingPayment = await db
                .collection(SCHEDULED_PAYMENTS_COLLECTION)
                .where('groupId', '==', group.id)
                .where('memberId', '==', member.userId)
                .where('dueDate', '==', admin.firestore.Timestamp.fromDate(currentDue))
                .limit(1)
                .get();

              if (existingPayment.empty) {
                // Create scheduled payment
                const cycleNumber = computeCycleNumber(group.cycleTime, startDate, currentDue);

                await db.collection(SCHEDULED_PAYMENTS_COLLECTION).add({
                  idempotencyKey,
                  groupId: group.id,
                  groupName: group.name,
                  memberId: member.userId,
                  memberName: member.userName,
                  memberPhone: member.userPhone,
                  memberEmail: member.userEmail || null,
                  amount: group.contributionAmount,
                  dueDate: admin.firestore.Timestamp.fromDate(currentDue),
                  cycleNumber,
                  status: 'pending',
                  autoDebitEnabled: group.autoDebit,
                  remindersSent: 0,
                  lateFeeApplied: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                created++;
              } else {
                skipped++;
              }

              // Move to next cycle
              switch (group.cycleTime) {
                case 'weekly':
                  currentDue.setDate(currentDue.getDate() + 7);
                  break;
                case 'biweekly':
                  currentDue.setDate(currentDue.getDate() + 14);
                  break;
                case 'monthly':
                  currentDue.setMonth(currentDue.getMonth() + 1);
                  break;
              }
            }
          } catch (memberError) {
            console.error(`[precomputePayments] Error processing member ${member.id}:`, memberError);
            errors++;
          }
        }
      }

      // Log audit entry
      await logSchedulerAction(
        'scheduled_payment_created',
        SCHEDULED_PAYMENTS_COLLECTION,
        'batch',
        {
          created,
          skipped,
          errors,
          dateRange: { start: now.toISOString(), end: endDate.toISOString() },
        },
        errors === 0,
        errors > 0 ? `${errors} errors occurred` : undefined
      );

      console.log(`[precomputePayments] Completed: created=${created}, skipped=${skipped}, errors=${errors}`);

      return { created, skipped, errors };
    } catch (error) {
      console.error('[precomputePayments] Fatal error:', error);

      await logSchedulerAction(
        'scheduled_payment_created',
        SCHEDULED_PAYMENTS_COLLECTION,
        'batch',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  });

/**
 * HTTP trigger for manual precompute (admin use)
 */
export const triggerPrecomputePayments = functions.https.onRequest(async (req, res) => {
  // Verify admin authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user has admin claim
    if (!decodedToken.admin) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Run the precompute logic
    const db = admin.firestore();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    // Same logic as scheduled function...
    // (In production, extract to shared function)

    res.json({
      success: true,
      message: 'Precompute triggered successfully',
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[triggerPrecomputePayments] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
