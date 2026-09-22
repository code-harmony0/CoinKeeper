import notifee, {
  AlarmType,
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import { Bill, useBillStore } from '../store/billStore';
import { getPreference } from '../store/database';
import { nextDueDate } from './billSchedule';

export const CHANNELS = {
  BILLS: 'bills_reminders',
  BUDGET: 'budget_alerts',
  INSIGHTS: 'insights',
};

export const initializeNotifications = async () => {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: CHANNELS.BILLS,
    name: 'Bill Reminders',
    importance: AndroidImportance.DEFAULT,
  });

  await notifee.createChannel({
    id: CHANNELS.BUDGET,
    name: 'Budget Alerts',
    importance: AndroidImportance.HIGH,
  });

  await notifee.createChannel({
    id: CHANNELS.INSIGHTS,
    name: 'Insights & Tips',
    importance: AndroidImportance.LOW,
  });
};

// Master notifications gate — the Settings screen toggle is the only writer
// of the 'notifications' preference; everything that schedules reads it here.
export const areNotificationsEnabled = async (): Promise<boolean> => {
  const value = await getPreference('notifications');
  return value !== 'off';
};

export const cancelBillReminder = async (notificationId: string) => {
  const ids = notificationId.split(',');
  for (const id of ids) {
    if (id) await notifee.cancelNotification(id);
  }
};

export const scheduleBillReminder = async (
  bill: Bill,
): Promise<string | null> => {
  try {
    if (!(await areNotificationsEnabled())) {
      return null;
    }
    const now = new Date();
    // Not every bill is monthly — a half-yearly or yearly one only falls due
    // in specific months, which `bill.lastPaidAt` (or, for a bill with no
    // history yet, today) anchors. Absent intervalMonths means monthly,
    // unchanged from before this field existed.
    const intervalMonths = bill.intervalMonths ?? 1;
    const anchor = bill.lastPaidAt ? new Date(bill.lastPaidAt) : now;

    let dueDate = nextDueDate(bill.dueDay, now, intervalMonths, anchor);
    let triggerDate = new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    triggerDate.setHours(10, 0, 0, 0);

    // The 3-day-before reminder itself must still be in the future — a due
    // date 1 or 2 days out would otherwise get a reminder for a moment that
    // already passed. The day after `dueDate` as `now` forces the search past
    // `dueDate` itself, to the cycle after.
    if (triggerDate.getTime() < now.getTime()) {
      const dayAfterDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + 1);
      dueDate = nextDueDate(bill.dueDay, dayAfterDue, intervalMonths, dueDate);
      triggerDate = new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      triggerDate.setHours(10, 0, 0, 0);
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE, // Requests SCHEDULE_EXACT_ALARM on API 31+
      },
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        title: 'Upcoming Bill',
        body: `Your bill "${bill.name}" is due in 3 days.`,
        android: {
          channelId: CHANNELS.BILLS,
        },
      },
      trigger,
    );

    // Schedule day-of reminder, at 9 AM on the same due date the 3-day
    // reminder above already settled on — so the two never disagree about
    // which cycle's payment they are for.
    const dayOfTriggerDate = new Date(dueDate);
    dayOfTriggerDate.setHours(9, 0, 0, 0);

    // Only schedule if it's in the future
    let dayOfNotificationId = '';
    if (dayOfTriggerDate.getTime() > now.getTime()) {
      const dayOfTrigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: dayOfTriggerDate.getTime(),
        alarmManager: {
          allowWhileIdle: true,
          type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        },
      };

      dayOfNotificationId = await notifee.createTriggerNotification(
        {
          title: 'Bill Due Today',
          body: `Your bill "${bill.name}" is due today.`,
          android: {
            channelId: CHANNELS.BILLS,
          },
        },
        dayOfTrigger,
      );
    }

    return dayOfNotificationId
      ? `${notificationId},${dayOfNotificationId}`
      : notificationId;
  } catch (error) {
    console.error(
      '[notificationService] Failed to schedule bill reminder',
      error,
    );
    return null;
  }
};

// Turning the master toggle off cancels everything scheduled.
export const cancelAllReminders = async (): Promise<void> => {
  try {
    await notifee.cancelAllNotifications();
  } catch (error) {
    console.error(
      '[notificationService] Failed to cancel all reminders',
      error,
    );
  }
};

// Turning the master toggle on re-schedules reminders for active bills
// (skipping ones already paid this month).
export const rescheduleBillReminders = async (): Promise<void> => {
  try {
    const { bills } = useBillStore.getState();
    const now = new Date();
    for (const bill of bills) {
      if (bill.lastPaidAt) {
        const paid = new Date(bill.lastPaidAt);
        if (
          paid.getMonth() === now.getMonth() &&
          paid.getFullYear() === now.getFullYear()
        ) {
          continue;
        }
      }
      const id = await scheduleBillReminder(bill);
      if (id) {
        await useBillStore.getState().updateNotificationId(bill.id, id);
      }
    }
  } catch (error) {
    console.error(
      '[notificationService] Failed to reschedule bill reminders',
      error,
    );
  }
};
