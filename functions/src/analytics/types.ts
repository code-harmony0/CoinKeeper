/**
 * Analytics Types - Server Side
 * Type definitions for Cloud Function aggregation
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// ==================== AGGREGATION TYPES ====================

export interface AnalyticsOverview {
  id: string;
  period: string;                 // 'daily_YYYY-MM-DD' | 'monthly_YYYY-MM' | 'global'
  groupId?: string;               // For group-specific overviews
  generatedAt: Timestamp | FieldValue;
  
  // Core KPIs
  totalPooled: number;
  totalCollected: number;
  totalDisbursed: number;
  activeGroups: number;
  activeMembers: number;
  
  // Rates
  collectionRate: number;
  delinquencyRate: number;
  retentionRate: number;
  
  // Counts
  pendingPayments: number;
  overduePayments: number;
  completedDraws: number;
  failedTransactions: number;
  
  // Trends (vs previous period)
  pooledChange: number;
  collectedChange: number;
  groupsChange: number;
  membersChange: number;
  
  // Alerts
  alertCount: number;
  criticalAlerts: number;
  
  // Metadata
  version: number;
}

export interface GroupAnalyticsDocument {
  id: string;
  groupId: string;
  groupName: string;
  period: string;
  generatedAt: Timestamp | FieldValue;
  
  // Financial
  totalContributions: number;
  averageContribution: number;
  totalDisbursed: number;
  currentPool: number;
  
  // Members
  memberCount: number;
  activeMembers: number;
  newMembers: number;
  churnedMembers: number;
  retentionRate: number;
  
  // Performance
  collectionRate: number;
  onTimePaymentRate: number;
  delinquencyRate: number;
  avgDaysToPayment: number;
  
  // Draws
  completedDraws: number;
  totalPrizeDisbursed: number;
  
  // Version
  version: number;
}

export interface MemberAnalyticsDocument {
  id: string;
  memberId: string;
  memberName: string;
  period: string;
  generatedAt: Timestamp | FieldValue;
  
  // Financial
  totalContributed: number;
  averageContribution: number;
  totalReceived: number;
  
  // Behavior
  paymentCount: number;
  onTimePayments: number;
  latePayments: number;
  missedPayments: number;
  onTimeRate: number;
  
  // Risk
  riskScore: number;
  riskCategory: string;
  churnProbability: number;
  
  // Version
  version: number;
}

// ==================== ALERT TYPES ====================

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 
  | 'overdue_spike'
  | 'collection_drop'
  | 'member_churn'
  | 'failed_auto_debit'
  | 'job_failure'
  | 'threshold_breach'
  | 'suspicious_activity';

export interface AnalyticsAlert {
  id?: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  groupId?: string;
  memberId?: string;
  createdAt: Timestamp | FieldValue;
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;
  resolved: boolean;
  actionUrl?: string;
}

// ==================== HEALTH TYPES ====================

export interface AnalyticsHealth {
  id: string;
  lastUpdated: Timestamp | FieldValue;
  lastDailyAggregation?: Timestamp;
  lastHourlyAggregation?: Timestamp;
  aggregationLag: number;
  pendingJobs: number;
  failedJobs: number;
  completedJobsToday: number;
  totalDocuments: number;
  staleDocuments: number;
  dataFreshness: 'fresh' | 'stale' | 'critical';
  recentFailures: {
    jobId: string;
    jobType: string;
    error: string;
    timestamp: Timestamp;
  }[];
}

// ==================== EXPORT TYPES ====================

export interface ExportRequest {
  id: string;
  userId: string;
  type: string;
  format: string;
  dateRange: {
    startDate: Timestamp;
    endDate: Timestamp;
  };
  groupIds?: string[];
  memberIds?: string[];
  metrics?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Timestamp | FieldValue;
  completedAt?: Timestamp;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
}

// ==================== JOB TYPES ====================

export interface AggregationJob {
  id: string;
  type: 'daily' | 'hourly' | 'recompute';
  targetDate?: string;        // YYYY-MM-DD for recompute
  groupId?: string;           // For group-specific jobs
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  documentsProcessed: number;
  error?: string;
  createdAt: Timestamp | FieldValue;
}
