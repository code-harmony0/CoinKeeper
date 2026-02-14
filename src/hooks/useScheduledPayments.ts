/**
 * useScheduledPayments Hook
 * Real-time scheduled payments management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ScheduledPayment,
  ScheduledPaymentFilters,
  ScheduledPaymentStatus,
} from '../types/payment';
import { paymentService } from '../services/paymentService';

interface UseScheduledPaymentsOptions {
  groupId?: string;
  memberId?: string;
  status?: ScheduledPaymentStatus[];
  dateRange?: { start: Date; end: Date };
  autoDebitOnly?: boolean;
  limit?: number;
}

interface UseScheduledPaymentsResult {
  payments: ScheduledPayment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  stats: {
    total: number;
    pending: number;
    overdue: number;
    paid: number;
    totalAmount: number;
    overdueAmount: number;
  };
}

export const useScheduledPayments = (
  options: UseScheduledPaymentsOptions = {}
): UseScheduledPaymentsResult => {
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<unknown>(undefined);

  const filters: ScheduledPaymentFilters = useMemo(
    () => ({
      groupId: options.groupId,
      memberId: options.memberId,
      status: options.status,
      dateRange: options.dateRange,
      autoDebitOnly: options.autoDebitOnly,
    }),
    [options.groupId, options.memberId, options.status, options.dateRange, options.autoDebitOnly]
  );

  const limit = options.limit || 20;

  // Initial load and real-time updates
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = paymentService.onScheduledPaymentsSnapshot(
      (fetchedPayments) => {
        setPayments(fetchedPayments);
        setIsLoading(false);
        setHasMore(fetchedPayments.length >= limit);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
      filters
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [filters, limit]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setCursor(undefined);
    // Real-time listener will automatically refresh
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      const result = await paymentService.getScheduledPayments(filters, {
        limit,
        cursor: cursor as never,
        orderBy: 'dueDate',
        orderDirection: 'asc',
      });

      setPayments((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    }
  }, [hasMore, isLoading, filters, limit, cursor]);

  // Compute stats from current payments
  const stats = useMemo(() => {
    const pending = payments.filter((p) => p.status === 'pending' || p.status === 'reminded');
    const overdue = payments.filter((p) => p.status === 'overdue');
    const paid = payments.filter((p) => p.status === 'paid');

    return {
      total: payments.length,
      pending: pending.length,
      overdue: overdue.length,
      paid: paid.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      overdueAmount: overdue.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  return {
    payments,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore,
    stats,
  };
};

/**
 * useUpcomingPayments Hook
 * Specialized hook for upcoming payments within a time window
 */
export const useUpcomingPayments = (windowDays: number = 7, groupId?: string) => {
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getUpcomingPayments(windowDays, groupId);
      setPayments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch upcoming payments');
    } finally {
      setIsLoading(false);
    }
  }, [windowDays, groupId]);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  return {
    payments,
    isLoading,
    error,
    refresh: fetchUpcoming,
  };
};

/**
 * useOverduePayments Hook
 * Specialized hook for overdue payments
 */
export const useOverduePayments = (groupId?: string) => {
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverdue = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getOverduePayments(groupId);
      setPayments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overdue payments');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchOverdue();
  }, [fetchOverdue]);

  const totalOverdueAmount = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount + (p.lateFeeAmount || 0), 0),
    [payments]
  );

  return {
    payments,
    isLoading,
    error,
    refresh: fetchOverdue,
    totalOverdueAmount,
    count: payments.length,
  };
};
