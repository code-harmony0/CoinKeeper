/**
 * Analytics Types
 * Type definitions for analytics and reporting module
 */

import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ==================== TIME RANGES ====================

export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

// ==================== KPI TYPES ====================

export interface KPIMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  previousValue?: number;
  changePercent?: number;
  changeDirection?: 'up' | 'down' | 'neutral';
  unit?: string;
  color?: string;
  icon?: string;
}

export interface AnalyticsOverview {
  id: string;
  period: TimeRange | string;
  generatedAt: FirebaseFirestoreTypes.Timestamp;
  
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
}

// ==================== TIME SERIES ====================

export interface TimeSeriesPoint {
  timestamp: FirebaseFirestoreTypes.Timestamp | Date | string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  id: string;
  metric: string;
  period: string;
  dataPoints: TimeSeriesPoint[];
  total: number;
  average: number;
  min: number;
  max: number;
}

// ==================== GROUP ANALYTICS ====================

export interface GroupAnalytics {
  id: string;
  groupId: string;
  groupName: string;
  period: string;
  generatedAt: FirebaseFirestoreTypes.Timestamp;
  
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
  
  // Time series
  contributionTrend: TimeSeriesPoint[];
  memberTrend: TimeSeriesPoint[];
  
  // Top contributors
  topContributors: {
    memberId: string;
    memberName: string;
    totalContributed: number;
    onTimeRate: number;
  }[];
  
  // Delinquents
  delinquentMembers: {
    memberId: string;
    memberName: string;
    overdueAmount: number;
    daysOverdue: number;
  }[];
}

// ==================== MEMBER ANALYTICS ====================

export interface MemberAnalytics {
  id: string;
  memberId: string;
  memberName: string;
  period: string;
  generatedAt: FirebaseFirestoreTypes.Timestamp;
  
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
  riskFactors: string[];
  churnProbability: number;
  
  // History
  contributionHistory: TimeSeriesPoint[];
  riskScoreHistory: TimeSeriesPoint[];
  
  // Groups
  activeGroups: number;
  groupMemberships: {
    groupId: string;
    groupName: string;
    contributionAmount: number;
    status: string;
  }[];
}

// ==================== RISK SCORING ====================

export interface RiskScoreInput {
  onTimeRate: number;
  latePaymentCount: number;
  missedPaymentCount: number;
  averageDelayDays: number;
  accountAge: number;
  recentActivityDays: number;
}

export interface RiskScoreResult {
  score: number;           // 0-100, higher = more risky
  category: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

// ==================== ALERTS ====================

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
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  groupId?: string;
  memberId?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  acknowledgedAt?: FirebaseFirestoreTypes.Timestamp;
  acknowledgedBy?: string;
  resolved: boolean;
  actionUrl?: string;
}

// ==================== SYSTEM HEALTH ====================

export interface AnalyticsHealth {
  id: string;
  lastUpdated: FirebaseFirestoreTypes.Timestamp;
  
  // Job status
  lastDailyAggregation?: FirebaseFirestoreTypes.Timestamp;
  lastHourlyAggregation?: FirebaseFirestoreTypes.Timestamp;
  aggregationLag: number; // minutes
  
  // Job health
  pendingJobs: number;
  failedJobs: number;
  completedJobsToday: number;
  
  // Data health
  totalDocuments: number;
  staleDocuments: number;
  dataFreshness: 'fresh' | 'stale' | 'critical';
  
  // Recent failures
  recentFailures: {
    jobId: string;
    jobType: string;
    error: string;
    timestamp: FirebaseFirestoreTypes.Timestamp;
  }[];
}

// ==================== EXPORTS ====================

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportRequest {
  id: string;
  userId: string;
  type: 'overview' | 'group' | 'member' | 'transactions' | 'custom';
  format: ExportFormat;
  dateRange: DateRange;
  groupIds?: string[];
  memberIds?: string[];
  metrics?: string[];
  status: ExportStatus;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  completedAt?: FirebaseFirestoreTypes.Timestamp;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
}

// ==================== CHART DATA ====================

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface PieChartData {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}
