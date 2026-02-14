/**
 * useAutoDebit Hook
 * Auto-debit job management and configuration
 */

import { useState, useEffect, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import type { AutoDebitJob, AutoDebitConsent, AutoDebitMetrics } from '../types/payment';

const COLLECTIONS = {
  AUTO_DEBIT_JOBS: 'autoDebitJobs',
  AUTO_DEBIT_CONSENT: 'autoDebitConsent',
};

interface UseAutoDebitJobsOptions {
  groupId?: string;
  memberId?: string;
  status?: string[];
  limit?: number;
}

interface UseAutoDebitJobsResult {
  jobs: AutoDebitJob[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  metrics: AutoDebitMetrics | null;
}

export const useAutoDebitJobs = (
  options: UseAutoDebitJobsOptions = {}
): UseAutoDebitJobsResult => {
  const [jobs, setJobs] = useState<AutoDebitJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AutoDebitMetrics | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);

      let query = firestore()
        .collection(COLLECTIONS.AUTO_DEBIT_JOBS)
        .orderBy('scheduledFor', 'desc')
        .limit(options.limit || 50);

      if (options.groupId) {
        query = query.where('groupId', '==', options.groupId);
      }

      if (options.memberId) {
        query = query.where('memberId', '==', options.memberId);
      }

      if (options.status && options.status.length > 0) {
        query = query.where('status', 'in', options.status);
      }

      const snapshot = await query.get();
      const fetchedJobs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AutoDebitJob[];

      setJobs(fetchedJobs);

      // Calculate metrics
      const pending = fetchedJobs.filter((j) => j.status === 'pending');
      const processing = fetchedJobs.filter((j) => j.status === 'processing');
      const successful = fetchedJobs.filter((j) => j.status === 'success');
      const failed = fetchedJobs.filter((j) => j.status === 'failed');
      const skipped = fetchedJobs.filter((j) => j.status === 'skipped');

      setMetrics({
        totalJobs: fetchedJobs.length,
        pendingJobs: pending.length,
        processingJobs: processing.length,
        successfulJobs: successful.length,
        failedJobs: failed.length,
        skippedJobs: skipped.length,
        successRate:
          successful.length + failed.length > 0
            ? (successful.length / (successful.length + failed.length)) * 100
            : 0,
        totalAmountProcessed: successful.reduce((sum, j) => sum + j.amount, 0),
        averageRetries:
          fetchedJobs.length > 0
            ? fetchedJobs.reduce((sum, j) => sum + j.attempts, 0) / fetchedJobs.length
            : 0,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auto-debit jobs');
    } finally {
      setIsLoading(false);
    }
  }, [options.groupId, options.memberId, options.status, options.limit]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    refresh: fetchJobs,
    metrics,
  };
};

/**
 * useAutoDebitConsent Hook
 * Member auto-debit consent management
 */
export const useAutoDebitConsent = (memberId: string, groupId?: string) => {
  const [consents, setConsents] = useState<AutoDebitConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsents = useCallback(async () => {
    try {
      setIsLoading(true);

      let query = firestore()
        .collection(COLLECTIONS.AUTO_DEBIT_CONSENT)
        .where('memberId', '==', memberId);

      if (groupId) {
        query = query.where('groupId', '==', groupId);
      }

      const snapshot = await query.get();
      const fetchedConsents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AutoDebitConsent[];

      setConsents(fetchedConsents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch consent records');
    } finally {
      setIsLoading(false);
    }
  }, [memberId, groupId]);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const revokeConsent = useCallback(
    async (consentId: string) => {
      try {
        await firestore().collection(COLLECTIONS.AUTO_DEBIT_CONSENT).doc(consentId).update({
          enabled: false,
          revokedAt: firestore.FieldValue.serverTimestamp(),
        });
        await fetchConsents();
      } catch (err) {
        throw new Error('Failed to revoke consent');
      }
    },
    [fetchConsents]
  );

  const hasActiveConsent = consents.some((c) => c.enabled && !c.revokedAt);

  return {
    consents,
    isLoading,
    error,
    refresh: fetchConsents,
    revokeConsent,
    hasActiveConsent,
  };
};

/**
 * usePendingAutoDebits Hook
 * Pending auto-debit jobs for admin dashboard
 */
export const usePendingAutoDebits = () => {
  const [jobs, setJobs] = useState<AutoDebitJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection(COLLECTIONS.AUTO_DEBIT_JOBS)
      .where('status', 'in', ['pending', 'processing'])
      .orderBy('scheduledFor', 'asc')
      .limit(100)
      .onSnapshot(
        (snapshot) => {
          const fetchedJobs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as AutoDebitJob[];

          setJobs(fetchedJobs);
          setIsLoading(false);
        },
        (err) => {
          setError(err.message);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  return {
    jobs,
    isLoading,
    error,
    pendingCount: jobs.filter((j) => j.status === 'pending').length,
    processingCount: jobs.filter((j) => j.status === 'processing').length,
    totalAmount: jobs.reduce((sum, j) => sum + j.amount, 0),
  };
};
