/**
 * Analytics Hooks
 * Real-time hooks for analytics data with caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type {
  AnalyticsOverview,
  GroupAnalytics,
  MemberAnalytics,
  AnalyticsAlert,
  AnalyticsHealth,
  TimeRange,
  DateRange,
  TimeSeriesPoint,
} from '../types';

// ==================== USE ANALYTICS OVERVIEW ====================

/**
 * Hook for fetching overview analytics (dashboard KPIs)
 */
export const useAnalyticsOverview = (range: TimeRange = 'month') => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodId = useMemo(() => getPeriodId(range), [range]);

  useEffect(() => {
    setIsLoading(true);

    // Listen to global overview (always up to date)
    const unsubscribe = firestore()
      .collection('analyticsOverview')
      .doc('global')
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            setOverview({ id: snapshot.id, ...snapshot.data() } as AnalyticsOverview);
          } else {
            // Fallback: compute on-the-fly
            computeFallbackOverview().then(setOverview);
          }
          setIsLoading(false);
          setError(null);
        },
        (err) => {
          console.error('[useAnalyticsOverview] Error:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, [periodId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const fn = functions().httpsCallable('recomputeRange');
      const today = new Date().toISOString().split('T')[0];
      await fn({ startDate: today, endDate: today });
    } catch (err) {
      console.error('[useAnalyticsOverview] Refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { overview, isLoading, error, refresh };
};

/**
 * Fallback computation when cached data unavailable
 */
const computeFallbackOverview = async (): Promise<AnalyticsOverview> => {
  const [groupsSnap, membersSnap, contributionsSnap] = await Promise.all([
    firestore().collection('groups').where('status', '==', 'active').get(),
    firestore().collection('group_members').where('status', '==', 'active').get(),
    firestore().collection('contributions').where('status', '==', 'verified').get(),
  ]);

  const totalPooled = contributionsSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().amount || 0),
    0
  );

  return {
    id: 'fallback',
    period: 'current',
    generatedAt: firestore.Timestamp.now(),
    totalPooled,
    totalCollected: totalPooled,
    totalDisbursed: 0,
    activeGroups: groupsSnap.size,
    activeMembers: membersSnap.size,
    collectionRate: 0.95,
    delinquencyRate: 0.05,
    retentionRate: 0.95,
    pendingPayments: 0,
    overduePayments: 0,
    completedDraws: 0,
    failedTransactions: 0,
    pooledChange: 0,
    collectedChange: 0,
    groupsChange: 0,
    membersChange: 0,
    alertCount: 0,
    criticalAlerts: 0,
  };
};

// ==================== USE GROUP ANALYTICS ====================

/**
 * Hook for group-specific analytics with time series
 */
export const useGroupAnalytics = (groupId: string, range: TimeRange = 'month') => {
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [contributionTrend, setContributionTrend] = useState<TimeSeriesPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch latest analytics for group
    const fetchAnalytics = async () => {
      try {
        // Get cached analytics
        const analyticsSnap = await firestore()
          .collection('groupAnalytics')
          .where('groupId', '==', groupId)
          .orderBy('generatedAt', 'desc')
          .limit(1)
          .get();

        if (!analyticsSnap.empty) {
          const data = analyticsSnap.docs[0].data();
          setAnalytics({ id: analyticsSnap.docs[0].id, ...data } as GroupAnalytics);
        } else {
          // Compute on-the-fly
          const computed = await computeGroupAnalytics(groupId, range);
          setAnalytics(computed);
        }

        // Fetch contribution time series
        const dateRange = getDateRange(range);
        const contributionsSnap = await firestore()
          .collection('contributions')
          .where('groupId', '==', groupId)
          .where('createdAt', '>=', firestore.Timestamp.fromDate(dateRange.startDate))
          .orderBy('createdAt', 'asc')
          .get();

        const trend = aggregateToTimeSeries(contributionsSnap.docs, 'amount', range);
        setContributionTrend(trend);

        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('[useGroupAnalytics] Error:', err);
        setError((err as Error).message);
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [groupId, range]);

  const refresh = useCallback(async () => {
    const computed = await computeGroupAnalytics(groupId, range);
    setAnalytics(computed);
  }, [groupId, range]);

  return { analytics, contributionTrend, isLoading, error, refresh };
};

/**
 * Compute group analytics on-the-fly
 */
const computeGroupAnalytics = async (
  groupId: string,
  range: TimeRange
): Promise<GroupAnalytics> => {
  const dateRange = getDateRange(range);

  const [groupDoc, membersSnap, contributionsSnap, paymentsSnap] = await Promise.all([
    firestore().collection('groups').doc(groupId).get(),
    firestore()
      .collection('group_members')
      .where('groupId', '==', groupId)
      .where('status', '==', 'active')
      .get(),
    firestore()
      .collection('contributions')
      .where('groupId', '==', groupId)
      .where('status', '==', 'verified')
      .get(),
    firestore()
      .collection('scheduledPayments')
      .where('groupId', '==', groupId)
      .where('dueDate', '>=', firestore.Timestamp.fromDate(dateRange.startDate))
      .get(),
  ]);

  const group = groupDoc.data() || {};
  const memberCount = membersSnap.size;
  const totalContributions = contributionsSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().amount || 0),
    0
  );

  const paidPayments = paymentsSnap.docs.filter(d => d.data().status === 'paid').length;
  const overduePayments = paymentsSnap.docs.filter(d => d.data().status === 'overdue').length;
  const totalPayments = paymentsSnap.size;

  const collectionRate = totalPayments > 0 ? paidPayments / totalPayments : 1;
  const delinquencyRate = totalPayments > 0 ? overduePayments / totalPayments : 0;

  // Build top contributors
  const contributionsByMember: Record<string, { name: string; total: number }> = {};
  contributionsSnap.docs.forEach(doc => {
    const data = doc.data();
    const memberId = data.memberId;
    if (!contributionsByMember[memberId]) {
      contributionsByMember[memberId] = { name: data.memberName || 'Unknown', total: 0 };
    }
    contributionsByMember[memberId].total += data.amount || 0;
  });

  const topContributors = Object.entries(contributionsByMember)
    .map(([memberId, { name, total }]) => ({
      memberId,
      memberName: name,
      totalContributed: total,
      onTimeRate: 0.95,
    }))
    .sort((a, b) => b.totalContributed - a.totalContributed)
    .slice(0, 5);

  return {
    id: `${groupId}_computed`,
    groupId,
    groupName: group.name || 'Unknown',
    period: range,
    generatedAt: firestore.Timestamp.now(),
    totalContributions,
    averageContribution: memberCount > 0 ? totalContributions / memberCount : 0,
    totalDisbursed: 0,
    currentPool: totalContributions,
    memberCount,
    activeMembers: memberCount,
    newMembers: 0,
    churnedMembers: 0,
    retentionRate: 1,
    collectionRate,
    onTimePaymentRate: collectionRate,
    delinquencyRate,
    avgDaysToPayment: 0,
    completedDraws: 0,
    totalPrizeDisbursed: 0,
    contributionTrend: [],
    memberTrend: [],
    topContributors,
    delinquentMembers: [],
  };
};

// ==================== USE MEMBER ANALYTICS ====================

/**
 * Hook for member-specific analytics with risk scoring
 */
export const useMemberAnalytics = (memberId: string, range: TimeRange = 'month') => {
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchAnalytics = async () => {
      try {
        const dateRange = getDateRange(range);

        const [memberDoc, contributionsSnap, paymentsSnap] = await Promise.all([
          firestore().collection('users').doc(memberId).get(),
          firestore()
            .collection('contributions')
            .where('memberId', '==', memberId)
            .where('status', '==', 'verified')
            .get(),
          firestore()
            .collection('scheduledPayments')
            .where('memberId', '==', memberId)
            .where('dueDate', '>=', firestore.Timestamp.fromDate(dateRange.startDate))
            .get(),
        ]);

        const member = memberDoc.data() || {};
        const totalContributed = contributionsSnap.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        const onTimePayments = paymentsSnap.docs.filter(d => d.data().status === 'paid').length;
        const latePayments = paymentsSnap.docs.filter(d => d.data().status === 'overdue').length;
        const totalPayments = paymentsSnap.size;
        const onTimeRate = totalPayments > 0 ? onTimePayments / totalPayments : 1;

        // Import and use risk scoring
        const { computeRiskScore, computeChurnProbability } = await import('../utils/riskScore');
        
        const riskResult = computeRiskScore({
          onTimeRate,
          latePaymentCount: latePayments,
          missedPaymentCount: 0,
          averageDelayDays: 0,
          accountAge: 90,
          recentActivityDays: 0,
          totalPayments,
          consecutiveLatePayments: 0,
        });

        const churnProbability = computeChurnProbability(riskResult.score, 0, 0);

        setAnalytics({
          id: `${memberId}_computed`,
          memberId,
          memberName: member.name || 'Unknown',
          period: range,
          generatedAt: firestore.Timestamp.now(),
          totalContributed,
          averageContribution: totalPayments > 0 ? totalContributed / totalPayments : 0,
          totalReceived: 0,
          paymentCount: totalPayments,
          onTimePayments,
          latePayments,
          missedPayments: 0,
          onTimeRate,
          riskScore: riskResult.score,
          riskFactors: riskResult.factors,
          churnProbability,
          contributionHistory: [],
          riskScoreHistory: [],
          activeGroups: 0,
          groupMemberships: [],
        });

        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('[useMemberAnalytics] Error:', err);
        setError((err as Error).message);
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [memberId, range]);

  return { analytics, isLoading, error };
};

// ==================== USE ANALYTICS ALERTS ====================

/**
 * Hook for real-time analytics alerts
 */
export const useAnalyticsAlerts = (limit = 10) => {
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = firestore()
      .collection('analyticsAlerts')
      .where('resolved', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .onSnapshot(
        (snapshot) => {
          const fetchedAlerts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as AnalyticsAlert[];
          setAlerts(fetchedAlerts);
          setIsLoading(false);
          setError(null);
        },
        (err) => {
          console.error('[useAnalyticsAlerts] Error:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, [limit]);

  const acknowledgeAlert = useCallback(async (alertId: string, userId: string) => {
    await firestore().collection('analyticsAlerts').doc(alertId).update({
      acknowledgedAt: firestore.FieldValue.serverTimestamp(),
      acknowledgedBy: userId,
    });
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    await firestore().collection('analyticsAlerts').doc(alertId).update({
      resolved: true,
    });
  }, []);

  return { alerts, isLoading, error, acknowledgeAlert, resolveAlert };
};

// ==================== USE ANALYTICS HEALTH ====================

/**
 * Hook for system health monitoring
 */
export const useAnalyticsHealth = () => {
  const [health, setHealth] = useState<AnalyticsHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = firestore()
      .collection('analyticsHealth')
      .doc('status')
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            setHealth({ id: snapshot.id, ...snapshot.data() } as AnalyticsHealth);
          }
          setIsLoading(false);
          setError(null);
        },
        (err) => {
          console.error('[useAnalyticsHealth] Error:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  const triggerRecompute = useCallback(async (startDate: string, endDate: string) => {
    const fn = functions().httpsCallable('recomputeRange');
    const result = await fn({ startDate, endDate });
    return result.data;
  }, []);

  return { health, isLoading, error, triggerRecompute };
};

// ==================== HELPER FUNCTIONS ====================

const getPeriodId = (range: TimeRange): string => {
  const now = new Date();
  switch (range) {
    case 'today':
      return `daily_${now.toISOString().split('T')[0]}`;
    case 'week':
      return `weekly_${getWeekNumber(now)}`;
    case 'month':
      return `monthly_${now.toISOString().slice(0, 7)}`;
    case 'quarter':
      return `quarterly_${now.getFullYear()}_Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    case 'year':
      return `yearly_${now.getFullYear()}`;
    default:
      return 'global';
  }
};

const getDateRange = (range: TimeRange): DateRange => {
  const now = new Date();
  const endDate = now;
  let startDate: Date;

  switch (range) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
  }

  return { startDate, endDate };
};

const getWeekNumber = (date: Date): string => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return `${date.getFullYear()}_W${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`;
};

const aggregateToTimeSeries = (
  docs: FirebaseFirestoreTypes.QueryDocumentSnapshot[],
  valueField: string,
  range: TimeRange
): TimeSeriesPoint[] => {
  const buckets: Record<string, number> = {};

  docs.forEach(doc => {
    const data = doc.data();
    const timestamp = data.createdAt?.toDate() || new Date();
    const bucketKey = getBucketKey(timestamp, range);
    buckets[bucketKey] = (buckets[bucketKey] || 0) + (data[valueField] || 0);
  });

  return Object.entries(buckets)
    .map(([label, value]) => ({ timestamp: label, value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const getBucketKey = (date: Date, range: TimeRange): string => {
  switch (range) {
    case 'today':
      return `${date.getHours()}:00`;
    case 'week':
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    case 'month':
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    case 'quarter':
    case 'year':
      return date.toLocaleDateString('en-US', { month: 'short' });
    default:
      return date.toISOString().split('T')[0];
  }
};
