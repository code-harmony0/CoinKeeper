/**
 * Process Auto-Debits
 * Scheduled job to execute auto-debit payments with distributed locking
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSchedulerAction } from '../utils/auditLogger';
import { withLock } from '../utils/distributedLock';
import { withConditionalRetry, DEFAULT_RETRY_CONFIG } from '../utils/retryPolicy';
import { MockGatewayAdapter, PaystackAdapter, GatewayChargeRequest } from '../gateways';

const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';
const AUTO_DEBIT_JOBS_COLLECTION = 'autoDebitJobs';
const PAYMENTS_COLLECTION = 'payments';
const AUTO_DEBIT_CONSENT_COLLECTION = 'autoDebitConsent';

interface AutoDebitJobData {
  id: string;
  idempotencyKey: string;
  scheduledPaymentId: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  groupId: string;
  groupName: string;
  amount: number;
  status: string;
  attempts: number;
  maxAttempts: number;
  consentVerified: boolean;
  bankToken?: string;
  scheduledFor: admin.firestore.Timestamp;
}

interface ConsentData {
  memberId: string;
  groupId: string;
  enabled: boolean;
  bankToken: string;
  expiresAt?: admin.firestore.Timestamp;
  revokedAt?: admin.firestore.Timestamp;
}

/**
 * Generate payment reference
 */
const generatePaymentReference = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AD_${timestamp}_${random}`;
};

/**
 * Get payment gateway adapter
 */
const getGatewayAdapter = () => {
  const environment = process.env.PAYMENT_ENVIRONMENT;

  if (environment === 'production' && process.env.PAYSTACK_SECRET_KEY) {
    return new PaystackAdapter({
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      environment: 'production',
    });
  }

  // Default to mock for development
  return new MockGatewayAdapter();
};

/**
 * Process a single auto-debit job
 */
const processAutoDebitJob = async (
  job: AutoDebitJobData,
  gateway: ReturnType<typeof getGatewayAdapter>
): Promise<{ success: boolean; paymentId?: string; error?: string }> => {
  const db = admin.firestore();
  const reference = generatePaymentReference();

  try {
    // Prepare charge request
    const chargeRequest: GatewayChargeRequest & { authorizationCode: string } = {
      amount: job.amount,
      currency: 'NGN',
      email: job.memberEmail || `${job.memberId}@placeholder.com`,
      reference,
      description: `Auto-debit for ${job.groupName}`,
      authorizationCode: job.bankToken || '',
      metadata: {
        scheduledPaymentId: job.scheduledPaymentId,
        memberId: job.memberId,
        groupId: job.groupId,
        jobId: job.id,
      },
    };

    // Execute charge with retry
    const chargeResponse = await withConditionalRetry(
      () => gateway.chargeAuthorization!(chargeRequest),
      DEFAULT_RETRY_CONFIG
    );

    if (chargeResponse.success && chargeResponse.status === 'success') {
      // Create payment record
      const paymentRef = await db.collection(PAYMENTS_COLLECTION).add({
        scheduledPaymentId: job.scheduledPaymentId,
        memberId: job.memberId,
        memberName: job.memberName,
        groupId: job.groupId,
        groupName: job.groupName,
        amount: job.amount,
        method: 'auto_debit',
        status: 'success',
        gatewayReference: chargeResponse.gatewayReference,
        gatewayResponse: chargeResponse.rawResponse,
        reconciliationStatus: 'pending',
        processedBy: 'system',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update scheduled payment
      await db.collection(SCHEDULED_PAYMENTS_COLLECTION).doc(job.scheduledPaymentId).update({
        status: 'paid',
        paymentId: paymentRef.id,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, paymentId: paymentRef.id };
    }

    return {
      success: false,
      error: chargeResponse.message || 'Charge failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Process Auto-Debits
 * Runs every 15 minutes
 */
export const processAutoDebits = functions.pubsub
  .schedule('*/15 * * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    console.log('[processAutoDebits] Starting auto-debit processing');

    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    try {
      const gateway = getGatewayAdapter();

      // Get pending auto-debit jobs scheduled for now or earlier
      const pendingJobs = await db
        .collection(AUTO_DEBIT_JOBS_COLLECTION)
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now)
        .orderBy('scheduledFor', 'asc')
        .limit(50) // Process in batches
        .get();

      console.log(`[processAutoDebits] Found ${pendingJobs.size} pending jobs`);

      for (const jobDoc of pendingJobs.docs) {
        const job = { id: jobDoc.id, ...jobDoc.data() } as AutoDebitJobData;
        const lockKey = `auto_debit_${job.idempotencyKey}`;

        try {
          // Use distributed lock to prevent concurrent processing
          await withLock(
            lockKey,
            async () => {
              // Re-fetch job to check current status
              const currentJob = await db.collection(AUTO_DEBIT_JOBS_COLLECTION).doc(job.id).get();
              const currentData = currentJob.data() as AutoDebitJobData;

              if (currentData.status !== 'pending') {
                console.log(`[processAutoDebits] Job ${job.id} already processed, skipping`);
                skipped++;
                return;
              }

              // Verify consent
              const consent = await db
                .collection(AUTO_DEBIT_CONSENT_COLLECTION)
                .where('memberId', '==', job.memberId)
                .where('groupId', '==', job.groupId)
                .where('enabled', '==', true)
                .limit(1)
                .get();

              if (consent.empty) {
                // No valid consent, skip
                await db.collection(AUTO_DEBIT_JOBS_COLLECTION).doc(job.id).update({
                  status: 'skipped',
                  lastError: 'No valid consent found',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                await logSchedulerAction(
                  'auto_debit_skipped',
                  AUTO_DEBIT_JOBS_COLLECTION,
                  job.id,
                  { reason: 'No valid consent' },
                  true
                );

                skipped++;
                return;
              }

              const consentData = consent.docs[0].data() as ConsentData;

              // Check consent expiry
              if (consentData.expiresAt && consentData.expiresAt.toMillis() < Date.now()) {
                await db.collection(AUTO_DEBIT_JOBS_COLLECTION).doc(job.id).update({
                  status: 'skipped',
                  lastError: 'Consent expired',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                skipped++;
                return;
              }

              // Mark as processing
              await db.collection(AUTO_DEBIT_JOBS_COLLECTION).doc(job.id).update({
                status: 'processing',
                bankToken: consentData.bankToken,
                attempts: admin.firestore.FieldValue.increment(1),
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Process the job
              const result = await processAutoDebitJob(
                { ...job, bankToken: consentData.bankToken },
                gateway
              );

              processed++;

              if (result.success) {
                await db.collection(AUTO_DEBIT_JOBS_COLLECTION).doc(job.id).update({
                  status: 'success',
                  paymentId: result.paymentId,
                  completedAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                await logSchedulerAction(
                  'auto_debit_success',
                  AUTO_DEBIT_JOBS_COLLECTION,
                  job.id,
                  { paymentId: result.paymentId },
                  true
                );

                successful++;
              } else {
                const attempts = (currentData.attempts || 0) + 1;
                const maxAttempts = currentData.maxAttempts || 3;

                if (attempts >= maxAttempts) {
                  // Max attempts reached, mark as failed
                  await db.collection(AUTO_DEBIT_JOBS_COLLECTION).doc(job.id).update({
                    status: 'failed',
                    lastError: result.error,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  await logSchedulerAction(
                    'auto_debit_failed',
                    AUTO_DEBIT_JOBS_COLLECTION,
                    job.id,
                    { error: result.error, attempts },
                    false,
                    result.error
                  );
                } else {
                  // Schedule retry
                  const nextRetry = new Date();
                  nextRetry.setMinutes(nextRetry.getMinutes() + 30 * attempts);

                  await db.collection(AUTO_DEBIT_JOBS_COLLECTION).doc(job.id).update({
                    status: 'pending',
                    lastError: result.error,
                    nextRetryAt: admin.firestore.Timestamp.fromDate(nextRetry),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }

                failed++;
              }
            },
            { lockTimeoutMs: 120000, acquireTimeoutMs: 5000 }
          );
        } catch (lockError) {
          console.error(`[processAutoDebits] Error processing job ${job.id}:`, lockError);
          failed++;
        }
      }

      await logSchedulerAction(
        'auto_debit_attempt',
        AUTO_DEBIT_JOBS_COLLECTION,
        'batch',
        { processed, successful, failed, skipped },
        failed === 0
      );

      console.log(
        `[processAutoDebits] Completed: processed=${processed}, successful=${successful}, failed=${failed}, skipped=${skipped}`
      );

      return { processed, successful, failed, skipped };
    } catch (error) {
      console.error('[processAutoDebits] Fatal error:', error);
      throw error;
    }
  });

/**
 * Create auto-debit jobs for upcoming payments
 */
export const createAutoDebitJobs = functions.pubsub
  .schedule('0 */2 * * *') // Every 2 hours
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1); // Create jobs for payments due tomorrow

    console.log('[createAutoDebitJobs] Creating auto-debit jobs');

    let created = 0;
    let skipped = 0;

    try {
      // Get payments due tomorrow with auto-debit enabled
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const payments = await db
        .collection(SCHEDULED_PAYMENTS_COLLECTION)
        .where('autoDebitEnabled', '==', true)
        .where('status', '==', 'pending')
        .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();

      console.log(`[createAutoDebitJobs] Found ${payments.size} eligible payments`);

      for (const paymentDoc of payments.docs) {
        const payment = paymentDoc.data();
        const idempotencyKey = `${payment.memberId}_${payment.groupId}_${payment.dueDate.toDate().toISOString().split('T')[0]}`;

        // Check if job already exists
        const existingJob = await db
          .collection(AUTO_DEBIT_JOBS_COLLECTION)
          .where('idempotencyKey', '==', idempotencyKey)
          .limit(1)
          .get();

        if (!existingJob.empty) {
          skipped++;
          continue;
        }

        // Create job
        await db.collection(AUTO_DEBIT_JOBS_COLLECTION).add({
          idempotencyKey,
          scheduledPaymentId: paymentDoc.id,
          memberId: payment.memberId,
          memberName: payment.memberName,
          memberEmail: payment.memberEmail || null,
          groupId: payment.groupId,
          groupName: payment.groupName,
          amount: payment.amount,
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
          consentVerified: false,
          scheduledFor: payment.dueDate,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await logSchedulerAction(
          'auto_debit_job_created',
          AUTO_DEBIT_JOBS_COLLECTION,
          idempotencyKey,
          { scheduledPaymentId: paymentDoc.id },
          true
        );

        created++;
      }

      console.log(`[createAutoDebitJobs] Completed: created=${created}, skipped=${skipped}`);

      return { created, skipped };
    } catch (error) {
      console.error('[createAutoDebitJobs] Error:', error);
      throw error;
    }
  });
