/**
 * CoinKeeper Cloud Functions
 * Collection Management, Draw Management & Analytics Modules
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// ==================== SCHEDULED FUNCTIONS ====================
export {
  precomputePayments,
  triggerPrecomputePayments,
  detectOverdue,
  updateOverdueSummaries,
  processAutoDebits,
  createAutoDebitJobs,
  sendReminders,
  // Draw scheduling
  processDraws,
  scheduleUpcomingDraws,
  processRecurringDraws,
  refreshDrawSummaries,
} from './scheduled';

// ==================== HTTP ENDPOINTS ====================
export {
  paystackWebhook,
  mockWebhook,
  reprocessPayment,
  manualReconcile,
  createAdjustment,
  getReconciliationQueue,
  // Draw Admin APIs
  runManualDraw,
  cancelDraw,
  rerunDraw,
  retrySettlement,
  exportDraw,
  getDrawSummary,
} from './http';

// ==================== FIRESTORE TRIGGERS ====================
export {
  onPaymentStatusChange,
  onScheduledPaymentStatusChange,
  // Draw Triggers
  onDrawComplete,
  onSettlementChange,
  onDrawCreate,
} from './triggers';

// ==================== ANALYTICS ====================
export {
  aggregateDailyMetrics,
  recomputeRange,
} from './analytics';
