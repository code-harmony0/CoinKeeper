import notifee, {
  AlarmType,
  AndroidImportance,
  RepeatFrequency,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import { Bill, useBillStore } from '../store/billStore';
import { getPreference } from '../store/database';
import { nextDueDate } from './billSchedule';
import { dayKey, nextNudgeAt } from './kazaStreak';
import { useKazaStore } from '../store/kazaStore';

export const CHANNELS = {
  BILLS: 'bills_reminders',
  BUDGET: 'budget_alerts',
  INSIGHTS: 'insights',
  KAZA: 'kaza_reminders',
};

const KAZA_NOTIFICATION_ID = 'kaza-daily';
const KAZA_NUDGE_ID = 'kaza-streak-nudge';

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

  await notifee.createChannel({
    id: CHANNELS.KAZA,
    name: 'Kaza Reminders',
    importance: AndroidImportance.DEFAULT,
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
  await rescheduleKazaReminder();
};

export const cancelKazaReminder = async (): Promise<void> => {
  try {
    await notifee.cancelTriggerNotification(KAZA_NOTIFICATION_ID);
    await notifee.cancelTriggerNotification(KAZA_NUDGE_ID);
  } catch (error) {
    console.error('[notificationService] Failed to cancel kaza reminder', error);
  }
};

// One repeating daily notification at `time` ("HH:MM"); the fixed id means
// re-scheduling replaces the old one instead of stacking a second.
export const scheduleKazaReminder = async (time: string): Promise<boolean> => {
  try {
    if (!(await areNotificationsEnabled())) return false;
    const [hour, minute] = time.split(':').map(Number);
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: next.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
      },
    };
    await notifee.createTriggerNotification(
      {
        id: KAZA_NOTIFICATION_ID,
        title: 'Kaza reminder',
        body: 'A few minutes to make up a missed prayer today?',
        android: { channelId: CHANNELS.KAZA },
      },
      trigger,
    );
    return true;
  } catch (error) {
    console.error('[notificationService] Failed to schedule kaza reminder', error);
    return false;
  }
};

// Re-arm after the master toggle (which cancels everything) is switched back on.
export const rescheduleKazaReminder = async (): Promise<void> => {
  await syncKazaReminders();
};

const cancelKazaNudge = (): Promise<void> => notifee.cancelTriggerNotification(KAZA_NUDGE_ID);

const runSyncKazaReminders = async (): Promise<void> => {
  const enabled =
    (await getPreference('kazaReminderEnabled')) === 'on' && (await areNotificationsEnabled());
  if (!enabled) {
    await cancelKazaReminder();
    return;
  }

  const { streak, restDays, prayers } = useKazaStore.getState();
  const now = new Date();
  const resting = restDays.includes(dayKey(now));

  if (resting) {
    await notifee.cancelTriggerNotification(KAZA_NOTIFICATION_ID);
  } else {
    await scheduleKazaReminder((await getPreference('kazaReminderTime')) ?? '07:30');
  }

  await cancelKazaNudge();
  if (!prayers.some(p => p.pending > 0)) return;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextNudgeAt(streak.loggedToday, now, restDays).getTime(),
    alarmManager: {
      allowWhileIdle: true,
      type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    },
  };
  await notifee.createTriggerNotification(
    {
      id: KAZA_NUDGE_ID,
      title: streak.current > 0 ? `Your ${streak.current}-day Kaza streak` : 'Kaza',
      body:
        streak.current > 0
          ? 'One prayer made up today keeps it going.'
          : 'One prayer made up today is a step closer to done.',
      android: { channelId: CHANNELS.KAZA },
    },
    trigger,
  );
};

// Single source of truth for both Kaza notifications. Calls are chained so a
// toggle-off can never interleave with an in-flight re-arm.
let kazaSyncChain: Promise<void> = Promise.resolve();
export const syncKazaReminders = (): Promise<void> => {
  kazaSyncChain = kazaSyncChain.then(runSyncKazaReminders).catch(error => {
    console.error('[notificationService] Failed to sync kaza reminders', error);
  });
  return kazaSyncChain;
};
