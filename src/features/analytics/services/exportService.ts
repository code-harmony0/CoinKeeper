/**
 * Export Service
 * Client and server-side export functionality
 */

import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { ExportRequest, ExportFormat, DateRange } from '../types';

// ==================== EXPORT REQUEST ====================

/**
 * Create an export request
 */
export const createExportRequest = async (
  userId: string,
  type: 'overview' | 'group' | 'member' | 'transactions' | 'custom',
  format: ExportFormat,
  dateRange: DateRange,
  options: {
    groupIds?: string[];
    memberIds?: string[];
    metrics?: string[];
  } = {}
): Promise<string> => {
  const ref = firestore().collection('exports').doc();

  const request: Omit<ExportRequest, 'id'> = {
    userId,
    type,
    format,
    dateRange: {
      startDate: firestore.Timestamp.fromDate(dateRange.startDate),
      endDate: firestore.Timestamp.fromDate(dateRange.endDate),
    } as any,
    groupIds: options.groupIds,
    memberIds: options.memberIds,
    metrics: options.metrics,
    status: 'pending',
    createdAt: firestore.FieldValue.serverTimestamp() as any,
  };

  await ref.set(request);
  return ref.id;
};

/**
 * Hook for tracking export status
 */
export const useExportStatus = (exportId: string | null) => {
  const [exportRequest, setExportRequest] = React.useState<ExportRequest | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!exportId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = firestore()
      .collection('exports')
      .doc(exportId)
      .onSnapshot(
        (snapshot) => {
          if ((snapshot as any).exists) {
            setExportRequest({ id: snapshot.id, ...snapshot.data() } as ExportRequest);
          } else {
            setError('Export not found');
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('[useExportStatus] Error:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, [exportId]);

  return { exportRequest, isLoading, error };
};

// Import React for the hook
import React from 'react';

// ==================== EXPORT TEMPLATES ====================

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  metrics: string[];
  defaultRange: 'week' | 'month' | 'quarter';
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'monthly_summary',
    name: 'Monthly Summary',
    description: 'Overview of all activity for the month',
    type: 'overview',
    metrics: ['totalPooled', 'totalCollected', 'activeGroups', 'activeMembers', 'collectionRate'],
    defaultRange: 'month',
  },
  {
    id: 'top_delinquents',
    name: 'Top Delinquents',
    description: 'Members with highest overdue amounts',
    type: 'member',
    metrics: ['overdueAmount', 'daysOverdue', 'riskScore'],
    defaultRange: 'month',
  },
  {
    id: 'cashflow_by_group',
    name: 'Cashflow by Group',
    description: 'Contribution and disbursement breakdown per group',
    type: 'group',
    metrics: ['totalContributions', 'totalDisbursed', 'collectionRate'],
    defaultRange: 'month',
  },
  {
    id: 'member_activity',
    name: 'Member Activity Report',
    description: 'Payment history and behavior analysis per member',
    type: 'member',
    metrics: ['paymentCount', 'onTimeRate', 'riskScore', 'churnProbability'],
    defaultRange: 'quarter',
  },
];

// ==================== CSV GENERATION (CLIENT-SIDE PREVIEW) ====================

/**
 * Generate CSV string from data
 */
export const generateCSV = (
  headers: string[],
  rows: (string | number)[][]
): string => {
  const headerLine = headers.map(h => `"${h}"`).join(',');
  const dataLines = rows.map(row =>
    row.map(cell => {
      if (typeof cell === 'string') {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell.toString();
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
};

/**
 * Format contribution data for export
 */
export const formatContributionsForExport = (
  contributions: any[]
): { headers: string[]; rows: (string | number)[][] } => {
  const headers = ['Date', 'Member', 'Group', 'Amount', 'Status', 'Payment Method'];
  const rows = contributions.map(c => [
    c.createdAt?.toDate?.().toLocaleDateString() || '',
    c.memberName || 'Unknown',
    c.groupName || 'Unknown',
    c.amount || 0,
    c.status || '',
    c.paymentMethod || '',
  ]);
  return { headers, rows };
};

/**
 * Format group analytics for export
 */
export const formatGroupAnalyticsForExport = (
  analytics: any[]
): { headers: string[]; rows: (string | number)[][] } => {
  const headers = [
    'Group Name',
    'Members',
    'Total Contributions',
    'Collection Rate',
    'Delinquency Rate',
    'Draws Completed',
  ];
  const rows = analytics.map(a => [
    a.groupName || 'Unknown',
    a.memberCount || 0,
    a.totalContributions || 0,
    `${((a.collectionRate || 0) * 100).toFixed(1)}%`,
    `${((a.delinquencyRate || 0) * 100).toFixed(1)}%`,
    a.completedDraws || 0,
  ]);
  return { headers, rows };
};
