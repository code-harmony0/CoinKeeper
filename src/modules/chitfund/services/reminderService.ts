/**
 * Reminder Service
 * Client-side service for reminder templates and notification logs
 */

import firestore from '@react-native-firebase/firestore';
import type { ReminderTemplate, NotificationLog, NotificationChannel } from '../types/payment';

const COLLECTIONS = {
  REMINDER_TEMPLATES: 'reminderTemplates',
  NOTIFICATION_LOGS: 'notificationLogs',
  ESCALATION_RULES: 'escalationRules',
};

export const reminderService = {
  // ==================== TEMPLATES ====================

  /**
   * Get reminder templates
   */
  getReminderTemplates: async (groupId?: string): Promise<ReminderTemplate[]> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.REMINDER_TEMPLATES)
        .orderBy('type', 'asc');

      if (groupId) {
        // Get group-specific and global templates
        query = query.where('groupId', 'in', [groupId, null]);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ReminderTemplate[];
    } catch (error) {
      console.error('[reminderService] Error fetching templates:', error);
      throw new Error('Failed to fetch reminder templates');
    }
  },

  /**
   * Create reminder template
   */
  createReminderTemplate: async (
    data: Omit<ReminderTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    adminId: string
  ): Promise<string> => {
    try {
      const templateData = {
        ...data,
        createdBy: adminId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.REMINDER_TEMPLATES)
        .add(templateData);

      return docRef.id;
    } catch (error) {
      console.error('[reminderService] Error creating template:', error);
      throw new Error('Failed to create reminder template');
    }
  },

  /**
   * Update reminder template
   */
  updateReminderTemplate: async (
    templateId: string,
    updates: Partial<Omit<ReminderTemplate, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.REMINDER_TEMPLATES)
        .doc(templateId)
        .update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[reminderService] Error updating template:', error);
      throw new Error('Failed to update reminder template');
    }
  },

  /**
   * Delete reminder template
   */
  deleteReminderTemplate: async (templateId: string): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.REMINDER_TEMPLATES)
        .doc(templateId)
        .delete();
    } catch (error) {
      console.error('[reminderService] Error deleting template:', error);
      throw new Error('Failed to delete reminder template');
    }
  },

  /**
   * Toggle template enabled status
   */
  toggleTemplateEnabled: async (templateId: string, enabled: boolean): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.REMINDER_TEMPLATES)
        .doc(templateId)
        .update({
          enabled,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[reminderService] Error toggling template:', error);
      throw new Error('Failed to toggle template status');
    }
  },

  // ==================== NOTIFICATION LOGS ====================

  /**
   * Get notification logs
   */
  getNotificationLogs: async (
    filters: {
      recipientId?: string;
      groupId?: string;
      scheduledPaymentId?: string;
      channel?: NotificationChannel;
      status?: string;
    } = {},
    limit: number = 50
  ): Promise<NotificationLog[]> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.NOTIFICATION_LOGS)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (filters.recipientId) {
        query = query.where('recipientId', '==', filters.recipientId);
      }

      if (filters.groupId) {
        query = query.where('groupId', '==', filters.groupId);
      }

      if (filters.scheduledPaymentId) {
        query = query.where('scheduledPaymentId', '==', filters.scheduledPaymentId);
      }

      if (filters.channel) {
        query = query.where('channel', '==', filters.channel);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationLog[];
    } catch (error) {
      console.error('[reminderService] Error fetching notification logs:', error);
      throw new Error('Failed to fetch notification logs');
    }
  },

  /**
   * Subscribe to notification logs (real-time)
   */
  onNotificationLogsSnapshot: (
    callback: (logs: NotificationLog[]) => void,
    onError?: (error: Error) => void,
    groupId?: string
  ) => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.NOTIFICATION_LOGS)
        .orderBy('createdAt', 'desc')
        .limit(100);

      if (groupId) {
        query = query.where('groupId', '==', groupId);
      }

      return query.onSnapshot(
        snapshot => {
          const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as NotificationLog[];
          callback(logs);
        },
        error => {
          console.error('[reminderService] Snapshot error:', error);
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('[reminderService] Error setting up listener:', error);
      throw new Error('Failed to set up notification logs listener');
    }
  },

  // ==================== ESCALATION RULES ====================

  /**
   * Get escalation rules for a group
   */
  getEscalationRules: async (groupId: string) => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.ESCALATION_RULES)
        .where('groupId', '==', groupId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('[reminderService] Error fetching escalation rules:', error);
      throw new Error('Failed to fetch escalation rules');
    }
  },

  /**
   * Update escalation rules
   */
  updateEscalationRules: async (
    groupId: string,
    rules: {
      enabled?: boolean;
      gracePeriodDays?: number;
      reminderFrequencyDays?: number;
      maxReminders?: number;
      lateFeeEnabled?: boolean;
      lateFeeType?: 'flat' | 'percentage';
      lateFeeAmount?: number;
      lateFeeMaxCap?: number;
      autoSuspendEnabled?: boolean;
      autoSuspendAfterDays?: number;
    }
  ): Promise<void> => {
    try {
      const existingRules = await reminderService.getEscalationRules(groupId);

      if (existingRules) {
        await firestore()
          .collection(COLLECTIONS.ESCALATION_RULES)
          .doc(existingRules.id)
          .update({
            ...rules,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      } else {
        await firestore().collection(COLLECTIONS.ESCALATION_RULES).add({
          groupId,
          ...rules,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('[reminderService] Error updating escalation rules:', error);
      throw new Error('Failed to update escalation rules');
    }
  },
};
