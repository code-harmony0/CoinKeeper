/**
 * useContributions.ts
 * Custom hook for managing contributions state
 * Follows useGroups.tsx pattern with real-time listeners
 */

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToContributions,
  subscribeToAllContributions,
  subscribeToPendingContributions,
  createContribution,
  bulkCreateContributions,
  updateContributionStatus,
  batchApproveContributions,
  batchRejectContributions,
  markContributionAsPaid,
  deleteContribution,
  getContributionsAnalytics,
} from '../services/contributionService';
import { Contribution, ContributionStatus } from '../types/transaction';

interface UseContributionsResult {
  contributions: Contribution[];
  isLoading: boolean;
  error: string | null;
  refreshContributions: () => void;
  createNewContribution: (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  bulkImportContributions: (
    contributions: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>[],
    performedBy: string
  ) => Promise<{ success: number; failed: number; errors: string[] }>;
  updateStatus: (
    contributionId: string,
    status: ContributionStatus,
    performedBy: string,
    notes?: string
  ) => Promise<void>;
  approveMultiple: (contributionIds: string[], performedBy: string) => Promise<{ success: number; failed: number }>;
  rejectMultiple: (
    contributionIds: string[],
    performedBy: string,
    reason?: string
  ) => Promise<{ success: number; failed: number }>;
  markAsPaid: (
    contributionId: string,
    paymentMethod: string,
    transactionId: string,
    performedBy: string
  ) => Promise<void>;
  removeContribution: (contributionId: string, performedBy: string) => Promise<void>;
}

/**
 * Hook for managing contributions by group
 */
export const useContributions = (groupId: string): UseContributionsResult => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToContributions(
      groupId,
      (data) => {
        setContributions(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  const refreshContributions = useCallback(() => {
    setIsLoading(true);
  }, []);

  const createNewContribution = useCallback(
    async (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const id = await createContribution(data);
        return id;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const bulkImportContributions = useCallback(
    async (
      contributionsData: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>[],
      performedBy: string
    ) => {
      try {
        const result = await bulkCreateContributions(contributionsData, performedBy);
        return result;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (
      contributionId: string,
      status: ContributionStatus,
      performedBy: string,
      notes?: string
    ) => {
      try {
        await updateContributionStatus(contributionId, status, performedBy, notes);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const approveMultiple = useCallback(async (contributionIds: string[], performedBy: string) => {
    try {
      const result = await batchApproveContributions(contributionIds, performedBy);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const rejectMultiple = useCallback(
    async (contributionIds: string[], performedBy: string, reason?: string) => {
      try {
        const result = await batchRejectContributions(contributionIds, performedBy, reason);
        return result;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const markAsPaid = useCallback(
    async (
      contributionId: string,
      paymentMethod: string,
      transactionId: string,
      performedBy: string
    ) => {
      try {
        await markContributionAsPaid(contributionId, paymentMethod, transactionId, performedBy);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const removeContribution = useCallback(async (contributionId: string, performedBy: string) => {
    try {
      await deleteContribution(contributionId, performedBy);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  return {
    contributions,
    isLoading,
    error,
    refreshContributions,
    createNewContribution,
    bulkImportContributions,
    updateStatus,
    approveMultiple,
    rejectMultiple,
    markAsPaid,
    removeContribution,
  };
};

/**
 * Hook for managing all contributions (admin view)
 */
export const useAllContributions = (): UseContributionsResult => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToAllContributions(
      (data) => {
        setContributions(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshContributions = useCallback(() => {
    setIsLoading(true);
  }, []);

  const createNewContribution = useCallback(
    async (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const id = await createContribution(data);
        return id;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const bulkImportContributions = useCallback(
    async (
      contributionsData: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>[],
      performedBy: string
    ) => {
      try {
        const result = await bulkCreateContributions(contributionsData, performedBy);
        return result;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (
      contributionId: string,
      status: ContributionStatus,
      performedBy: string,
      notes?: string
    ) => {
      try {
        await updateContributionStatus(contributionId, status, performedBy, notes);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const approveMultiple = useCallback(async (contributionIds: string[], performedBy: string) => {
    try {
      const result = await batchApproveContributions(contributionIds, performedBy);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const rejectMultiple = useCallback(
    async (contributionIds: string[], performedBy: string, reason?: string) => {
      try {
        const result = await batchRejectContributions(contributionIds, performedBy, reason);
        return result;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const markAsPaid = useCallback(
    async (
      contributionId: string,
      paymentMethod: string,
      transactionId: string,
      performedBy: string
    ) => {
      try {
        await markContributionAsPaid(contributionId, paymentMethod, transactionId, performedBy);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const removeContribution = useCallback(async (contributionId: string, performedBy: string) => {
    try {
      await deleteContribution(contributionId, performedBy);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  return {
    contributions,
    isLoading,
    error,
    refreshContributions,
    createNewContribution,
    bulkImportContributions,
    updateStatus,
    approveMultiple,
    rejectMultiple,
    markAsPaid,
    removeContribution,
  };
};

/**
 * Hook for managing pending contributions
 */
export const usePendingContributions = (): UseContributionsResult => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToPendingContributions(
      (data) => {
        setContributions(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshContributions = useCallback(() => {
    setIsLoading(true);
  }, []);

  const createNewContribution = useCallback(
    async (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const id = await createContribution(data);
        return id;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const bulkImportContributions = useCallback(
    async (
      contributionsData: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>[],
      performedBy: string
    ) => {
      try {
        const result = await bulkCreateContributions(contributionsData, performedBy);
        return result;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (
      contributionId: string,
      status: ContributionStatus,
      performedBy: string,
      notes?: string
    ) => {
      try {
        await updateContributionStatus(contributionId, status, performedBy, notes);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const approveMultiple = useCallback(async (contributionIds: string[], performedBy: string) => {
    try {
      const result = await batchApproveContributions(contributionIds, performedBy);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const rejectMultiple = useCallback(
    async (contributionIds: string[], performedBy: string, reason?: string) => {
      try {
        const result = await batchRejectContributions(contributionIds, performedBy, reason);
        return result;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const markAsPaid = useCallback(
    async (
      contributionId: string,
      paymentMethod: string,
      transactionId: string,
      performedBy: string
    ) => {
      try {
        await markContributionAsPaid(contributionId, paymentMethod, transactionId, performedBy);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const removeContribution = useCallback(async (contributionId: string, performedBy: string) => {
    try {
      await deleteContribution(contributionId, performedBy);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  return {
    contributions,
    isLoading,
    error,
    refreshContributions,
    createNewContribution,
    bulkImportContributions,
    updateStatus,
    approveMultiple,
    rejectMultiple,
    markAsPaid,
    removeContribution,
  };
};

/**
 * Hook for contributions analytics
 */
export const useContributionsAnalytics = (groupId: string) => {
  const [analytics, setAnalytics] = useState<{
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    collectionRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await getContributionsAnalytics(groupId);
        setAnalytics(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [groupId]);

  return { analytics, isLoading, error };
};
