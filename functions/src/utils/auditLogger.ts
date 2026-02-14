/**
 * Audit Logger Utility
 * Comprehensive audit trail for all payment operations
 */

import * as admin from 'firebase-admin';

export type AuditActorType = 'admin' | 'system' | 'scheduler' | 'webhook';

export type AuditAction =
  | 'scheduled_payment_created'
  | 'scheduled_payment_updated'
  | 'scheduled_payment_reminded'
  | 'scheduled_payment_marked_overdue'
  | 'scheduled_payment_marked_paid'
  | 'payment_initiated'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_refunded'
  | 'payment_reprocessed'
  | 'auto_debit_job_created'
  | 'auto_debit_attempt'
  | 'auto_debit_success'
  | 'auto_debit_failed'
  | 'auto_debit_skipped'
  | 'reminder_sent'
  | 'reminder_failed'
  | 'late_fee_applied'
  | 'member_suspended'
  | 'reconciliation_matched'
  | 'reconciliation_mismatch'
  | 'manual_reconciliation'
  | 'manual_adjustment'
  | 'escalation_triggered'
  | 'admin_override'
  | 'webhook_received'
  | 'webhook_processed';

export interface AuditLogInput {
  action: AuditAction;
  actorId: string;
  actorType: AuditActorType;
  actorName?: string;
  targetCollection: string;
  targetId: string;
  targetName?: string;
  payload: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const AUDIT_LOG_COLLECTION = 'auditLogs';

/**
 * Write an audit log entry
 */
export const writeAuditLog = async (input: AuditLogInput): Promise<string> => {
  const db = admin.firestore();

  const logEntry = {
    ...input,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection(AUDIT_LOG_COLLECTION).add(logEntry);
  return docRef.id;
};

/**
 * Write audit log within a batch/transaction
 */
export const writeAuditLogInBatch = (
  batch: admin.firestore.WriteBatch,
  input: AuditLogInput
): admin.firestore.DocumentReference => {
  const db = admin.firestore();
  const docRef = db.collection(AUDIT_LOG_COLLECTION).doc();

  batch.set(docRef, {
    ...input,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef;
};

/**
 * Create a system audit log entry
 */
export const logSystemAction = async (
  action: AuditAction,
  targetCollection: string,
  targetId: string,
  payload: Record<string, unknown>,
  success: boolean,
  errorMessage?: string
): Promise<string> => {
  return writeAuditLog({
    action,
    actorId: 'system',
    actorType: 'system',
    targetCollection,
    targetId,
    payload,
    success,
    errorMessage,
  });
};

/**
 * Create a scheduler audit log entry
 */
export const logSchedulerAction = async (
  action: AuditAction,
  targetCollection: string,
  targetId: string,
  payload: Record<string, unknown>,
  success: boolean,
  errorMessage?: string
): Promise<string> => {
  return writeAuditLog({
    action,
    actorId: 'scheduler',
    actorType: 'scheduler',
    targetCollection,
    targetId,
    payload,
    success,
    errorMessage,
  });
};

/**
 * Create a webhook audit log entry
 */
export const logWebhookAction = async (
  action: AuditAction,
  targetCollection: string,
  targetId: string,
  payload: Record<string, unknown>,
  success: boolean,
  errorMessage?: string
): Promise<string> => {
  return writeAuditLog({
    action,
    actorId: 'webhook',
    actorType: 'webhook',
    targetCollection,
    targetId,
    payload,
    success,
    errorMessage,
  });
};

/**
 * Create an admin action audit log
 */
export const logAdminAction = async (
  adminId: string,
  adminName: string,
  action: AuditAction,
  targetCollection: string,
  targetId: string,
  payload: Record<string, unknown>,
  previousState?: Record<string, unknown>,
  newState?: Record<string, unknown>
): Promise<string> => {
  return writeAuditLog({
    action,
    actorId: adminId,
    actorType: 'admin',
    actorName: adminName,
    targetCollection,
    targetId,
    payload,
    previousState,
    newState,
    success: true,
  });
};
