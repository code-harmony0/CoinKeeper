/**
 * Draw Execution Engine
 * Core logic for executing draws with locking, tracing, and audit
 */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  Draw,
  DrawJob,
  DrawSettlement,
  DrawExecutionTrace,
  ParticipantSnapshot,
  DrawSummary,
} from './types';
import { executeStrategy, type StrategyType, type SelectionResult } from './strategies';
import { validateDraw, computeParticipantSnapshot, generateDrawJobIdempotencyKey } from './validation';

const db = admin.firestore();

// ==================== DISTRIBUTED LOCK ====================

const LOCK_COLLECTION = 'distributedLocks';
const LOCK_TTL_MS = 60000; // 1 minute

interface ExecutionLock {
  drawId: string;
  acquiredAt: Timestamp;
  expiresAt: Timestamp;
  holder: string;
}

/**
 * Acquire distributed lock for draw execution
 */
export const acquireDrawLock = async (drawId: string): Promise<boolean> => {
  const lockId = `draw_execution_${drawId}`;
  const lockRef = db.collection(LOCK_COLLECTION).doc(lockId);
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + LOCK_TTL_MS);

  try {
    await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);

      if (lockDoc.exists) {
        const lock = lockDoc.data() as ExecutionLock;
        // Check if lock is expired
        if (lock.expiresAt.toMillis() > now.toMillis()) {
          throw new Error('Draw execution already in progress');
        }
      }

      // Acquire lock
      transaction.set(lockRef, {
        drawId,
        acquiredAt: now,
        expiresAt,
        holder: 'draw_engine',
      });
    });

    return true;
  } catch (error) {
    console.error('[acquireDrawLock] Failed:', error);
    return false;
  }
};

/**
 * Release distributed lock
 */
export const releaseDrawLock = async (drawId: string): Promise<void> => {
  const lockId = `draw_execution_${drawId}`;
  try {
    await db.collection(LOCK_COLLECTION).doc(lockId).delete();
  } catch (error) {
    console.error('[releaseDrawLock] Failed:', error);
  }
};

// ==================== DRAW EXECUTION ====================

export interface DrawExecutionResult {
  success: boolean;
  drawId: string;
  winnerId?: string;
  winnerName?: string;
  trace?: DrawExecutionTrace;
  settlement?: DrawSettlement;
  error?: string;
}

/**
 * Execute a scheduled draw
 */
export const executeDraw = async (
  drawId: string,
  executedBy: string = 'system',
  overrideSeed?: string
): Promise<DrawExecutionResult> => {
  const startTime = Date.now();

  // Step 1: Acquire lock
  const lockAcquired = await acquireDrawLock(drawId);
  if (!lockAcquired) {
    return {
      success: false,
      drawId,
      error: 'Failed to acquire execution lock - draw may already be running',
    };
  }

  try {
    // Step 2: Fetch draw
    const drawRef = db.collection('draws').doc(drawId);
    const drawDoc = await drawRef.get();

    if (!drawDoc.exists) {
      return { success: false, drawId, error: 'Draw not found' };
    }

    const draw = { id: drawDoc.id, ...drawDoc.data() } as Draw;

    // Step 3: Validate status
    if (draw.status !== 'scheduled' && draw.status !== 'open') {
      return {
        success: false,
        drawId,
        error: `Invalid draw status for execution: ${draw.status}`,
      };
    }

    // Step 4: Mark as executing
    await drawRef.update({
      status: 'executing',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Step 5: Validate draw
    const validation = await validateDraw(draw);
    if (!validation.isValid) {
      await drawRef.update({
        status: 'cancelled',
        cancellationReason: validation.errors.join('; '),
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: false, drawId, error: validation.errors.join('; ') };
    }

    // Step 6: Capture participant snapshot
    const participants = await computeParticipantSnapshot(
      draw.groupId,
      draw.scheduledAt as Timestamp
    );

    const eligibleParticipants = participants.filter(p => p.isEligible);
    if (eligibleParticipants.length === 0) {
      await drawRef.update({
        status: 'cancelled',
        cancellationReason: 'No eligible participants',
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: false, drawId, error: 'No eligible participants' };
    }

    // Step 7: Execute selection strategy
    const selectionResult = executeStrategy(
      draw.strategy as StrategyType,
      eligibleParticipants,
      { seed: overrideSeed }
    );

    // Step 8: Find winner details
    const winner = eligibleParticipants.find(p => p.memberId === selectionResult.winnerId);
    if (!winner) {
      return { success: false, drawId, error: 'Winner not found in participants' };
    }

    // Step 9: Build execution trace
    const executedAt = Timestamp.now();
    const trace: DrawExecutionTrace = {
      seed: selectionResult.seed,
      algorithm: selectionResult.algorithm,
      rngSource: 'seeded',
      participantCount: eligibleParticipants.length,
      selectionSteps: selectionResult.steps,
      winnerId: winner.memberId,
      winnerIndex: selectionResult.winnerIndex,
      executedBy,
      executedAt,
      durationMs: Date.now() - startTime,
      verified: true,
    };

    // Step 10: Create settlement
    const settlementRef = db.collection('drawSettlements').doc();
    const settlement: Omit<DrawSettlement, 'id'> = {
      drawId,
      drawNumber: draw.drawNumber,
      groupId: draw.groupId,
      winnerId: winner.memberId,
      winnerName: winner.memberName,
      winnerPhone: winner.memberPhone,
      amount: draw.totalPrizeAmount,
      deductions: 0,
      netAmount: draw.totalPrizeAmount,
      method: 'wallet',
      status: 'pending',
      initiatedBy: executedBy,
      initiatedAt: executedAt,
      retryCount: 0,
      maxRetries: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Step 11: Atomic update - draw completion + settlement creation
    const batch = db.batch();

    // Update draw
    batch.update(drawRef, {
      status: 'completed',
      executedAt,
      completedAt: executedAt,
      winnerId: winner.memberId,
      winnerName: winner.memberName,
      winningBid: (winner as any).bidAmount || 0,
      participantSnapshot: participants,
      participantCount: participants.length,
      executionTrace: trace,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create settlement
    batch.set(settlementRef, settlement);

    // Create audit log
    const auditRef = db.collection('auditLogs').doc();
    batch.set(auditRef, {
      action: 'draw_executed',
      actorId: executedBy,
      actorType: executedBy === 'system' ? 'scheduler' : 'admin',
      targetCollection: 'draws',
      targetId: drawId,
      payload: {
        drawNumber: draw.drawNumber,
        groupId: draw.groupId,
        winnerId: winner.memberId,
        winnerName: winner.memberName,
        prizeAmount: draw.totalPrizeAmount,
        strategy: draw.strategy,
        participantCount: eligibleParticipants.length,
        seed: selectionResult.seed,
      },
      success: true,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Step 12: Update cached summary (async, non-blocking)
    updateDrawSummary(draw.groupId).catch(err => {
      console.error('[executeDraw] Failed to update summary:', err);
    });

    return {
      success: true,
      drawId,
      winnerId: winner.memberId,
      winnerName: winner.memberName,
      trace,
      settlement: { id: settlementRef.id, ...settlement } as DrawSettlement,
    };

  } catch (error) {
    console.error('[executeDraw] Error:', error);

    // Mark draw as failed
    try {
      await db.collection('draws').doc(drawId).update({
        status: 'cancelled',
        cancellationReason: `Execution error: ${(error as Error).message}`,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error('[executeDraw] Failed to update status:', updateError);
    }

    return {
      success: false,
      drawId,
      error: (error as Error).message,
    };

  } finally {
    await releaseDrawLock(drawId);
  }
};

// ==================== DRAW JOB MANAGEMENT ====================

/**
 * Create a scheduled draw job
 */
export const createDrawJob = async (
  drawId: string,
  groupId: string,
  scheduledFor: Timestamp
): Promise<DrawJob> => {
  const idempotencyKey = generateDrawJobIdempotencyKey(drawId, scheduledFor);

  // Check for existing job with same idempotency key
  const existingJob = await db
    .collection('drawJobs')
    .where('idempotencyKey', '==', idempotencyKey)
    .limit(1)
    .get();

  if (!existingJob.empty) {
    console.log('[createDrawJob] Job already exists with idempotency key:', idempotencyKey);
    return { id: existingJob.docs[0].id, ...existingJob.docs[0].data() } as DrawJob;
  }

  const jobRef = db.collection('drawJobs').doc();
  const job: Omit<DrawJob, 'id'> = {
    drawId,
    groupId,
    idempotencyKey,
    scheduledFor,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await jobRef.set(job);
  return { id: jobRef.id, ...job } as DrawJob;
};

/**
 * Process a single draw job
 */
export const processDrawJob = async (jobId: string): Promise<void> => {
  const jobRef = db.collection('drawJobs').doc(jobId);

  await db.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef);
    if (!jobDoc.exists) {
      throw new Error('Draw job not found');
    }

    const job = jobDoc.data() as DrawJob;

    if (job.status !== 'pending') {
      console.log('[processDrawJob] Job not pending, skipping:', job.status);
      return;
    }

    // Mark as processing
    transaction.update(jobRef, {
      status: 'processing',
      startedAt: FieldValue.serverTimestamp(),
      lastAttemptAt: FieldValue.serverTimestamp(),
      attempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // Execute draw (outside transaction for better error handling)
  const jobDoc = await jobRef.get();
  const job = jobDoc.data() as DrawJob;

  const result = await executeDraw(job.drawId);

  if (result.success) {
    await jobRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      resultDrawId: result.drawId,
      resultWinnerId: result.winnerId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Calculate retry with exponential backoff
    const attempts = job.attempts + 1;
    const shouldRetry = attempts < job.maxAttempts;

    if (shouldRetry) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 3600000); // Max 1 hour
      const nextRetry = Timestamp.fromMillis(Date.now() + backoffMs);

      await jobRef.update({
        status: 'pending',
        nextRetryAt: nextRetry,
        lastError: result.error,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await jobRef.update({
        status: 'failed',
        lastError: result.error,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Log failure for admin visibility
      await db.collection('auditLogs').add({
        action: 'draw_job_failed',
        actorId: 'system',
        actorType: 'scheduler',
        targetCollection: 'drawJobs',
        targetId: jobId,
        payload: {
          drawId: job.drawId,
          attempts,
          error: result.error,
        },
        success: false,
        errorMessage: result.error,
        timestamp: FieldValue.serverTimestamp(),
      });
    }
  }
};

// ==================== SUMMARY CACHE ====================

/**
 * Update cached draw summary for a group
 */
export const updateDrawSummary = async (groupId?: string): Promise<void> => {
  const summaryId = groupId || 'global';

  try {
    // Query draws
    let query = db.collection('draws') as admin.firestore.Query;
    if (groupId) {
      query = query.where('groupId', '==', groupId);
    }
    const drawsSnapshot = await query.get();

    const draws = drawsSnapshot.docs.map(doc => doc.data() as Draw);

    // Calculate metrics
    const totalDraws = draws.length;
    const activeDraws = draws.filter(d => d.status === 'scheduled' || d.status === 'open').length;
    const scheduledDraws = draws.filter(d => d.status === 'scheduled').length;
    const completedDraws = draws.filter(d => d.status === 'completed').length;
    const cancelledDraws = draws.filter(d => d.status === 'cancelled').length;

    const completedWithPrize = draws.filter(d => d.status === 'completed' && d.totalPrizeAmount > 0);
    const totalPrizeDisbursed = completedWithPrize.reduce((sum, d) => sum + d.totalPrizeAmount, 0);

    // Pending settlements
    let settlementsQuery = db.collection('drawSettlements').where('status', 'in', ['pending', 'processing']);
    if (groupId) {
      settlementsQuery = settlementsQuery.where('groupId', '==', groupId);
    }
    const settlementsSnapshot = await settlementsQuery.get();
    const pendingSettlements = settlementsSnapshot.size;
    const pendingSettlementAmount = settlementsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().netAmount || 0),
      0
    );

    // Dates
    const completedDrawsSorted = completedWithPrize
      .filter(d => d.completedAt)
      .sort((a, b) => (b.completedAt as Timestamp).toMillis() - (a.completedAt as Timestamp).toMillis());
    const lastDrawDate = completedDrawsSorted[0]?.completedAt;

    const scheduledDrawsSorted = draws
      .filter(d => d.status === 'scheduled' && d.scheduledAt)
      .sort((a, b) => (a.scheduledAt as Timestamp).toMillis() - (b.scheduledAt as Timestamp).toMillis());
    const nextScheduledDraw = scheduledDrawsSorted[0]?.scheduledAt;

    // Metrics
    const winningBids = draws.filter(d => d.winningBid).map(d => d.winningBid!);
    const averageWinningBid = winningBids.length > 0
      ? winningBids.reduce((sum, b) => sum + b, 0) / winningBids.length
      : 0;

    const drawsWithParticipants = draws.filter(d => d.participantCount > 0);
    const participationRate = drawsWithParticipants.length > 0
      ? drawsWithParticipants.reduce((sum, d) => sum + d.participantCount, 0) / drawsWithParticipants.length
      : 0;

    const completedSettlements = await db
      .collection('drawSettlements')
      .where('status', '==', 'completed')
      .get();
    const settlementSuccessRate = completedDraws > 0
      ? (completedSettlements.size / completedDraws) * 100
      : 0;

    // Get existing version
    const existingDoc = await db.collection('drawSummaries').doc(summaryId).get();
    const version = existingDoc.exists ? (existingDoc.data()?.version || 0) + 1 : 1;

    // Update summary
    const summary: DrawSummary = {
      id: summaryId,
      groupId,
      totalDraws,
      activeDraws,
      scheduledDraws,
      completedDraws,
      cancelledDraws,
      totalPrizeDisbursed,
      pendingSettlements,
      pendingSettlementAmount,
      lastDrawDate,
      nextScheduledDraw,
      averageWinningBid,
      participationRate,
      settlementSuccessRate,
      updatedAt: FieldValue.serverTimestamp(),
      version,
    };

    await db.collection('drawSummaries').doc(summaryId).set(summary);

  } catch (error) {
    console.error('[updateDrawSummary] Error:', error);
    throw error;
  }
};
