/**
 * Audit Service
 * Client-side service for audit log queries
 */

import firestore from '@react-native-firebase/firestore';
import type { AuditLogEntry, AuditLogFilters, PaginationOptions, PaginatedResult } from '../types/payment';

const AUDIT_LOG_COLLECTION = 'auditLogs';

export const auditService = {
  /**
   * Get audit logs with filters and pagination
   */
  getAuditLogs: async (
    filters: AuditLogFilters = {},
    pagination: PaginationOptions = { limit: 50, orderBy: 'timestamp', orderDirection: 'desc' }
  ): Promise<PaginatedResult<AuditLogEntry>> => {
    try {
      let query = firestore()
        .collection(AUDIT_LOG_COLLECTION)
        .orderBy(pagination.orderBy || 'timestamp', pagination.orderDirection || 'desc')
        .limit(pagination.limit + 1);

      if (filters.actorId) {
        query = query.where('actorId', '==', filters.actorId);
      }

      if (filters.actorType) {
        query = query.where('actorType', '==', filters.actorType);
      }

      if (filters.action && filters.action.length > 0) {
        query = query.where('action', 'in', filters.action);
      }

      if (filters.targetCollection) {
        query = query.where('targetCollection', '==', filters.targetCollection);
      }

      if (filters.targetId) {
        query = query.where('targetId', '==', filters.targetId);
      }

      if (filters.successOnly) {
        query = query.where('success', '==', true);
      }

      if (pagination.cursor) {
        query = query.startAfter(pagination.cursor);
      }

      const snapshot = await query.get();
      const docs = snapshot.docs;
      const hasMore = docs.length > pagination.limit;
      const data = docs.slice(0, pagination.limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLogEntry[];

      return {
        data,
        hasMore,
        nextCursor: hasMore ? docs[pagination.limit - 1] : undefined,
      };
    } catch (error) {
      console.error('[auditService] Error fetching audit logs:', error);
      throw new Error('Failed to fetch audit logs');
    }
  },

  /**
   * Get audit logs for a specific target
   */
  getAuditLogsForTarget: async (
    targetCollection: string,
    targetId: string,
    limit: number = 20
  ): Promise<AuditLogEntry[]> => {
    try {
      const snapshot = await firestore()
        .collection(AUDIT_LOG_COLLECTION)
        .where('targetCollection', '==', targetCollection)
        .where('targetId', '==', targetId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLogEntry[];
    } catch (error) {
      console.error('[auditService] Error fetching target audit logs:', error);
      throw new Error('Failed to fetch audit logs for target');
    }
  },

  /**
   * Get recent audit activity
   */
  getRecentActivity: async (hours: number = 24, limit: number = 50): Promise<AuditLogEntry[]> => {
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hours);

      const snapshot = await firestore()
        .collection(AUDIT_LOG_COLLECTION)
        .where('timestamp', '>=', firestore.Timestamp.fromDate(cutoff))
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLogEntry[];
    } catch (error) {
      console.error('[auditService] Error fetching recent activity:', error);
      throw new Error('Failed to fetch recent activity');
    }
  },

  /**
   * Log admin action (client-side helper)
   */
  logAdminAction: async (
    adminId: string,
    action: string,
    targetCollection: string,
    targetId: string,
    payload: Record<string, unknown>
  ): Promise<string> => {
    try {
      const logEntry = {
        action,
        actorId: adminId,
        actorType: 'admin' as const,
        targetCollection,
        targetId,
        payload,
        success: true,
        timestamp: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await firestore().collection(AUDIT_LOG_COLLECTION).add(logEntry);
      return docRef.id;
    } catch (error) {
      console.error('[auditService] Error logging admin action:', error);
      throw new Error('Failed to log admin action');
    }
  },

  /**
   * Subscribe to audit logs (real-time)
   */
  onAuditLogsSnapshot: (
    callback: (logs: AuditLogEntry[]) => void,
    onError?: (error: Error) => void,
    targetCollection?: string
  ) => {
    try {
      let query = firestore()
        .collection(AUDIT_LOG_COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(100);

      if (targetCollection) {
        query = query.where('targetCollection', '==', targetCollection);
      }

      return query.onSnapshot(
        snapshot => {
          const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as AuditLogEntry[];
          callback(logs);
        },
        error => {
          console.error('[auditService] Snapshot error:', error);
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('[auditService] Error setting up listener:', error);
      throw new Error('Failed to set up audit logs listener');
    }
  },

  /**
   * Get activity summary
   */
  getActivitySummary: async (
    hours: number = 24
  ): Promise<{
    total: number;
    byAction: Record<string, number>;
    byActor: Record<string, number>;
    failures: number;
  }> => {
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hours);

      const snapshot = await firestore()
        .collection(AUDIT_LOG_COLLECTION)
        .where('timestamp', '>=', firestore.Timestamp.fromDate(cutoff))
        .get();

      const logs = snapshot.docs.map(doc => doc.data());

      const byAction: Record<string, number> = {};
      const byActor: Record<string, number> = {};
      let failures = 0;

      logs.forEach(log => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        byActor[log.actorType] = (byActor[log.actorType] || 0) + 1;
        if (!log.success) failures++;
      });

      return {
        total: logs.length,
        byAction,
        byActor,
        failures,
      };
    } catch (error) {
      console.error('[auditService] Error fetching activity summary:', error);
      throw new Error('Failed to fetch activity summary');
    }
  },
};
