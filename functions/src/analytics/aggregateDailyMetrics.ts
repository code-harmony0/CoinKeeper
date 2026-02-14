/**
 * Daily Aggregation Cloud Function
 * Computes daily analytics aggregates for groups and global metrics
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AnalyticsOverview, GroupAnalyticsDocument, AnalyticsAlert } from './types';

const db = admin.firestore();

// ==================== DAILY AGGREGATION ====================

/**
 * Nightly job to compute daily analytics aggregates
 * Runs at 1:00 AM IST
 */
export const aggregateDailyMetrics = functions.pubsub
  .schedule('0 1 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const startTime = Date.now();
    console.log('[aggregateDailyMetrics] Starting daily aggregation');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const periodId = `daily_${dateStr}`;

    try {
      // Aggregate global metrics
      await aggregateGlobalMetrics(periodId, yesterday);

      // Aggregate per-group metrics
      await aggregateGroupMetrics(periodId, yesterday);

      // Update health document
      await updateHealthStatus('daily', true);

      // Check for alert conditions
      await checkAlertThresholds(periodId);

      const duration = Date.now() - startTime;
      console.log(`[aggregateDailyMetrics] Completed in ${duration}ms`);

    } catch (error) {
      console.error('[aggregateDailyMetrics] Error:', error);
      await updateHealthStatus('daily', false, (error as Error).message);
    }

    return null;
  });

/**
 * Aggregate global metrics across all groups
 */
const aggregateGlobalMetrics = async (periodId: string, date: Date): Promise<void> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Query data
  const [
    groupsSnapshot,
    membersSnapshot,
    contributionsSnapshot,
    paymentsSnapshot,
    drawsSnapshot,
  ] = await Promise.all([
    db.collection('groups').where('status', '==', 'active').get(),
    db.collection('group_members').where('status', '==', 'active').get(),
    db.collection('contributions')
      .where('createdAt', '>=', Timestamp.fromDate(startOfDay))
      .where('createdAt', '<=', Timestamp.fromDate(endOfDay))
      .get(),
    db.collection('scheduledPayments')
      .where('dueDate', '>=', Timestamp.fromDate(startOfDay))
      .where('dueDate', '<=', Timestamp.fromDate(endOfDay))
      .get(),
    db.collection('draws')
      .where('completedAt', '>=', Timestamp.fromDate(startOfDay))
      .where('completedAt', '<=', Timestamp.fromDate(endOfDay))
      .get(),
  ]);

  // Calculate metrics
  const activeGroups = groupsSnapshot.size;
  const activeMembers = membersSnapshot.size;

  let totalCollected = 0;
  let totalDisbursed = 0;
  contributionsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.status === 'verified') {
      totalCollected += data.amount || 0;
    }
  });

  drawsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    totalDisbursed += data.totalPrizeAmount || 0;
  });

  // Payment metrics
  const pendingPayments = paymentsSnapshot.docs.filter(d => d.data().status === 'pending').length;
  const overduePayments = paymentsSnapshot.docs.filter(d => d.data().status === 'overdue').length;
  const completedPayments = paymentsSnapshot.docs.filter(d => d.data().status === 'paid').length;
  const totalPayments = paymentsSnapshot.size;

  const collectionRate = totalPayments > 0 ? completedPayments / totalPayments : 0;
  const delinquencyRate = totalPayments > 0 ? overduePayments / totalPayments : 0;

  // Get previous period for trends
  const previousPeriodId = getPreviousPeriodId(periodId);
  const previousDoc = await db.collection('analyticsOverview').doc(previousPeriodId).get();
  const previous = previousDoc.exists ? previousDoc.data() as AnalyticsOverview : null;

  // Calculate changes
  const pooledChange = previous ? ((totalCollected - previous.totalCollected) / Math.max(previous.totalCollected, 1)) * 100 : 0;
  const groupsChange = previous ? activeGroups - previous.activeGroups : 0;
  const membersChange = previous ? activeMembers - previous.activeMembers : 0;

  // Query total pooled (running total)
  const allContributions = await db.collection('contributions').where('status', '==', 'verified').get();
  const totalPooled = allContributions.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

  // Get alert counts
  const alertsSnapshot = await db.collection('analyticsAlerts')
    .where('resolved', '==', false)
    .get();
  const alertCount = alertsSnapshot.size;
  const criticalAlerts = alertsSnapshot.docs.filter(d => d.data().priority === 'critical').length;

  // Build overview document
  const overview: AnalyticsOverview = {
    id: periodId,
    period: periodId,
    generatedAt: FieldValue.serverTimestamp(),
    totalPooled,
    totalCollected,
    totalDisbursed,
    activeGroups,
    activeMembers,
    collectionRate,
    delinquencyRate,
    retentionRate: 0.95, // TODO: Calculate from member churn
    pendingPayments,
    overduePayments,
    completedDraws: drawsSnapshot.size,
    failedTransactions: 0, // TODO: Calculate from failed payments
    pooledChange,
    collectedChange: pooledChange, // Same calculation
    groupsChange,
    membersChange,
    alertCount,
    criticalAlerts,
    version: 1,
  };

  // Save
  await db.collection('analyticsOverview').doc(periodId).set(overview);

  // Also update 'global' document for latest
  await db.collection('analyticsOverview').doc('global').set({
    ...overview,
    id: 'global',
  });

  console.log(`[aggregateGlobalMetrics] Saved global metrics for ${periodId}`);
};

/**
 * Aggregate per-group metrics
 */
const aggregateGroupMetrics = async (periodId: string, date: Date): Promise<void> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const groupsSnapshot = await db.collection('groups').where('status', '==', 'active').get();

  const batch = db.batch();
  let processedCount = 0;

  for (const groupDoc of groupsSnapshot.docs) {
    const group = groupDoc.data();
    const groupId = groupDoc.id;

    // Query group-specific data
    const [membersSnapshot, contributionsSnapshot, paymentsSnapshot] = await Promise.all([
      db.collection('group_members')
        .where('groupId', '==', groupId)
        .where('status', '==', 'active')
        .get(),
      db.collection('contributions')
        .where('groupId', '==', groupId)
        .where('status', '==', 'verified')
        .get(),
      db.collection('scheduledPayments')
        .where('groupId', '==', groupId)
        .where('dueDate', '>=', Timestamp.fromDate(startOfDay))
        .where('dueDate', '<=', Timestamp.fromDate(endOfDay))
        .get(),
    ]);

    const totalContributions = contributionsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0),
      0
    );
    const memberCount = membersSnapshot.size;
    const averageContribution = memberCount > 0 ? totalContributions / memberCount : 0;

    const completedPayments = paymentsSnapshot.docs.filter(d => d.data().status === 'paid').length;
    const overduePayments = paymentsSnapshot.docs.filter(d => d.data().status === 'overdue').length;
    const totalPayments = paymentsSnapshot.size;

    const collectionRate = totalPayments > 0 ? completedPayments / totalPayments : 1;
    const delinquencyRate = totalPayments > 0 ? overduePayments / totalPayments : 0;

    const groupAnalytics: GroupAnalyticsDocument = {
      id: `${groupId}_${periodId}`,
      groupId,
      groupName: group.name || 'Unknown',
      period: periodId,
      generatedAt: FieldValue.serverTimestamp(),
      totalContributions,
      averageContribution,
      totalDisbursed: 0, // TODO: Calculate from draws
      currentPool: totalContributions, // Simplified
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
      version: 1,
    };

    const docRef = db.collection('groupAnalytics').doc(`${groupId}_${periodId}`);
    batch.set(docRef, groupAnalytics);
    processedCount++;

    // Commit in batches of 400 (Firestore limit is 500)
    if (processedCount % 400 === 0) {
      await batch.commit();
    }
  }

  // Final commit
  await batch.commit();
  console.log(`[aggregateGroupMetrics] Processed ${processedCount} groups`);
};

// ==================== ALERT CHECKING ====================

/**
 * Check metrics against thresholds and generate alerts
 */
const checkAlertThresholds = async (periodId: string): Promise<void> => {
  const overviewDoc = await db.collection('analyticsOverview').doc(periodId).get();
  if (!overviewDoc.exists) return;

  const overview = overviewDoc.data() as AnalyticsOverview;
  const alerts: AnalyticsAlert[] = [];

  // Check delinquency rate
  if (overview.delinquencyRate > 0.15) { // 15% threshold
    alerts.push({
      type: 'overdue_spike',
      priority: overview.delinquencyRate > 0.25 ? 'critical' : 'high',
      title: 'High Delinquency Rate',
      message: `Delinquency rate is ${(overview.delinquencyRate * 100).toFixed(1)}%, above 15% threshold`,
      metric: 'delinquencyRate',
      currentValue: overview.delinquencyRate,
      threshold: 0.15,
      createdAt: FieldValue.serverTimestamp(),
      resolved: false,
    });
  }

  // Check collection rate drop
  if (overview.collectionRate < 0.8) { // Below 80%
    alerts.push({
      type: 'collection_drop',
      priority: overview.collectionRate < 0.7 ? 'critical' : 'high',
      title: 'Low Collection Rate',
      message: `Collection rate dropped to ${(overview.collectionRate * 100).toFixed(1)}%`,
      metric: 'collectionRate',
      currentValue: overview.collectionRate,
      threshold: 0.8,
      createdAt: FieldValue.serverTimestamp(),
      resolved: false,
    });
  }

  // Check overdue count
  if (overview.overduePayments > 20) {
    alerts.push({
      type: 'threshold_breach',
      priority: overview.overduePayments > 50 ? 'critical' : 'medium',
      title: 'High Overdue Payments',
      message: `${overview.overduePayments} payments are overdue`,
      metric: 'overduePayments',
      currentValue: overview.overduePayments,
      threshold: 20,
      createdAt: FieldValue.serverTimestamp(),
      resolved: false,
    });
  }

  // Save alerts
  const batch = db.batch();
  for (const alert of alerts) {
    const ref = db.collection('analyticsAlerts').doc();
    batch.set(ref, alert);
  }
  await batch.commit();

  console.log(`[checkAlertThresholds] Generated ${alerts.length} alerts`);
};

// ==================== HELPER FUNCTIONS ====================

const getPreviousPeriodId = (periodId: string): string => {
  const match = periodId.match(/daily_(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const date = new Date(match[1]);
    date.setDate(date.getDate() - 1);
    return `daily_${date.toISOString().split('T')[0]}`;
  }
  return periodId;
};

const updateHealthStatus = async (
  type: 'daily' | 'hourly',
  success: boolean,
  error?: string
): Promise<void> => {
  const healthRef = db.collection('analyticsHealth').doc('status');
  
  const update: Record<string, unknown> = {
    lastUpdated: FieldValue.serverTimestamp(),
    [`last${type.charAt(0).toUpperCase() + type.slice(1)}Aggregation`]: FieldValue.serverTimestamp(),
  };

  if (!success && error) {
    update['recentFailures'] = FieldValue.arrayUnion({
      jobId: `${type}_${Date.now()}`,
      jobType: type,
      error,
      timestamp: Timestamp.now(),
    });
    update['failedJobs'] = FieldValue.increment(1);
  } else {
    update['completedJobsToday'] = FieldValue.increment(1);
    update['aggregationLag'] = 0;
    update['dataFreshness'] = 'fresh';
  }

  await healthRef.set(update, { merge: true });
};

// ==================== ON-DEMAND RECOMPUTE ====================

/**
 * HTTP endpoint to trigger recompute for a specific date range
 */
export const recomputeRange = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { startDate, endDate, groupId } = data;

  if (!startDate || !endDate) {
    throw new functions.https.HttpsError('invalid-argument', 'startDate and endDate required');
  }

  console.log(`[recomputeRange] Recomputing ${startDate} to ${endDate}`);

  const start = new Date(startDate);
  const end = new Date(endDate);
  let current = new Date(start);
  let recomputedDays = 0;

  while (current <= end) {
    const periodId = `daily_${current.toISOString().split('T')[0]}`;
    
    try {
      await aggregateGlobalMetrics(periodId, current);
      await aggregateGroupMetrics(periodId, current);
      recomputedDays++;
    } catch (error) {
      console.error(`[recomputeRange] Error for ${periodId}:`, error);
    }

    current.setDate(current.getDate() + 1);
  }

  return { success: true, recomputedDays };
});
