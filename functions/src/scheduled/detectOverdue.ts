/**
 * Detect Overdue Payments
 * Hourly scheduled job to flag overdue payments and apply penalties
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSchedulerAction } from '../utils/auditLogger';

const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';
const ESCALATION_RULES_COLLECTION = 'escalationRules';

interface ScheduledPaymentData {
  id: string;
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  amount: number;
  dueDate: admin.firestore.Timestamp;
  status: string;
  lateFeeApplied: boolean;
  lateFeeAmount?: number;
}

interface EscalationRuleData {
  groupId: string;
  enabled: boolean;
  gracePeriodDays: number;
  lateFeeEnabled: boolean;
  lateFeeType: 'flat' | 'percentage';
  lateFeeAmount: number;
  lateFeeMaxCap?: number;
  autoSuspendEnabled: boolean;
  autoSuspendAfterDays: number;
}

/**
 * Calculate late fee based on rules
 */
const calculateLateFee = (
  principalAmount: number,
  daysOverdue: number,
  rules: EscalationRuleData
): number => {
  if (!rules.lateFeeEnabled || daysOverdue <= 0) {
    return 0;
  }

  let fee = 0;

  if (rules.lateFeeType === 'flat') {
    fee = rules.lateFeeAmount;
  } else if (rules.lateFeeType === 'percentage') {
    fee = (principalAmount * rules.lateFeeAmount) / 100;
  }

  // Apply max cap if set
  if (rules.lateFeeMaxCap && fee > rules.lateFeeMaxCap) {
    fee = rules.lateFeeMaxCap;
  }

  return Math.round(fee * 100) / 100;
};

/**
 * Detect Overdue Payments
 * Runs every hour
 */
export const detectOverdue = functions.pubsub
  .schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();

    console.log('[detectOverdue] Starting overdue detection');

    let markedOverdue = 0;
    let penaltiesApplied = 0;
    let errors = 0;

    try {
      // Load all escalation rules
      const rulesSnapshot = await db.collection(ESCALATION_RULES_COLLECTION).get();
      const rules = new Map<string, EscalationRuleData>();

      rulesSnapshot.docs.forEach(doc => {
        const rule = doc.data() as EscalationRuleData;
        rules.set(rule.groupId, rule);
      });

      // Get all pending payments that might be overdue
      const pendingPayments = await db
        .collection(SCHEDULED_PAYMENTS_COLLECTION)
        .where('status', 'in', ['pending', 'reminded'])
        .get();

      console.log(`[detectOverdue] Checking ${pendingPayments.size} pending payments`);

      const batch = db.batch();
      let batchCount = 0;
      const MAX_BATCH_SIZE = 400;

      for (const paymentDoc of pendingPayments.docs) {
        const payment = { id: paymentDoc.id, ...paymentDoc.data() } as ScheduledPaymentData;

        try {
          const dueDate = payment.dueDate.toDate();
          const groupRules = rules.get(payment.groupId);
          const gracePeriod = groupRules?.gracePeriodDays ?? 0;

          // Calculate effective due date with grace period
          const effectiveDueDate = new Date(dueDate);
          effectiveDueDate.setDate(effectiveDueDate.getDate() + gracePeriod);
          effectiveDueDate.setHours(23, 59, 59, 999);

          if (now > effectiveDueDate) {
            // Payment is overdue
            const daysOverdue = Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            const updates: Record<string, unknown> = {
              status: 'overdue',
              overdueAt: admin.firestore.FieldValue.serverTimestamp(),
              daysOverdue,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Apply late fee if not already applied
            if (groupRules?.lateFeeEnabled && !payment.lateFeeApplied) {
              const lateFee = calculateLateFee(payment.amount, daysOverdue, groupRules);
              if (lateFee > 0) {
                updates.lateFeeAmount = lateFee;
                updates.lateFeeApplied = true;
                penaltiesApplied++;
              }
            }

            batch.update(paymentDoc.ref, updates);
            batchCount++;
            markedOverdue++;

            // Commit batch if reaching limit
            if (batchCount >= MAX_BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }
        } catch (paymentError) {
          console.error(`[detectOverdue] Error processing payment ${payment.id}:`, paymentError);
          errors++;
        }
      }

      // Commit remaining batch
      if (batchCount > 0) {
        await batch.commit();
      }

      // Log audit entry
      await logSchedulerAction(
        'scheduled_payment_marked_overdue',
        SCHEDULED_PAYMENTS_COLLECTION,
        'batch',
        {
          markedOverdue,
          penaltiesApplied,
          errors,
          timestamp: now.toISOString(),
        },
        errors === 0,
        errors > 0 ? `${errors} errors occurred` : undefined
      );

      console.log(
        `[detectOverdue] Completed: markedOverdue=${markedOverdue}, penaltiesApplied=${penaltiesApplied}, errors=${errors}`
      );

      return { markedOverdue, penaltiesApplied, errors };
    } catch (error) {
      console.error('[detectOverdue] Fatal error:', error);

      await logSchedulerAction(
        'scheduled_payment_marked_overdue',
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
 * Update group and member summary aggregates
 */
export const updateOverdueSummaries = functions.pubsub
  .schedule('0 */6 * * *') // Every 6 hours
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();

    console.log('[updateOverdueSummaries] Starting summary aggregation');

    try {
      // Aggregate overdue stats by group
      const overduePayments = await db
        .collection(SCHEDULED_PAYMENTS_COLLECTION)
        .where('status', '==', 'overdue')
        .get();

      const groupStats = new Map<string, { count: number; amount: number }>();

      overduePayments.docs.forEach(doc => {
        const data = doc.data();
        const groupId = data.groupId as string;
        const amount = data.amount as number;

        const existing = groupStats.get(groupId) || { count: 0, amount: 0 };
        groupStats.set(groupId, {
          count: existing.count + 1,
          amount: existing.amount + amount,
        });
      });

      // Update group summaries
      const batch = db.batch();

      for (const [groupId, stats] of groupStats) {
        const groupRef = db.collection('groups').doc(groupId);
        batch.update(groupRef, {
          overdueCount: stats.count,
          overdueAmount: stats.amount,
          overdueUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      console.log(`[updateOverdueSummaries] Updated ${groupStats.size} group summaries`);

      return { groupsUpdated: groupStats.size };
    } catch (error) {
      console.error('[updateOverdueSummaries] Error:', error);
      throw error;
    }
  });
