/**
 * Draw Hooks
 * Real-time hooks for draw data with Firestore listeners
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { Draw, DrawStats } from '../types/draw';

// ==================== TYPES ====================

export interface DrawSummary {
  id: string;
  groupId?: string;
  totalDraws: number;
  activeDraws: number;
  scheduledDraws: number;
  completedDraws: number;
  cancelledDraws: number;
  totalPrizeDisbursed: number;
  pendingSettlements: number;
  pendingSettlementAmount: number;
  lastDrawDate?: FirebaseFirestoreTypes.Timestamp;
  nextScheduledDraw?: FirebaseFirestoreTypes.Timestamp;
  averageWinningBid: number;
  participationRate: number;
  settlementSuccessRate: number;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface DrawSettlement {
  id: string;
  drawId: string;
  winnerId: string;
  winnerName: string;
  amount: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  method: string;
}

export interface UseDrawsResult {
  draws: Draw[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => void;
  hasMore: boolean;
}

// ==================== USE DRAW SUMMARY ====================

/**
 * Hook for fetching draw summary (dashboard metrics)
 */
export const useDrawSummary = (groupId?: string) => {
  const [summary, setSummary] = useState<DrawSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const summaryId = groupId || 'global';

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = firestore()
      .collection('drawSummaries')
      .doc(summaryId)
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            setSummary({ id: snapshot.id, ...snapshot.data() } as DrawSummary);
          } else {
            // If no cached summary, compute from draws
            computeFallbackSummary(groupId).then(setSummary);
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('[useDrawSummary] Error:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, [summaryId, groupId]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const getDrawSummary = functions().httpsCallable('getDrawSummary');
      const result = await getDrawSummary({ groupId });
      if ((result.data as any).success) {
        setSummary((result.data as any).summary);
      }
    } catch (err) {
      console.error('[useDrawSummary] Refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  return { summary, isLoading, error, refresh };
};

/**
 * Fallback summary computation if cached version not available
 */
const computeFallbackSummary = async (groupId?: string): Promise<DrawSummary> => {
  let query = firestore().collection('draws') as FirebaseFirestoreTypes.Query;
  if (groupId) {
    query = query.where('groupId', '==', groupId);
  }

  const snapshot = await query.get();
  const draws = snapshot.docs.map(doc => doc.data());

  const totalDraws = draws.length;
  const activeDraws = draws.filter(d => ['scheduled', 'open'].includes(d.status)).length;
  const scheduledDraws = draws.filter(d => d.status === 'scheduled').length;
  const completedDraws = draws.filter(d => d.status === 'completed').length;
  const cancelledDraws = draws.filter(d => d.status === 'cancelled').length;
  const totalPrizeDisbursed = draws
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + (d.totalPrizeAmount || 0), 0);

  return {
    id: groupId || 'global',
    groupId,
    totalDraws,
    activeDraws,
    scheduledDraws,
    completedDraws,
    cancelledDraws,
    totalPrizeDisbursed,
    pendingSettlements: 0,
    pendingSettlementAmount: 0,
    averageWinningBid: 0,
    participationRate: 0,
    settlementSuccessRate: 0,
    updatedAt: firestore.Timestamp.now(),
  };
};

// ==================== USE GROUP DRAWS ====================

/**
 * Hook for fetching draws for a specific group with pagination
 */
export const useGroupDraws = (
  groupId: string,
  options: {
    status?: string[];
    limit?: number;
  } = {}
): UseDrawsResult => {
  const { status, limit = 20 } = options;
  const [draws, setDraws] = useState<Draw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const buildQuery = useCallback(() => {
    let query = firestore()
      .collection('draws')
      .where('groupId', '==', groupId)
      .orderBy('scheduledDate', 'desc')
      .limit(limit);

    return query;
  }, [groupId, limit]);

  const fetchDraws = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setIsLoading(true);
      }

      let query = buildQuery();

      if (isLoadMore && lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      let fetchedDraws = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Draw[];

      // Apply status filter in memory (for complex status arrays)
      if (status && status.length > 0) {
        fetchedDraws = fetchedDraws.filter(d => status.includes(d.status));
      }

      if (isLoadMore) {
        setDraws(prev => [...prev, ...fetchedDraws]);
      } else {
        setDraws(fetchedDraws);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === limit);
      setError(null);
    } catch (err) {
      console.error('[useGroupDraws] Error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, lastDoc, limit, status]);

  useEffect(() => {
    fetchDraws();
  }, [groupId]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    await fetchDraws(false);
  }, [fetchDraws]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchDraws(true);
    }
  }, [hasMore, isLoading, fetchDraws]);

  return { draws, isLoading, error, refresh, loadMore, hasMore };
};

// ==================== USE ALL DRAWS ====================

/**
 * Hook for fetching all draws with real-time updates
 */
export const useDraws = (
  options: {
    status?: string[];
    limit?: number;
  } = {}
): UseDrawsResult => {
  const { status, limit = 50 } = options;
  const [draws, setDraws] = useState<Draw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    let query = firestore()
      .collection('draws')
      .orderBy('scheduledDate', 'desc')
      .limit(limit);

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        let fetchedDraws = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Draw[];

        // Apply status filter
        if (status && status.length > 0) {
          fetchedDraws = fetchedDraws.filter(d => status.includes(d.status));
        }

        setDraws(fetchedDraws);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useDraws] Error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [limit, status?.join(',')]);

  const refresh = useCallback(async () => {
    // Real-time listener auto-refreshes, but we can force a refetch
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  return { draws, isLoading, error, refresh, loadMore: () => {}, hasMore: false };
};

// ==================== USE DRAW DETAILS ====================

/**
 * Hook for fetching single draw with execution trace
 */
export const useDrawDetails = (drawId: string) => {
  const [draw, setDraw] = useState<Draw | null>(null);
  const [settlements, setSettlements] = useState<DrawSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!drawId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Listen to draw document
    const drawUnsubscribe = firestore()
      .collection('draws')
      .doc(drawId)
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            setDraw({ id: snapshot.id, ...snapshot.data() } as Draw);
          } else {
            setDraw(null);
            setError('Draw not found');
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('[useDrawDetails] Error:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

    // Listen to settlements for this draw
    const settlementsUnsubscribe = firestore()
      .collection('drawSettlements')
      .where('drawId', '==', drawId)
      .onSnapshot(
        (snapshot) => {
          const fetchedSettlements = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as DrawSettlement[];
          setSettlements(fetchedSettlements);
        },
        (err) => {
          console.error('[useDrawDetails] Settlements error:', err);
        }
      );

    return () => {
      drawUnsubscribe();
      settlementsUnsubscribe();
    };
  }, [drawId]);

  const refresh = useCallback(async () => {
    // Real-time listener auto-refreshes
  }, []);

  return { draw, settlements, isLoading, error, refresh };
};

// ==================== USE PENDING SETTLEMENTS ====================

/**
 * Hook for fetching pending settlements
 */
export const usePendingSettlements = (groupId?: string) => {
  const [settlements, setSettlements] = useState<DrawSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    let query = firestore()
      .collection('drawSettlements')
      .where('status', 'in', ['pending', 'processing', 'failed']);

    if (groupId) {
      query = query.where('groupId', '==', groupId) as typeof query;
    }

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const fetchedSettlements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as DrawSettlement[];
        setSettlements(fetchedSettlements);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[usePendingSettlements] Error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  const refresh = useCallback(async () => {
    // Real-time listener auto-refreshes
  }, []);

  return { settlements, isLoading, error, refresh };
};

// ==================== ADMIN ACTIONS ====================

/**
 * Hook for admin draw actions
 */
export const useDrawAdminActions = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runManualDraw = useCallback(async (drawId: string, reason: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const fn = functions().httpsCallable('runManualDraw');
      const result = await fn({ drawId, reason });
      return (result.data as any);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancelDraw = useCallback(async (drawId: string, reason: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const fn = functions().httpsCallable('cancelDraw');
      const result = await fn({ drawId, reason });
      return (result.data as any);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const rerunDraw = useCallback(async (drawId: string, reason: string, newSeed: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const fn = functions().httpsCallable('rerunDraw');
      const result = await fn({ drawId, reason, newSeed });
      return (result.data as any);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const retrySettlement = useCallback(async (settlementId: string, reason: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const fn = functions().httpsCallable('retrySettlement');
      const result = await fn({ settlementId, reason });
      return (result.data as any);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const exportDraw = useCallback(async (drawId: string, format: 'json' | 'pdf' = 'json') => {
    try {
      setIsProcessing(true);
      setError(null);
      const fn = functions().httpsCallable('exportDraw');
      const result = await fn({ drawId, format });
      return (result.data as any);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    runManualDraw,
    cancelDraw,
    rerunDraw,
    retrySettlement,
    exportDraw,
    isProcessing,
    error,
  };
};
