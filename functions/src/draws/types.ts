/**
 * Draw Types - Server-side type definitions
 * Used by Cloud Functions for draw execution
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// ==================== DRAW STATUS ====================

export type DrawStatus =
  | 'scheduled'    // Created, awaiting execution
  | 'open'         // Accepting bids (auction mode)
  | 'executing'    // Currently running selection
  | 'completed'    // Winner selected, awaiting settlement
  | 'cancelled'    // Cancelled by admin
  | 'settlement_partial'; // Some settlements failed

export type DrawStrategy = 'random' | 'weighted' | 'bid';
export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

// ==================== DRAW DOCUMENT ====================

export interface Draw {
  id: string;
  groupId: string;
  groupName: string;
  drawNumber: number;
  
  // Scheduling
  scheduledAt: Timestamp;
  executedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  
  // Configuration
  status: DrawStatus;
  strategy: DrawStrategy;
  recurrence: RecurrenceType;
  nextRecurrenceAt?: Timestamp;
  
  // Prize details
  totalPrizeAmount: number;
  minBidAmount?: number;
  maxBidAmount?: number;
  
  // Participants (snapshot captured at execution)
  participantSnapshot?: ParticipantSnapshot[];
  participantCount: number;
  
  // Winner
  winnerId?: string;
  winnerName?: string;
  winningBid?: number;
  
  // Execution trace (immutable after execution)
  executionTrace?: DrawExecutionTrace;
  
  // Bid tracking
  bidsReceived: number;
  
  // Audit
  createdBy: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  cancelledBy?: string;
  cancellationReason?: string;
}

// ==================== PARTICIPANT SNAPSHOT ====================

export interface ParticipantSnapshot {
  memberId: string;
  memberName: string;
  memberPhone: string;
  weight: number;           // For weighted selection
  contributionAmount: number;
  isEligible: boolean;
  eligibilityReason?: string;
}

// ==================== EXECUTION TRACE ====================

export interface DrawExecutionTrace {
  seed: string;
  algorithm: string;
  rngSource: string;        // 'crypto' | 'seeded'
  participantCount: number;
  selectionSteps: SelectionStep[];
  winnerId: string;
  winnerIndex: number;
  executedBy: string;       // 'system' | adminId
  executedAt: Timestamp;
  durationMs: number;
  verified: boolean;
}

export interface SelectionStep {
  step: number;
  description: string;
  value?: number | string;
  timestamp: number;
}

// ==================== DRAW JOB ====================

export interface DrawJob {
  id: string;
  drawId: string;
  groupId: string;
  idempotencyKey: string;   // drawId_YYYYMMDD
  
  // Scheduling
  scheduledFor: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Retry handling
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Timestamp;
  nextRetryAt?: Timestamp;
  lastError?: string;
  
  // Result
  resultDrawId?: string;
  resultWinnerId?: string;
  
  // Timestamps
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ==================== DRAW SUMMARY (CACHED) ====================

export interface DrawSummary {
  id: string;               // 'global' | groupId
  groupId?: string;
  
  // Counts
  totalDraws: number;
  activeDraws: number;
  scheduledDraws: number;
  completedDraws: number;
  cancelledDraws: number;
  
  // Financial
  totalPrizeDisbursed: number;
  pendingSettlements: number;
  pendingSettlementAmount: number;
  
  // Dates
  lastDrawDate?: Timestamp;
  nextScheduledDraw?: Timestamp;
  
  // Metrics
  averageWinningBid: number;
  participationRate: number;
  settlementSuccessRate: number;
  
  // Cache metadata
  updatedAt: Timestamp | FieldValue;
  version: number;
}

// ==================== DRAW SETTLEMENT ====================

export interface DrawSettlement {
  id: string;
  drawId: string;
  drawNumber: number;
  groupId: string;
  
  // Winner
  winnerId: string;
  winnerName: string;
  winnerPhone: string;
  
  // Amount
  amount: number;
  deductions?: number;
  netAmount: number;
  
  // Payment
  method: 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'wallet';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  
  // Bank details
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  upiId?: string;
  walletId?: string;
  
  // Transaction
  transactionId?: string;
  transactionRef?: string;
  
  // Processing
  initiatedBy: string;
  initiatedAt: Timestamp;
  processedAt?: Timestamp;
  settlementDate?: Timestamp;
  
  // Failure handling
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Timestamp;
  
  // Reversal
  reversedAt?: Timestamp;
  reversedBy?: string;
  reversalReason?: string;
  
  // Notes
  notes?: string;
  
  // Timestamps
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ==================== VALIDATION ====================

export interface DrawValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  eligibleParticipants: number;
  totalParticipants: number;
}

export interface GroupEligibility {
  isEligible: boolean;
  reason?: string;
  activeStatus: boolean;
  sufficientContributions: boolean;
  minimumMembers: boolean;
  noBlackoutPeriod: boolean;
  withinDrawLimit: boolean;
}

// ==================== ADMIN ACTIONS ====================

export interface ManualDrawRequest {
  drawId: string;
  adminId: string;
  reason: string;
  overrideSeed?: string;
}

export interface CancelDrawRequest {
  drawId: string;
  adminId: string;
  reason: string;
}

export interface RerunDrawRequest {
  drawId: string;
  adminId: string;
  reason: string;
  newSeed: string;
}

export interface SettlementRetryRequest {
  settlementId: string;
  adminId: string;
  reason: string;
}
