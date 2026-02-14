/**
 * Admin API Endpoints
 * Secure endpoints for manual payment operations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logAdminAction } from '../utils/auditLogger';
import { withConditionalRetry, DEFAULT_RETRY_CONFIG } from '../utils/retryPolicy';
import { MockGatewayAdapter, PaystackAdapter, GatewayChargeRequest } from '../gateways';

const PAYMENTS_COLLECTION = 'payments';
const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';
const CONTRIBUTIONS_COLLECTION = 'contributions';
const RECONCILIATIONS_COLLECTION = 'paymentReconciliations';

interface AdminRequestContext {
  adminId: string;
  adminName: string;
}

/**
 * Verify admin authentication
 */
const verifyAdmin = async (req: functions.https.Request): Promise<AdminRequestContext | null> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (!decodedToken.admin) {
      return null;
    }

    return {
      adminId: decodedToken.uid,
      adminName: decodedToken.name || decodedToken.email || 'Admin',
    };
  } catch (error) {
    console.error('[verifyAdmin] Token verification failed:', error);
    return null;
  }
};

/**
 * Get gateway adapter
 */
const getGatewayAdapter = () => {
  if (process.env.PAYSTACK_SECRET_KEY && process.env.PAYMENT_ENVIRONMENT === 'production') {
    return new PaystackAdapter({
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      environment: 'production',
    });
  }
  return new MockGatewayAdapter();
};

/**
 * Reprocess Failed Payment
 * POST /admin/reprocess
 */
export const reprocessPayment = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminContext = await verifyAdmin(req);
  if (!adminContext) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { paymentId } = req.body;

  if (!paymentId) {
    res.status(400).json({ error: 'paymentId is required' });
    return;
  }

  const db = admin.firestore();

  try {
    // Get payment
    const paymentDoc = await db.collection(PAYMENTS_COLLECTION).doc(paymentId).get();

    if (!paymentDoc.exists) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const payment = paymentDoc.data()!;

    if (payment.status !== 'failed') {
      res.status(400).json({ error: 'Only failed payments can be reprocessed' });
      return;
    }

    // Generate new reference
    const newReference = `REPROCESS_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Attempt recharge
    const gateway = getGatewayAdapter();

    const chargeRequest: GatewayChargeRequest = {
      amount: payment.amount,
      currency: 'NGN',
      email: payment.memberEmail || `${payment.memberId}@placeholder.com`,
      reference: newReference,
      metadata: {
        originalPaymentId: paymentId,
        reprocessedBy: adminContext.adminId,
        reprocessedAt: new Date().toISOString(),
      },
    };

    const chargeResult = await withConditionalRetry(
      () => gateway.initializeCharge(chargeRequest),
      DEFAULT_RETRY_CONFIG
    );

    // Update payment
    await db.collection(PAYMENTS_COLLECTION).doc(paymentId).update({
      status: chargeResult.success ? 'initiated' : 'failed',
      gatewayReference: chargeResult.gatewayReference,
      gatewayResponse: chargeResult.rawResponse,
      reprocessedBy: adminContext.adminId,
      reprocessedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log admin action
    await logAdminAction(
      adminContext.adminId,
      adminContext.adminName,
      'payment_reprocessed',
      PAYMENTS_COLLECTION,
      paymentId,
      { newReference, chargeResult: { success: chargeResult.success } },
      { status: 'failed' },
      { status: chargeResult.success ? 'initiated' : 'failed' }
    );

    res.json({
      success: chargeResult.success,
      paymentId,
      newReference,
      authorizationUrl: chargeResult.authorizationUrl,
      message: chargeResult.success
        ? 'Payment reprocessed successfully'
        : 'Reprocess failed: ' + chargeResult.message,
    });
  } catch (error) {
    console.error('[reprocessPayment] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Manual Reconciliation
 * POST /admin/reconcile
 */
export const manualReconcile = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminContext = await verifyAdmin(req);
  if (!adminContext) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { paymentId, reconciliationId, action, notes } = req.body;

  if (!reconciliationId || !action) {
    res.status(400).json({ error: 'reconciliationId and action are required' });
    return;
  }

  const db = admin.firestore();

  try {
    const reconciliationDoc = await db.collection(RECONCILIATIONS_COLLECTION).doc(reconciliationId).get();

    if (!reconciliationDoc.exists) {
      res.status(404).json({ error: 'Reconciliation record not found' });
      return;
    }

    const reconciliation = reconciliationDoc.data()!;

    switch (action) {
      case 'approve':
        // Mark as manually reconciled
        await db.collection(RECONCILIATIONS_COLLECTION).doc(reconciliationId).update({
          status: 'matched',
          manuallyReconciledBy: adminContext.adminId,
          manuallyReconciledAt: admin.firestore.FieldValue.serverTimestamp(),
          notes: notes || 'Manually approved by admin',
        });

        // Update payment if exists
        if (paymentId || reconciliation.paymentId) {
          const targetPaymentId = paymentId || reconciliation.paymentId;
          await db.collection(PAYMENTS_COLLECTION).doc(targetPaymentId).update({
            status: 'success',
            reconciliationStatus: 'manual',
            reconciliationAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;

      case 'reject':
        await db.collection(RECONCILIATIONS_COLLECTION).doc(reconciliationId).update({
          status: 'mismatch',
          manuallyReconciledBy: adminContext.adminId,
          manuallyReconciledAt: admin.firestore.FieldValue.serverTimestamp(),
          notes: notes || 'Manually rejected by admin',
        });
        break;

      default:
        res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
        return;
    }

    await logAdminAction(
      adminContext.adminId,
      adminContext.adminName,
      'manual_reconciliation',
      RECONCILIATIONS_COLLECTION,
      reconciliationId,
      { action, notes, paymentId },
      { status: reconciliation.status },
      { status: action === 'approve' ? 'matched' : 'mismatch' }
    );

    res.json({
      success: true,
      reconciliationId,
      action,
      message: `Reconciliation ${action}d successfully`,
    });
  } catch (error) {
    console.error('[manualReconcile] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create Manual Adjustment
 * POST /admin/adjustment
 */
export const createAdjustment = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminContext = await verifyAdmin(req);
  if (!adminContext) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { memberId, groupId, amount, type, reason, scheduledPaymentId } = req.body;

  if (!memberId || !groupId || !amount || !type || !reason) {
    res.status(400).json({
      error: 'memberId, groupId, amount, type, and reason are required',
    });
    return;
  }

  if (!['credit', 'debit'].includes(type)) {
    res.status(400).json({ error: 'type must be "credit" or "debit"' });
    return;
  }

  const db = admin.firestore();

  try {
    const batch = db.batch();

    // Create adjustment payment record
    const paymentRef = db.collection(PAYMENTS_COLLECTION).doc();
    batch.set(paymentRef, {
      scheduledPaymentId: scheduledPaymentId || null,
      memberId,
      groupId,
      amount: Math.abs(amount),
      method: 'manual',
      status: 'success',
      reconciliationStatus: 'manual',
      processedBy: adminContext.adminId,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        adjustmentType: type,
        reason,
        adjustedBy: adminContext.adminId,
      },
    });

    // Update scheduled payment if provided
    if (scheduledPaymentId && type === 'credit') {
      const scheduledPaymentRef = db.collection(SCHEDULED_PAYMENTS_COLLECTION).doc(scheduledPaymentId);
      batch.update(scheduledPaymentRef, {
        status: 'paid',
        paymentId: paymentRef.id,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Create/update contribution record
    if (type === 'credit') {
      const contributionRef = db.collection(CONTRIBUTIONS_COLLECTION).doc();
      batch.set(contributionRef, {
        groupId,
        userId: memberId,
        amount: Math.abs(amount),
        status: 'paid',
        paymentMethod: 'admin_adjustment',
        transactionId: paymentRef.id,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: adminContext.adminId,
        notes: reason,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    await logAdminAction(
      adminContext.adminId,
      adminContext.adminName,
      'manual_adjustment',
      PAYMENTS_COLLECTION,
      paymentRef.id,
      { memberId, groupId, amount, type, reason, scheduledPaymentId }
    );

    res.json({
      success: true,
      paymentId: paymentRef.id,
      message: `Manual ${type} adjustment of ${amount} created successfully`,
    });
  } catch (error) {
    console.error('[createAdjustment] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get Reconciliation Queue
 * GET /admin/reconciliation-queue
 */
export const getReconciliationQueue = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminContext = await verifyAdmin(req);
  if (!adminContext) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const db = admin.firestore();

  try {
    const pendingReconciliations = await db
      .collection(RECONCILIATIONS_COLLECTION)
      .where('status', 'in', ['unmatched', 'mismatch'])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const queue = pendingReconciliations.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      count: queue.length,
      queue,
    });
  } catch (error) {
    console.error('[getReconciliationQueue] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
