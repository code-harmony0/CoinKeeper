/**
 * usePaymentHistory Hook
 * Payment history with real-time updates and pagination
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Payment, PaymentHistoryFilters, PaymentStatus } from '../types/payment';
import { paymentService } from '../services/paymentService';

interface UsePaymentHistoryOptions {
  memberId?: string;
  groupId?: string;
  status?: PaymentStatus[];
  limit?: number;
}

interface UsePaymentHistoryResult {
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  stats: {
    total: number;
    successful: number;
    failed: number;
    totalAmount: number;
  };
}

export const usePaymentHistory = (
  options: UsePaymentHistoryOptions = {}
): UsePaymentHistoryResult => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<unknown>(undefined);

  const filters: PaymentHistoryFilters = useMemo(
    () => ({
      memberId: options.memberId,
      groupId: options.groupId,
      status: options.status,
    }),
    [options.memberId, options.groupId, options.status]
  );

  const limit = options.limit || 20;

  // Real-time updates
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = paymentService.onPaymentsSnapshot(
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
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      const result = await paymentService.getPaymentHistory(filters, {
        limit,
        cursor: cursor as never,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      setPayments((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    }
  }, [hasMore, isLoading, filters, limit, cursor]);

  const stats = useMemo(() => {
    const successful = payments.filter((p) => p.status === 'success');
    const failed = payments.filter((p) => p.status === 'failed');

    return {
      total: payments.length,
      successful: successful.length,
      failed: failed.length,
      totalAmount: successful.reduce((sum, p) => sum + p.amount, 0),
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
 * usePaymentById Hook
 * Get single payment details
 */
export const usePaymentById = (paymentId: string | undefined) => {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayment = useCallback(async () => {
    if (!paymentId) {
      setPayment(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await paymentService.getPaymentById(paymentId);
      setPayment(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment');
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  return {
    payment,
    isLoading,
    error,
    refresh: fetchPayment,
  };
};

/**
 * useCollectionMetrics Hook
 * Collection dashboard metrics
 */
export const useCollectionMetrics = (groupId?: string) => {
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof paymentService.getCollectionMetrics>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getCollectionMetrics(groupId);
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refresh: fetchMetrics,
  };
};
