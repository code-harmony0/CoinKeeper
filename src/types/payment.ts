/**
 * Payment Module Types
 * Complete type definitions for the Collection Management module
 */

import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ==================== STATUS ENUMS ====================

export type PaymentStatus = 'initiated' | 'success' | 'failed' | 'refunded';
export type ScheduledPaymentStatus = 'pending' | 'reminded' | 'processing' | 'paid' | 'overdue' | 'failed' | 'skipped';
export type AutoDebitJobStatus = 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
export type ReconciliationStatus = 'pending' | 'matched' | 'unmatched' | 'mismatch' | 'duplicate' | 'manual';
export type NotificationChannel = 'sms' | 'whatsapp' | 'push' | 'email';
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type AuditActorType = 'admin' | 'system' | 'scheduler' | 'webhook';
export type PaymentMethod = 'manual' | 'auto_debit' | 'gateway' | 'cash' | 'bank_transfer' | 'upi' | 'card';
export type KYCStatus = 'pending' | 'verified' | 'rejected' | 'expired';

// ==================== CORE PAYMENT TYPES ====================

/**
 * Scheduled Payment - Precomputed upcoming payment entry
 * Stored in `scheduledPayments/` collection
 */
export interface ScheduledPayment {
  id: string;
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberEmail?: string;
  amount: number;
  dueDate: FirebaseFirestoreTypes.Timestamp;
  cycleNumber: number;
  status: ScheduledPaymentStatus;
  autoDebitEnabled: boolean;
  remindersSent: number;
  lastReminderAt?: FirebaseFirestoreTypes.Timestamp;
  overdueAt?: FirebaseFirestoreTypes.Timestamp;
  paidAt?: FirebaseFirestoreTypes.Timestamp;
  paymentId?: string;
  lateFeeAmount?: number;
  lateFeeApplied: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Payment - Concrete payment event record
 * Stored in `payments/` collection
 */
export interface Payment {
  id: string;
  scheduledPaymentId?: string;
  memberId: string;
  memberName: string;
  groupId: string;
  groupName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayReference?: string;
  gatewayResponse?: Record<string, unknown>;
  transactionId?: string;
  processedBy?: string;
  processedAt?: FirebaseFirestoreTypes.Timestamp;
  reconciliationStatus: ReconciliationStatus;
  reconciliationAt?: FirebaseFirestoreTypes.Timestamp;
  reconciliationId?: string;
  refundedAt?: FirebaseFirestoreTypes.Timestamp;
  refundReason?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  metadata?: Record<string, unknown>;
}

/**
 * Create Payment Payload
 */
export interface CreatePaymentData {
  scheduledPaymentId?: string;
  memberId: string;
  memberName: string;
  groupId: string;
  groupName: string;
  amount: number;
  method: PaymentMethod;
  gatewayReference?: string;
  processedBy?: string;
  metadata?: Record<string, unknown>;
}

// ==================== AUTO-DEBIT TYPES ====================

/**
 * Auto-Debit Job - Execution record with idempotency
 * Stored in `autoDebitJobs/` collection
 */
export interface AutoDebitJob {
  id: string;
  idempotencyKey: string;
  scheduledPaymentId: string;
  memberId: string;
  memberName: string;
  groupId: string;
  groupName: string;
  amount: number;
  status: AutoDebitJobStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: FirebaseFirestoreTypes.Timestamp;
  nextRetryAt?: FirebaseFirestoreTypes.Timestamp;
  lastError?: string;
  consentVerified: boolean;
  kycStatus: KYCStatus;
  bankToken?: string;
  scheduledFor: FirebaseFirestoreTypes.Timestamp;
  startedAt?: FirebaseFirestoreTypes.Timestamp;
  completedAt?: FirebaseFirestoreTypes.Timestamp;
  paymentId?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Member Auto-Debit Consent
 */
export interface AutoDebitConsent {
  id: string;
  memberId: string;
  groupId: string;
  enabled: boolean;
  bankToken: string;
  bankName: string;
  accountMasked: string;
  mandateReference?: string;
  consentedAt: FirebaseFirestoreTypes.Timestamp;
  expiresAt?: FirebaseFirestoreTypes.Timestamp;
  revokedAt?: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

// ==================== RECONCILIATION TYPES ====================

/**
 * Payment Reconciliation - Gateway webhook matching
 * Stored in `paymentReconciliations/` collection
 */
export interface PaymentReconciliation {
  id: string;
  paymentId?: string;
  scheduledPaymentId?: string;
  gatewayReference: string;
  gatewayEvent: string;
  gatewayName: string;
  webhookPayload: Record<string, unknown>;
  status: ReconciliationStatus;
  matchedAmount?: number;
  receivedAmount?: number;
  amountDifference?: number;
  matchReason?: string;
  processedAt: FirebaseFirestoreTypes.Timestamp;
  manuallyReconciledBy?: string;
  manuallyReconciledAt?: FirebaseFirestoreTypes.Timestamp;
  notes?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

// ==================== NOTIFICATION TYPES ====================

/**
 * Notification Log - Reminder/alert delivery record
 * Stored in `notificationLogs/` collection
 */
export type AdminNotificationType =
  | 'payment_submitted'
  | 'payment_confirmed'
  | 'payment_overdue'
  | 'draw_completed'
  | 'dispute_raised';

export interface NotificationLog {
  id: string;
  type: 'reminder' | 'alert' | 'confirmation' | 'escalation' | AdminNotificationType;
  channel: NotificationChannel;
  recipientId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  message: string;
  subject?: string;
  status: NotificationStatus;
  providerName?: string;
  providerMessageId?: string;
  providerResponse?: Record<string, unknown>;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  scheduledPaymentId?: string;
  groupId?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  sentAt?: FirebaseFirestoreTypes.Timestamp;
  deliveredAt?: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Reminder Template
 */
export interface ReminderTemplate {
  id: string;
  groupId?: string;
  name: string;
  type: 'pre_due' | 'on_due' | 'post_due' | 'overdue' | 'confirmation';
  triggerDays: number;
  channels: NotificationChannel[];
  enabled: boolean;
  subject?: string;
  messageTemplate: string;
  sendTime: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  createdBy: string;
}

// ==================== ESCALATION RULES ====================

/**
 * Escalation Rule - Configurable per group
 * Stored in `escalationRules/` collection
 */
export interface EscalationRule {
  id: string;
  groupId: string;
  groupName: string;
  enabled: boolean;
  gracePeriodDays: number;
  reminderFrequencyDays: number;
  maxReminders: number;
  lateFeeEnabled: boolean;
  lateFeeType: 'flat' | 'percentage';
  lateFeeAmount: number;
  lateFeeMaxCap?: number;
  autoSuspendEnabled: boolean;
  autoSuspendAfterDays: number;
  escalateToAdmin: boolean;
  escalateAfterDays: number;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

// ==================== AUDIT LOG TYPES ====================

/**
 * Audit Log Entry - Comprehensive action trail
 * Stored in `auditLogs/` collection
 */
export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorType: AuditActorType;
  actorName?: string;
  targetCollection: string;
  targetId: string;
  targetName?: string;
  timestamp: FirebaseFirestoreTypes.Timestamp;
  payload: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit Actions - Exhaustive list
 */
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

// ==================== GATEWAY TYPES ====================

/**
 * Payment Gateway Configuration
 */
export interface GatewayConfig {
  id: string;
  name: string;
  provider: 'paystack' | 'flutterwave' | 'stripe' | 'razorpay' | 'mock';
  enabled: boolean;
  isDefault: boolean;
  publicKey?: string;
  webhookUrl: string;
  supportedMethods: PaymentMethod[];
  supportedCurrencies: string[];
  environment: 'sandbox' | 'production';
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Gateway Charge Request
 */
export interface GatewayChargeRequest {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  bankToken?: string;
}

/**
 * Gateway Charge Response
 */
export interface GatewayChargeResponse {
  success: boolean;
  reference: string;
  gatewayReference?: string;
  status: 'pending' | 'success' | 'failed';
  message?: string;
  authorizationUrl?: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Gateway Webhook Event
 */
export interface GatewayWebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    gatewayReference?: string;
    paidAt?: string;
    metadata?: Record<string, unknown>;
  };
  rawPayload: Record<string, unknown>;
}

// ==================== QUERY TYPES ====================

/**
 * Scheduled Payments Query Filters
 */
export interface ScheduledPaymentFilters {
  groupId?: string;
  memberId?: string;
  status?: ScheduledPaymentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  autoDebitOnly?: boolean;
  overdueOnly?: boolean;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  limit: number;
  cursor?: FirebaseFirestoreTypes.DocumentSnapshot;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated Result
 */
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: FirebaseFirestoreTypes.DocumentSnapshot;
  totalCount?: number;
}

/**
 * Payment History Filters
 */
export interface PaymentHistoryFilters {
  memberId?: string;
  groupId?: string;
  status?: PaymentStatus[];
  method?: PaymentMethod[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Audit Log Filters
 */
export interface AuditLogFilters {
  actorId?: string;
  actorType?: AuditActorType;
  action?: AuditAction[];
  targetCollection?: string;
  targetId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  successOnly?: boolean;
}

// ==================== METRICS & STATS ====================

/**
 * Collection Metrics for Dashboard
 */
export interface CollectionMetrics {
  totalScheduled: number;
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  collectionRate: number;
  autoDebitSuccessRate: number;
  averageDelayDays: number;
  remindersSentToday: number;
  autoDebitsProcessedToday: number;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Auto-Debit Metrics
 */
export interface AutoDebitMetrics {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  successfulJobs: number;
  failedJobs: number;
  skippedJobs: number;
  successRate: number;
  totalAmountProcessed: number;
  averageRetries: number;
}
