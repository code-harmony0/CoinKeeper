/**
 * Payment Gateway Webhook Handler
 * Secure endpoint for processing payment gateway callbacks
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logWebhookAction } from '../utils/auditLogger';
import { MockGatewayAdapter, PaystackAdapter, GatewayWebhookEvent } from '../gateways';

const PAYMENTS_COLLECTION = 'payments';
const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';
const RECONCILIATIONS_COLLECTION = 'paymentReconciliations';

/**
 * Get gateway adapter based on source
 */
const getGatewayAdapter = (source: string) => {
  switch (source) {
    case 'paystack':
      if (!process.env.PAYSTACK_SECRET_KEY) {
        throw new Error('PAYSTACK_SECRET_KEY not configured');
      }
      return new PaystackAdapter({
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        environment: (process.env.PAYSTACK_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      });
    case 'mock':
    default:
      return new MockGatewayAdapter();
  }
};

/**
 * Process successful payment webhook
 */
const handleChargeSuccess = async (
  db: admin.firestore.Firestore,
  event: GatewayWebhookEvent
): Promise<{ reconciled: boolean; paymentId?: string }> => {
  const reference = event.data.reference;
  const amount = event.data.amount;
  const gatewayReference = event.data.gatewayReference;

  // Find matching payment by reference
  const paymentsQuery = await db
    .collection(PAYMENTS_COLLECTION)
    .where('gatewayReference', '==', gatewayReference)
    .limit(1)
    .get();

  let paymentId: string | undefined;
  let reconciled = false;

  if (!paymentsQuery.empty) {
    // Found matching payment
    const paymentDoc = paymentsQuery.docs[0];
    paymentId = paymentDoc.id;

    const paymentData = paymentDoc.data();

    // Check for amount mismatch
    const amountMatch = Math.abs(paymentData.amount - amount) < 0.01;

    await db.collection(PAYMENTS_COLLECTION).doc(paymentId).update({
      status: 'success',
      reconciliationStatus: amountMatch ? 'matched' : 'mismatch',
      reconciliationAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update scheduled payment if exists
    if (paymentData.scheduledPaymentId) {
      await db.collection(SCHEDULED_PAYMENTS_COLLECTION).doc(paymentData.scheduledPaymentId).update({
        status: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Create reconciliation record
    await db.collection(RECONCILIATIONS_COLLECTION).add({
      paymentId,
      scheduledPaymentId: paymentData.scheduledPaymentId || null,
      gatewayReference: gatewayReference || reference,
      gatewayEvent: event.event,
      gatewayName: 'paystack',
      webhookPayload: event.rawPayload,
      status: amountMatch ? 'matched' : 'mismatch',
      matchedAmount: paymentData.amount,
      receivedAmount: amount,
      amountDifference: Math.abs(paymentData.amount - amount),
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    reconciled = true;
  } else {
    // No matching payment found - create unmatched reconciliation
    await db.collection(RECONCILIATIONS_COLLECTION).add({
      paymentId: null,
      scheduledPaymentId: null,
      gatewayReference: gatewayReference || reference,
      gatewayEvent: event.event,
      gatewayName: 'paystack',
      webhookPayload: event.rawPayload,
      status: 'unmatched',
      receivedAmount: amount,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: 'No matching payment found in system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return { reconciled, paymentId };
};

/**
 * Process failed payment webhook
 */
const handleChargeFailed = async (
  db: admin.firestore.Firestore,
  event: GatewayWebhookEvent
): Promise<{ updated: boolean; paymentId?: string }> => {
  const gatewayReference = event.data.gatewayReference || event.data.reference;

  const paymentsQuery = await db
    .collection(PAYMENTS_COLLECTION)
    .where('gatewayReference', '==', gatewayReference)
    .limit(1)
    .get();

  if (paymentsQuery.empty) {
    return { updated: false };
  }

  const paymentDoc = paymentsQuery.docs[0];
  const paymentId = paymentDoc.id;

  await db.collection(PAYMENTS_COLLECTION).doc(paymentId).update({
    status: 'failed',
    gatewayResponse: event.rawPayload,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create reconciliation record
  await db.collection(RECONCILIATIONS_COLLECTION).add({
    paymentId,
    gatewayReference,
    gatewayEvent: event.event,
    gatewayName: 'paystack',
    webhookPayload: event.rawPayload,
    status: 'matched',
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { updated: true, paymentId };
};

/**
 * Paystack Webhook Handler
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  // Only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const signature = req.headers['x-paystack-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  console.log('[paystackWebhook] Received webhook');

  try {
    const gateway = getGatewayAdapter('paystack');

    // Validate signature
    if (!gateway.validateWebhookSignature(rawBody, signature)) {
      console.error('[paystackWebhook] Invalid signature');

      await logWebhookAction(
        'webhook_received',
        'paystack_webhooks',
        'invalid',
        { error: 'Invalid signature' },
        false,
        'Invalid webhook signature'
      );

      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Parse event
    const event = gateway.parseWebhookEvent(req.body);

    console.log(`[paystackWebhook] Event: ${event.event}, Reference: ${event.data.reference}`);

    // Log webhook received
    await logWebhookAction(
      'webhook_received',
      'paystack_webhooks',
      event.data.reference,
      { event: event.event, amount: event.data.amount },
      true
    );

    const db = admin.firestore();

    // Handle event types
    let result: { success: boolean; paymentId?: string };

    switch (event.event) {
      case 'charge.success':
        const successResult = await handleChargeSuccess(db, event);
        result = { success: successResult.reconciled, paymentId: successResult.paymentId };
        break;

      case 'charge.failed':
        const failedResult = await handleChargeFailed(db, event);
        result = { success: failedResult.updated, paymentId: failedResult.paymentId };
        break;

      case 'transfer.success':
      case 'transfer.failed':
        // Handle transfer webhooks if needed
        result = { success: true };
        break;

      default:
        console.log(`[paystackWebhook] Unhandled event type: ${event.event}`);
        result = { success: true };
    }

    await logWebhookAction(
      'webhook_processed',
      PAYMENTS_COLLECTION,
      result.paymentId || event.data.reference,
      { event: event.event, result },
      result.success
    );

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[paystackWebhook] Error:', error);

    await logWebhookAction(
      'webhook_processed',
      'paystack_webhooks',
      'error',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Mock Webhook Handler (for testing)
 */
export const mockWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const signature = req.headers['x-mock-signature'] as string || 'valid-signature';

  try {
    const gateway = new MockGatewayAdapter();

    if (!gateway.validateWebhookSignature(JSON.stringify(req.body), signature)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const event = gateway.parseWebhookEvent(req.body);
    const db = admin.firestore();

    if (event.event === 'charge.success') {
      await handleChargeSuccess(db, event);
    } else if (event.event === 'charge.failed') {
      await handleChargeFailed(db, event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[mockWebhook] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
