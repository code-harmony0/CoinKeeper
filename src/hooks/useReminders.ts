/**
 * useReminders Hook
 * Reminder template and notification log management
 */

import { useState, useEffect, useCallback } from 'react';
import type { ReminderTemplate, NotificationLog } from '../types/payment';
import { reminderService } from '../services/reminderService';

interface UseReminderTemplatesOptions {
  groupId?: string;
}

interface UseReminderTemplatesResult {
  templates: ReminderTemplate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  createTemplate: (
    data: Omit<ReminderTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    adminId: string
  ) => Promise<string>;
  updateTemplate: (
    templateId: string,
    updates: Partial<ReminderTemplate>
  ) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  toggleEnabled: (templateId: string, enabled: boolean) => Promise<void>;
}

export const useReminderTemplates = (
  options: UseReminderTemplatesOptions = {}
): UseReminderTemplatesResult => {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await reminderService.getReminderTemplates(options.groupId);
      setTemplates(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  }, [options.groupId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(
    async (
      data: Omit<ReminderTemplate, 'id' | 'createdAt' | 'updatedAt'>,
      adminId: string
    ): Promise<string> => {
      const id = await reminderService.createReminderTemplate(data, adminId);
      await fetchTemplates();
      return id;
    },
    [fetchTemplates]
  );

  const updateTemplate = useCallback(
    async (templateId: string, updates: Partial<ReminderTemplate>): Promise<void> => {
      await reminderService.updateReminderTemplate(templateId, updates);
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      await reminderService.deleteReminderTemplate(templateId);
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  const toggleEnabled = useCallback(
    async (templateId: string, enabled: boolean): Promise<void> => {
      await reminderService.toggleTemplateEnabled(templateId, enabled);
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  return {
    templates,
    isLoading,
    error,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleEnabled,
  };
};

/**
 * useNotificationLogs Hook
 * Notification delivery logs
 */
interface UseNotificationLogsOptions {
  groupId?: string;
  recipientId?: string;
  scheduledPaymentId?: string;
  limit?: number;
}

export const useNotificationLogs = (options: UseNotificationLogsOptions = {}) => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await reminderService.getNotificationLogs(
        {
          groupId: options.groupId,
          recipientId: options.recipientId,
          scheduledPaymentId: options.scheduledPaymentId,
        },
        options.limit || 50
      );
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notification logs');
    } finally {
      setIsLoading(false);
    }
  }, [options.groupId, options.recipientId, options.scheduledPaymentId, options.limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'sent').length,
    delivered: logs.filter((l) => l.status === 'delivered').length,
    failed: logs.filter((l) => l.status === 'failed').length,
    pending: logs.filter((l) => l.status === 'queued').length,
  };

  return {
    logs,
    isLoading,
    error,
    refresh: fetchLogs,
    stats,
  };
};

/**
 * useEscalationRules Hook
 * Group escalation rules management
 */
export const useEscalationRules = (groupId: string) => {
  const [rules, setRules] = useState<Awaited<
    ReturnType<typeof reminderService.getEscalationRules>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await reminderService.getEscalationRules(groupId);
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch escalation rules');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const updateRules = useCallback(
    async (updates: Parameters<typeof reminderService.updateEscalationRules>[1]) => {
      await reminderService.updateEscalationRules(groupId, updates);
      await fetchRules();
    },
    [groupId, fetchRules]
  );

  return {
    rules,
    isLoading,
    error,
    refresh: fetchRules,
    updateRules,
  };
};
