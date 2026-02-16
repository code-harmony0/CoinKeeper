/**
 * usePaymentConfirmations.ts
 * Custom hook for managing payment confirmations state
 * Follows useContributions.ts pattern with real-time listeners
 */

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToAllConfirmations,
  subscribeToPendingConfirmations,
  subscribeToDisputedConfirmations,
  subscribeToGroupConfirmations,
  createPaymentConfirmation,
  confirmPayment,
  rejectPayment,
  disputePayment,
  batchConfirmPayments,
  getConfirmationStats,
} from '../services/paymentConfirmationService';
import { PaymentConfirmation } from '../types/paymentConfirmation';

interface UsePaymentConfirmationsResult {
  confirmations: PaymentConfirmation[];
  isLoading: boolean;
  error: string | null;
  refreshConfirmations: () => void;
  submitConfirmation: (data: Omit<PaymentConfirmation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  approve: (confirmationId: string, confirmedBy: string, confirmedByName: string, notes?: string) => Promise<void>;
  reject: (confirmationId: string, rejectedBy: string, reason: string) => Promise<void>;
  dispute: (confirmationId: string, disputedBy: string, reason: string) => Promise<void>;
  batchApprove: (ids: string[], confirmedBy: string, confirmedByName: string) => Promise<{ success: number; failed: number }>;
}

/**
 * Hook for all payment confirmations (admin view)
 */
export const useAllPaymentConfirmations = (): UsePaymentConfirmationsResult => {
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToAllConfirmations(
      (data) => {
        setConfirmations(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshConfirmations = useCallback(() => {
    setIsLoading(true);
  }, []);

  const submitConfirmation = useCallback(
    async (data: Omit<PaymentConfirmation, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        return await createPaymentConfirmation(data);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const approve = useCallback(
    async (confirmationId: string, confirmedBy: string, confirmedByName: string, notes?: string) => {
      try {
        await confirmPayment(confirmationId, confirmedBy, confirmedByName, notes);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const reject = useCallback(
    async (confirmationId: string, rejectedBy: string, reason: string) => {
      try {
        await rejectPayment(confirmationId, rejectedBy, reason);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const dispute = useCallback(
    async (confirmationId: string, disputedBy: string, reason: string) => {
      try {
        await disputePayment(confirmationId, disputedBy, reason);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const batchApprove = useCallback(
    async (ids: string[], confirmedBy: string, confirmedByName: string) => {
      try {
        return await batchConfirmPayments(ids, confirmedBy, confirmedByName);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  return {
    confirmations,
    isLoading,
    error,
    refreshConfirmations,
    submitConfirmation,
    approve,
    reject,
    dispute,
    batchApprove,
  };
};

/**
 * Hook for pending payment confirmations
 */
export const usePendingConfirmations = (): UsePaymentConfirmationsResult => {
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToPendingConfirmations(
      (data) => {
        setConfirmations(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshConfirmations = useCallback(() => { setIsLoading(true); }, []);
  const submitConfirmation = useCallback(async (data: Omit<PaymentConfirmation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try { return await createPaymentConfirmation(data); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const approve = useCallback(async (id: string, by: string, name: string, notes?: string) => {
    try { await confirmPayment(id, by, name, notes); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const reject = useCallback(async (id: string, by: string, reason: string) => {
    try { await rejectPayment(id, by, reason); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const dispute = useCallback(async (id: string, by: string, reason: string) => {
    try { await disputePayment(id, by, reason); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const batchApprove = useCallback(async (ids: string[], by: string, name: string) => {
    try { return await batchConfirmPayments(ids, by, name); } catch (err) { setError((err as Error).message); throw err; }
  }, []);

  return { confirmations, isLoading, error, refreshConfirmations, submitConfirmation, approve, reject, dispute, batchApprove };
};

/**
 * Hook for disputed payment confirmations
 */
export const useDisputedConfirmations = (): UsePaymentConfirmationsResult => {
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToDisputedConfirmations(
      (data) => {
        setConfirmations(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshConfirmations = useCallback(() => { setIsLoading(true); }, []);
  const submitConfirmation = useCallback(async (data: Omit<PaymentConfirmation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try { return await createPaymentConfirmation(data); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const approve = useCallback(async (id: string, by: string, name: string, notes?: string) => {
    try { await confirmPayment(id, by, name, notes); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const reject = useCallback(async (id: string, by: string, reason: string) => {
    try { await rejectPayment(id, by, reason); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const dispute = useCallback(async (id: string, by: string, reason: string) => {
    try { await disputePayment(id, by, reason); } catch (err) { setError((err as Error).message); throw err; }
  }, []);
  const batchApprove = useCallback(async (ids: string[], by: string, name: string) => {
    try { return await batchConfirmPayments(ids, by, name); } catch (err) { setError((err as Error).message); throw err; }
  }, []);

  return { confirmations, isLoading, error, refreshConfirmations, submitConfirmation, approve, reject, dispute, batchApprove };
};

/**
 * Hook for payment confirmation stats
 */
export const useConfirmationStats = () => {
  const [stats, setStats] = useState<{
    totalPending: number;
    totalConfirmed: number;
    totalRejected: number;
    totalDisputed: number;
    pendingAmount: number;
    confirmedAmount: number;
    confirmationRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await getConfirmationStats();
        setStats(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, isLoading, error };
};
