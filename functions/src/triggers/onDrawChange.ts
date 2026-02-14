/**
 * Draw Firestore Triggers
 * React to draw and settlement changes
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updateDrawSummary } from '../draws';

const db = admin.firestore();

// ==================== ON DRAW COMPLETE ====================

/**
 * Trigger when a draw is completed
 * Updates summaries and sends notifications
 */
export const onDrawComplete = functions.firestore
  .document('draws/{drawId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const drawId = context.params.drawId;

    // Only trigger on completion
    if (before.status !== 'completed' && after.status === 'completed') {
      console.log(`[onDrawComplete] Draw ${drawId} completed`);

      try {
        // Update group summary
        await updateDrawSummary(after.groupId);

        // Update global summary
        await updateDrawSummary();

        // Queue winner notification
        if (after.winnerId) {
          await db.collection('notificationQueue').add({
            type: 'draw_winner',
            recipientId: after.winnerId,
            drawId,
            groupId: after.groupId,
            groupName: after.groupName,
            drawNumber: after.drawNumber,
            prizeAmount: after.totalPrizeAmount,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
          });

          // Queue group broadcast
          await db.collection('notificationQueue').add({
            type: 'draw_completed',
            groupId: after.groupId,
            drawId,
            winnerName: after.winnerName,
            drawNumber: after.drawNumber,
            prizeAmount: after.totalPrizeAmount,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
          });
        }

        console.log(`[onDrawComplete] Notifications queued for draw ${drawId}`);

      } catch (error) {
        console.error('[onDrawComplete] Error:', error);
      }
    }

    // Handle cancellation
    if (before.status !== 'cancelled' && after.status === 'cancelled') {
      console.log(`[onDrawComplete] Draw ${drawId} cancelled`);

      try {
        await updateDrawSummary(after.groupId);
        await updateDrawSummary();

        // Queue admin alert
        await db.collection('notificationQueue').add({
          type: 'draw_cancelled',
          groupId: after.groupId,
          drawId,
          drawNumber: after.drawNumber,
          reason: after.cancellationReason,
          cancelledBy: after.cancelledBy,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        });

      } catch (error) {
        console.error('[onDrawComplete] Error on cancellation:', error);
      }
    }
  });

// ==================== ON SETTLEMENT CHANGE ====================

/**
 * Trigger when a settlement status changes
 * Updates draw status and sends notifications
 */
export const onSettlementChange = functions.firestore
  .document('drawSettlements/{settlementId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const settlementId = context.params.settlementId;

    // Settlement completed
    if (before.status !== 'completed' && after.status === 'completed') {
      console.log(`[onSettlementChange] Settlement ${settlementId} completed`);

      try {
        // Update draw to reflect settlement
        await db.collection('draws').doc(after.drawId).update({
          settlementCompleted: true,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Create transaction record
        await db.collection('transactions').add({
          type: 'draw_payout',
          drawId: after.drawId,
          settlementId,
          memberId: after.winnerId,
          memberName: after.winnerName,
          groupId: after.groupId,
          amount: after.netAmount,
          method: after.method,
          status: 'completed',
          transactionRef: after.transactionRef,
          createdAt: FieldValue.serverTimestamp(),
        });

        // Notify winner
        await db.collection('notificationQueue').add({
          type: 'settlement_completed',
          recipientId: after.winnerId,
          settlementId,
          drawId: after.drawId,
          amount: after.netAmount,
          method: after.method,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        });

        // Update summary
        await updateDrawSummary(after.groupId);

      } catch (error) {
        console.error('[onSettlementChange] Error:', error);
      }
    }

    // Settlement failed
    if (before.status !== 'failed' && after.status === 'failed') {
      console.log(`[onSettlementChange] Settlement ${settlementId} failed`);

      try {
        // Mark draw as partial settlement
        await db.collection('draws').doc(after.drawId).update({
          status: 'settlement_partial',
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Alert admin
        await db.collection('notificationQueue').add({
          type: 'settlement_failed',
          priority: 'high',
          settlementId,
          drawId: after.drawId,
          winnerId: after.winnerId,
          amount: after.netAmount,
          reason: after.failureReason,
          retryCount: after.retryCount,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        });

        // Update summary
        await updateDrawSummary(after.groupId);

      } catch (error) {
        console.error('[onSettlementChange] Error on failure:', error);
      }
    }
  });

// ==================== ON DRAW CREATE ====================

/**
 * Trigger when a new draw is created
 * Creates scheduled job if needed
 */
export const onDrawCreate = functions.firestore
  .document('draws/{drawId}')
  .onCreate(async (snapshot, context) => {
    const draw = snapshot.data();
    const drawId = context.params.drawId;

    console.log(`[onDrawCreate] New draw created: ${drawId}`);

    try {
      // If scheduled, create a job
      if (draw.status === 'scheduled' && draw.scheduledAt) {
        const idempotencyKey = `${drawId}_${draw.scheduledAt.toDate().toISOString().split('T')[0].replace(/-/g, '')}`;

        // Check if job already exists
        const existingJob = await db
          .collection('drawJobs')
          .where('idempotencyKey', '==', idempotencyKey)
          .limit(1)
          .get();

        if (existingJob.empty) {
          await db.collection('drawJobs').add({
            drawId,
            groupId: draw.groupId,
            idempotencyKey,
            scheduledFor: draw.scheduledAt,
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          console.log(`[onDrawCreate] Created job for draw ${drawId}`);
        }
      }

      // Update summaries
      await updateDrawSummary(draw.groupId);
      await updateDrawSummary();

    } catch (error) {
      console.error('[onDrawCreate] Error:', error);
    }
  });
