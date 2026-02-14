/**
 * Process Draws - Scheduled Cloud Function
 * Executes pending draws at their scheduled times
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { processDrawJob, createDrawJob, updateDrawSummary } from '../draws';

const db = admin.firestore();

// ==================== SCHEDULED FUNCTION ====================

/**
 * Process pending draw jobs every 5 minutes
 */
export const processDraws = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.log('[processDraws] Starting scheduled draw processing');

    const now = Timestamp.now();
    let processedCount = 0;
    let failedCount = 0;

    try {
      // Find pending jobs that are due
      const pendingJobs = await db
        .collection('drawJobs')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now)
        .orderBy('scheduledFor', 'asc')
        .limit(10) // Process max 10 per run
        .get();

      console.log(`[processDraws] Found ${pendingJobs.size} pending jobs`);

      for (const jobDoc of pendingJobs.docs) {
        const jobId = jobDoc.id;
        console.log(`[processDraws] Processing job: ${jobId}`);

        try {
          await processDrawJob(jobId);
          processedCount++;
        } catch (error) {
          console.error(`[processDraws] Failed to process job ${jobId}:`, error);
          failedCount++;
        }
      }

      // Also find retry jobs that are due
      const retryJobs = await db
        .collection('drawJobs')
        .where('status', '==', 'pending')
        .where('nextRetryAt', '<=', now)
        .limit(5)
        .get();

      console.log(`[processDraws] Found ${retryJobs.size} retry jobs`);

      for (const jobDoc of retryJobs.docs) {
        const jobId = jobDoc.id;
        console.log(`[processDraws] Processing retry job: ${jobId}`);

        try {
          await processDrawJob(jobId);
          processedCount++;
        } catch (error) {
          console.error(`[processDraws] Failed to process retry job ${jobId}:`, error);
          failedCount++;
        }
      }

      console.log(`[processDraws] Completed. Processed: ${processedCount}, Failed: ${failedCount}`);

    } catch (error) {
      console.error('[processDraws] Error:', error);
    }

    return null;
  });

// ==================== SCHEDULE UPCOMING DRAWS ====================

/**
 * Daily job to create draw jobs for upcoming scheduled draws
 */
export const scheduleUpcomingDraws = functions.pubsub
  .schedule('every day 00:30')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.log('[scheduleUpcomingDraws] Starting daily draw scheduling');

    const now = Timestamp.now();
    const endOfDay = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

    try {
      // Find draws scheduled for next 24 hours without existing jobs
      const scheduledDraws = await db
        .collection('draws')
        .where('status', '==', 'scheduled')
        .where('scheduledAt', '>=', now)
        .where('scheduledAt', '<=', endOfDay)
        .get();

      console.log(`[scheduleUpcomingDraws] Found ${scheduledDraws.size} draws to schedule`);

      let createdCount = 0;
      for (const drawDoc of scheduledDraws.docs) {
        const draw = drawDoc.data();
        const drawId = drawDoc.id;

        try {
          await createDrawJob(
            drawId,
            draw.groupId,
            draw.scheduledAt as Timestamp
          );
          createdCount++;
        } catch (error) {
          console.error(`[scheduleUpcomingDraws] Failed to create job for draw ${drawId}:`, error);
        }
      }

      console.log(`[scheduleUpcomingDraws] Created ${createdCount} draw jobs`);

    } catch (error) {
      console.error('[scheduleUpcomingDraws] Error:', error);
    }

    return null;
  });

// ==================== PROCESS RECURRING DRAWS ====================

/**
 * Daily job to create next occurrence for recurring draws
 */
export const processRecurringDraws = functions.pubsub
  .schedule('every day 01:00')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.log('[processRecurringDraws] Processing recurring draws');

    try {
      // Find completed draws with recurrence
      const completedRecurringDraws = await db
        .collection('draws')
        .where('status', '==', 'completed')
        .where('recurrence', 'in', ['weekly', 'biweekly', 'monthly'])
        .get();

      console.log(`[processRecurringDraws] Found ${completedRecurringDraws.size} recurring draws to process`);

      let createdCount = 0;
      for (const drawDoc of completedRecurringDraws.docs) {
        const draw = drawDoc.data();
        const drawId = drawDoc.id;

        // Check if next occurrence already exists
        if (draw.nextRecurrenceAt) {
          const existingNext = await db
            .collection('draws')
            .where('groupId', '==', draw.groupId)
            .where('scheduledAt', '==', draw.nextRecurrenceAt)
            .limit(1)
            .get();

          if (!existingNext.empty) {
            continue; // Already created
          }

          // Calculate next draw number
          const lastDrawInGroup = await db
            .collection('draws')
            .where('groupId', '==', draw.groupId)
            .orderBy('drawNumber', 'desc')
            .limit(1)
            .get();

          const nextDrawNumber = lastDrawInGroup.empty
            ? 1
            : (lastDrawInGroup.docs[0].data().drawNumber || 0) + 1;

          // Calculate next recurrence date
          const nextScheduledAt = calculateNextRecurrence(
            draw.nextRecurrenceAt as Timestamp,
            draw.recurrence
          );

          // Create new draw
          const newDrawRef = db.collection('draws').doc();
          await newDrawRef.set({
            groupId: draw.groupId,
            groupName: draw.groupName,
            drawNumber: nextDrawNumber,
            scheduledAt: draw.nextRecurrenceAt,
            status: 'scheduled',
            strategy: draw.strategy,
            recurrence: draw.recurrence,
            nextRecurrenceAt: nextScheduledAt,
            totalPrizeAmount: draw.totalPrizeAmount,
            minBidAmount: draw.minBidAmount,
            maxBidAmount: draw.maxBidAmount,
            participantCount: 0,
            bidsReceived: 0,
            createdBy: 'system',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Create job for the new draw
          await createDrawJob(
            newDrawRef.id,
            draw.groupId,
            draw.nextRecurrenceAt as Timestamp
          );

          // Clear nextRecurrenceAt on completed draw
          await drawDoc.ref.update({
            nextRecurrenceAt: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          createdCount++;
        }
      }

      console.log(`[processRecurringDraws] Created ${createdCount} recurring draws`);

    } catch (error) {
      console.error('[processRecurringDraws] Error:', error);
    }

    return null;
  });

/**
 * Calculate next recurrence date
 */
const calculateNextRecurrence = (
  currentDate: Timestamp,
  recurrence: string
): Timestamp => {
  const date = currentDate.toDate();

  switch (recurrence) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return Timestamp.fromDate(date);
};

// ==================== UPDATE SUMMARIES ====================

/**
 * Hourly job to update draw summaries
 */
export const refreshDrawSummaries = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.log('[refreshDrawSummaries] Updating draw summaries');

    try {
      // Update global summary
      await updateDrawSummary();

      // Update per-group summaries for active groups
      const activeGroups = await db
        .collection('groups')
        .where('status', '==', 'active')
        .limit(100)
        .get();

      for (const groupDoc of activeGroups.docs) {
        try {
          await updateDrawSummary(groupDoc.id);
        } catch (error) {
          console.error(`[refreshDrawSummaries] Failed for group ${groupDoc.id}:`, error);
        }
      }

      console.log('[refreshDrawSummaries] Completed');

    } catch (error) {
      console.error('[refreshDrawSummaries] Error:', error);
    }

    return null;
  });
