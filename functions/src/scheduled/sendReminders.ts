/**
 * Send Reminders
 * Scheduled job to send payment reminders via SMS/WhatsApp/Push
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSchedulerAction } from '../utils/auditLogger';

const SCHEDULED_PAYMENTS_COLLECTION = 'scheduledPayments';
const REMINDER_TEMPLATES_COLLECTION = 'reminderTemplates';
const NOTIFICATION_LOGS_COLLECTION = 'notificationLogs';

interface ScheduledPaymentData {
  id: string;
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberEmail?: string;
  amount: number;
  dueDate: admin.firestore.Timestamp;
  status: string;
  remindersSent: number;
  lastReminderAt?: admin.firestore.Timestamp;
}

interface ReminderTemplateData {
  id: string;
  groupId?: string;
  name: string;
  type: 'pre_due' | 'on_due' | 'post_due' | 'overdue';
  triggerDays: number;
  channels: string[];
  enabled: boolean;
  messageTemplate: string;
  sendTime: string;
  priority: string;
}

type NotificationChannel = 'sms' | 'whatsapp' | 'push' | 'email';

/**
 * Process template variables
 */
const processTemplate = (
  template: string,
  variables: Record<string, string | number>
): string => {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, String(value));
  }

  return result;
};

/**
 * Send SMS (placeholder - integrate with actual provider)
 */
const sendSMS = async (
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  // TODO: Integrate with actual SMS provider (e.g., Africa's Talking, Termii, Twilio)
  console.log(`[sendSMS] Sending to ${phone}: ${message.substring(0, 50)}...`);

  // Placeholder success
  return {
    success: true,
    messageId: `SMS_${Date.now()}`,
  };
};

/**
 * Send WhatsApp (placeholder - integrate with actual provider)
 */
const sendWhatsApp = async (
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  // TODO: Integrate with WhatsApp Business API
  console.log(`[sendWhatsApp] Sending to ${phone}: ${message.substring(0, 50)}...`);

  return {
    success: true,
    messageId: `WA_${Date.now()}`,
  };
};

/**
 * Send Push Notification (placeholder)
 */
const sendPushNotification = async (
  userId: string,
  title: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  // TODO: Integrate with Firebase Cloud Messaging
  console.log(`[sendPush] Sending to ${userId}: ${title}`);

  return {
    success: true,
    messageId: `PUSH_${Date.now()}`,
  };
};

/**
 * Log notification attempt
 */
const logNotification = async (
  db: admin.firestore.Firestore,
  data: {
    type: string;
    channel: NotificationChannel;
    recipientId: string;
    recipientPhone?: string;
    templateId?: string;
    message: string;
    status: 'sent' | 'failed';
    providerMessageId?: string;
    errorMessage?: string;
    scheduledPaymentId: string;
    groupId: string;
  }
): Promise<void> => {
  await db.collection(NOTIFICATION_LOGS_COLLECTION).add({
    ...data,
    retryCount: 0,
    maxRetries: 3,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sentAt: data.status === 'sent' ? admin.firestore.FieldValue.serverTimestamp() : null,
  });
};

/**
 * Send Reminders
 * Runs every 30 minutes
 */
export const sendReminders = functions.pubsub
  .schedule('*/30 * * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();

    console.log('[sendReminders] Starting reminder processing');

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // Load reminder templates
      const templatesSnapshot = await db
        .collection(REMINDER_TEMPLATES_COLLECTION)
        .where('enabled', '==', true)
        .get();

      const templates = templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ReminderTemplateData[];

      console.log(`[sendReminders] Found ${templates.length} active templates`);

      // Group templates by trigger type
      const preDueTemplates = templates.filter(t => t.type === 'pre_due');
      const onDueTemplates = templates.filter(t => t.type === 'on_due');
      const overdueTemplates = templates.filter(t => t.type === 'overdue');

      // Process pre-due reminders (payments due in X days)
      for (const template of preDueTemplates) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + template.triggerDays);

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Find payments due on target date
        let query = db
          .collection(SCHEDULED_PAYMENTS_COLLECTION)
          .where('status', '==', 'pending')
          .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
          .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(endOfDay));

        if (template.groupId) {
          query = query.where('groupId', '==', template.groupId);
        }

        const payments = await query.get();

        for (const paymentDoc of payments.docs) {
          const payment = { id: paymentDoc.id, ...paymentDoc.data() } as ScheduledPaymentData;

          // Check if reminder already sent today
          if (payment.lastReminderAt) {
            const lastReminder = payment.lastReminderAt.toDate();
            if (lastReminder.toDateString() === now.toDateString()) {
              skipped++;
              continue;
            }
          }

          // Build message
          const message = processTemplate(template.messageTemplate, {
            memberName: payment.memberName,
            groupName: payment.groupName,
            amount: payment.amount.toLocaleString(),
            dueDate: payment.dueDate.toDate().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
          });

          // Send via configured channels
          for (const channel of template.channels) {
            try {
              let result: { success: boolean; messageId?: string; error?: string };

              switch (channel) {
                case 'sms':
                  result = await sendSMS(payment.memberPhone, message);
                  break;
                case 'whatsapp':
                  result = await sendWhatsApp(payment.memberPhone, message);
                  break;
                case 'push':
                  result = await sendPushNotification(payment.memberId, 'Payment Reminder', message);
                  break;
                default:
                  result = { success: false, error: 'Unknown channel' };
              }

              await logNotification(db, {
                type: 'reminder',
                channel: channel as NotificationChannel,
                recipientId: payment.memberId,
                recipientPhone: payment.memberPhone,
                templateId: template.id,
                message,
                status: result.success ? 'sent' : 'failed',
                providerMessageId: result.messageId,
                errorMessage: result.error,
                scheduledPaymentId: payment.id,
                groupId: payment.groupId,
              });

              if (result.success) {
                sent++;
              } else {
                failed++;
              }
            } catch (channelError) {
              console.error(`[sendReminders] Error sending ${channel} to ${payment.memberPhone}:`, channelError);
              failed++;
            }
          }

          // Update payment reminder count
          await db.collection(SCHEDULED_PAYMENTS_COLLECTION).doc(payment.id).update({
            remindersSent: admin.firestore.FieldValue.increment(1),
            lastReminderAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Process overdue reminders
      for (const template of overdueTemplates) {
        let query = db
          .collection(SCHEDULED_PAYMENTS_COLLECTION)
          .where('status', '==', 'overdue');

        if (template.groupId) {
          query = query.where('groupId', '==', template.groupId);
        }

        const overduePayments = await query.get();

        for (const paymentDoc of overduePayments.docs) {
          const payment = { id: paymentDoc.id, ...paymentDoc.data() } as ScheduledPaymentData;

          // Check reminder frequency
          if (payment.lastReminderAt) {
            const lastReminder = payment.lastReminderAt.toDate();
            const hoursSinceLastReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60);

            // Don't send more than once per 24 hours for overdue
            if (hoursSinceLastReminder < 24) {
              skipped++;
              continue;
            }
          }

          const daysOverdue = Math.floor(
            (now.getTime() - payment.dueDate.toDate().getTime()) / (1000 * 60 * 60 * 24)
          );

          const message = processTemplate(template.messageTemplate, {
            memberName: payment.memberName,
            groupName: payment.groupName,
            amount: payment.amount.toLocaleString(),
            daysOverdue: daysOverdue.toString(),
          });

          // Send via configured channels
          for (const channel of template.channels) {
            try {
              let result: { success: boolean; messageId?: string; error?: string };

              switch (channel) {
                case 'sms':
                  result = await sendSMS(payment.memberPhone, message);
                  break;
                case 'whatsapp':
                  result = await sendWhatsApp(payment.memberPhone, message);
                  break;
                case 'push':
                  result = await sendPushNotification(payment.memberId, 'Overdue Payment', message);
                  break;
                default:
                  result = { success: false, error: 'Unknown channel' };
              }

              await logNotification(db, {
                type: 'reminder',
                channel: channel as NotificationChannel,
                recipientId: payment.memberId,
                recipientPhone: payment.memberPhone,
                templateId: template.id,
                message,
                status: result.success ? 'sent' : 'failed',
                providerMessageId: result.messageId,
                errorMessage: result.error,
                scheduledPaymentId: payment.id,
                groupId: payment.groupId,
              });

              if (result.success) {
                sent++;
              } else {
                failed++;
              }
            } catch (channelError) {
              failed++;
            }
          }

          // Update reminder count
          await db.collection(SCHEDULED_PAYMENTS_COLLECTION).doc(payment.id).update({
            remindersSent: admin.firestore.FieldValue.increment(1),
            lastReminderAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await logSchedulerAction(
        'reminder_sent',
        NOTIFICATION_LOGS_COLLECTION,
        'batch',
        { sent, failed, skipped },
        failed === 0
      );

      console.log(`[sendReminders] Completed: sent=${sent}, failed=${failed}, skipped=${skipped}`);

      return { sent, failed, skipped };
    } catch (error) {
      console.error('[sendReminders] Fatal error:', error);

      await logSchedulerAction(
        'reminder_failed',
        NOTIFICATION_LOGS_COLLECTION,
        'batch',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  });
