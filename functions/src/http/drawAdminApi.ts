/**
 * Draw Admin API - HTTP Endpoints
 * Admin-safe APIs for draw management with audit logging
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { executeDraw, createDrawJob, updateDrawSummary } from '../draws';
import type { Draw, CancelDrawRequest, RerunDrawRequest, SettlementRetryRequest } from '../draws/types';

const db = admin.firestore();

// ==================== HELPERS ====================

/**
 * Verify admin role for the requesting user
 */
const verifyAdminRole = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return false;
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.role === 'superadmin';
  } catch (error) {
    console.error('[verifyAdminRole] Error:', error);
    return false;
  }
};

/**
 * Write audit log entry
 */
const writeAuditLog = async (
  action: string,
  actorId: string,
  targetId: string,
  payload: Record<string, unknown>,
  success: boolean,
  errorMessage?: string
): Promise<void> => {
  await db.collection('auditLogs').add({
    action,
    actorId,
    actorType: 'admin',
    targetCollection: 'draws',
    targetId,
    payload,
    success,
    errorMessage,
    timestamp: FieldValue.serverTimestamp(),
  });
};

// ==================== RUN MANUAL DRAW ====================

export const runManualDraw = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const adminId = context.auth.uid;
  const { drawId, reason } = data;

  // Validate input
  if (!drawId || typeof drawId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'drawId is required');
  }
  if (!reason || typeof reason !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'reason is required');
  }

  // Verify admin role
  const isAdmin = await verifyAdminRole(adminId);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin role required');
  }

  try {
    // Execute the draw
    const result = await executeDraw(drawId, adminId);

    // Write audit log
    await writeAuditLog(
      'manual_draw_executed',
      adminId,
      drawId,
      { reason, winnerId: result.winnerId, success: result.success },
      result.success,
      result.error
    );

    if (!result.success) {
      throw new functions.https.HttpsError('internal', result.error || 'Draw execution failed');
    }

    return {
      success: true,
      drawId: result.drawId,
      winnerId: result.winnerId,
      winnerName: result.winnerName,
    };

  } catch (error) {
    console.error('[runManualDraw] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await writeAuditLog('manual_draw_executed', adminId, drawId, { reason }, false, errorMessage);

    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

// ==================== CANCEL DRAW ====================

export const cancelDraw = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const adminId = context.auth.uid;
  const { drawId, reason }: CancelDrawRequest = data;

  if (!drawId || !reason) {
    throw new functions.https.HttpsError('invalid-argument', 'drawId and reason are required');
  }

  const isAdmin = await verifyAdminRole(adminId);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin role required');
  }

  try {
    const drawRef = db.collection('draws').doc(drawId);
    const drawDoc = await drawRef.get();

    if (!drawDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Draw not found');
    }

    const draw = drawDoc.data() as Draw;

    // Only scheduled or open draws can be cancelled
    if (!['scheduled', 'open'].includes(draw.status)) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Cannot cancel draw with status: ${draw.status}`
      );
    }

    // Cancel the draw
    await drawRef.update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy: adminId,
      cancellationReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Cancel associated job
    const jobsSnapshot = await db
      .collection('drawJobs')
      .where('drawId', '==', drawId)
      .where('status', '==', 'pending')
      .get();

    const batch = db.batch();
    jobsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    // Write audit log
    await writeAuditLog('draw_cancelled', adminId, drawId, { reason, previousStatus: draw.status }, true);

    // Update summary
    await updateDrawSummary(draw.groupId);

    return { success: true, drawId };

  } catch (error) {
    console.error('[cancelDraw] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

// ==================== RERUN DRAW ====================

export const rerunDraw = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const adminId = context.auth.uid;
  const { drawId, reason, newSeed }: RerunDrawRequest = data;

  if (!drawId || !reason || !newSeed) {
    throw new functions.https.HttpsError('invalid-argument', 'drawId, reason, and newSeed are required');
  }

  const isAdmin = await verifyAdminRole(adminId);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin role required');
  }

  try {
    const drawRef = db.collection('draws').doc(drawId);
    const drawDoc = await drawRef.get();

    if (!drawDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Draw not found');
    }

    const draw = { id: drawDoc.id, ...drawDoc.data() } as Draw;

    // Only completed draws can be rerun (for correction purposes)
    if (draw.status !== 'completed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Can only rerun completed draws, current status: ${draw.status}`
      );
    }

    // Store original result for audit
    const originalResult = {
      winnerId: draw.winnerId,
      winnerName: draw.winnerName,
      seed: draw.executionTrace?.seed,
    };

    // Reset draw status
    await drawRef.update({
      status: 'scheduled',
      winnerId: FieldValue.delete(),
      winnerName: FieldValue.delete(),
      winningBid: FieldValue.delete(),
      executedAt: FieldValue.delete(),
      completedAt: FieldValue.delete(),
      executionTrace: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Execute with new seed
    const result = await executeDraw(drawId, adminId, newSeed);

    // Write audit log
    await writeAuditLog(
      'draw_rerun',
      adminId,
      drawId,
      {
        reason,
        newSeed,
        originalResult,
        newWinnerId: result.winnerId,
      },
      result.success,
      result.error
    );

    if (!result.success) {
      throw new functions.https.HttpsError('internal', result.error || 'Rerun failed');
    }

    return {
      success: true,
      drawId: result.drawId,
      winnerId: result.winnerId,
      winnerName: result.winnerName,
      previousWinnerId: originalResult.winnerId,
    };

  } catch (error) {
    console.error('[rerunDraw] Error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', (error as Error).message);
  }
});

// ==================== RETRY SETTLEMENT ====================

export const retrySettlement = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const adminId = context.auth.uid;
  const { settlementId, reason }: SettlementRetryRequest = data;

  if (!settlementId || !reason) {
    throw new functions.https.HttpsError('invalid-argument', 'settlementId and reason are required');
  }

  const isAdmin = await verifyAdminRole(adminId);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin role required');
  }

  try {
    const settlementRef = db.collection('drawSettlements').doc(settlementId);
    const settlementDoc = await settlementRef.get();

    if (!settlementDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Settlement not found');
    }

    const settlement = settlementDoc.data()!;

    if (!['pending', 'failed'].includes(settlement.status)) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Cannot retry settlement with status: ${settlement.status}`
      );
    }

    // Reset for retry
    await settlementRef.update({
      status: 'pending',
      retryCount: FieldValue.increment(1),
      nextRetryAt: Timestamp.now(),
      failureReason: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Write audit log
    await writeAuditLog(
      'settlement_retry',
      adminId,
      settlementId,
      { reason, drawId: settlement.drawId, winnerId: settlement.winnerId },
      true
    );

    return { success: true, settlementId };

  } catch (error) {
    console.error('[retrySettlement] Error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', (error as Error).message);
  }
});

// ==================== EXPORT DRAW ====================

export const exportDraw = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const adminId = context.auth.uid;
  const { drawId, format = 'json' } = data;

  if (!drawId) {
    throw new functions.https.HttpsError('invalid-argument', 'drawId is required');
  }

  const isAdmin = await verifyAdminRole(adminId);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin role required');
  }

  try {
    // Fetch draw with all related data
    const drawDoc = await db.collection('draws').doc(drawId).get();
    if (!drawDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Draw not found');
    }

    const draw = { id: drawDoc.id, ...drawDoc.data() };

    // Fetch settlements
    const settlementsSnapshot = await db
      .collection('drawSettlements')
      .where('drawId', '==', drawId)
      .get();
    const settlements = settlementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch bids
    const bidsSnapshot = await db
      .collection('draw_bids')
      .where('drawId', '==', drawId)
      .get();
    const bids = bidsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch audit logs
    const auditSnapshot = await db
      .collection('auditLogs')
      .where('targetId', '==', drawId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    const auditLogs = auditSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const exportData = {
      draw,
      settlements,
      bids,
      auditLogs,
      exportedAt: new Date().toISOString(),
      exportedBy: adminId,
    };

    // Write audit log
    await writeAuditLog('draw_exported', adminId, drawId, { format }, true);

    return { success: true, data: exportData };

  } catch (error) {
    console.error('[exportDraw] Error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', (error as Error).message);
  }
});

// ==================== GET DRAW SUMMARY ====================

export const getDrawSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { groupId } = data;
  const summaryId = groupId || 'global';

  try {
    const summaryDoc = await db.collection('drawSummaries').doc(summaryId).get();

    if (!summaryDoc.exists) {
      // Generate fresh summary
      await updateDrawSummary(groupId);
      const freshDoc = await db.collection('drawSummaries').doc(summaryId).get();
      return { success: true, summary: { id: freshDoc.id, ...freshDoc.data() } };
    }

    return { success: true, summary: { id: summaryDoc.id, ...summaryDoc.data() } };

  } catch (error) {
    console.error('[getDrawSummary] Error:', error);
    throw new functions.https.HttpsError('internal', (error as Error).message);
  }
});
