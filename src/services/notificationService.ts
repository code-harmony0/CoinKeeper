import notifee, { AlarmType, AndroidImportance, TriggerType, TimestampTrigger } from '@notifee/react-native';
import { Bill } from '../store/billStore';

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

export const cancelBillReminder = async (notificationId: string) => {
  const ids = notificationId.split(',');
  for (const id of ids) {
    if (id) await notifee.cancelNotification(id);
  }
};

export const scheduleBillReminder = async (bill: Bill): Promise<string | null> => {
  try {
    const now = new Date();
    // Schedule for 3 days before the due day at 10 AM.
    // If due day is e.g. 15th, alarm is on 12th.
    // If due day is 2nd, alarm is on 29th/30th of previous month.
    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();
    let targetDay = bill.dueDay - 3;
    
    if (targetDay <= 0) {
      targetMonth -= 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
      const daysInPrevMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      targetDay = daysInPrevMonth + targetDay;
    }

    const triggerDate = new Date(targetYear, targetMonth, targetDay, 10, 0, 0);

    // If this date has already passed this month, schedule for next month
    if (triggerDate.getTime() < now.getTime()) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
      targetDay = bill.dueDay - 3;
      if (targetDay <= 0) {
        targetMonth -= 1;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear -= 1;
        }
        const daysInPrevMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        targetDay = daysInPrevMonth + targetDay;
      }
      triggerDate.setFullYear(targetYear);
      triggerDate.setMonth(targetMonth);
      triggerDate.setDate(targetDay);
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
      trigger
    );

    // Schedule day-of reminder
    // The day-of reminder is scheduled for 9 AM on the exact due day.
    let dayOfMonth = now.getMonth();
    let yearOf = now.getFullYear();
    let dayOfDate = bill.dueDay;
    
    // Check if the due day exists in the current month (e.g. Feb 30 -> Feb 28)
    let daysInMonth = new Date(yearOf, dayOfMonth + 1, 0).getDate();
    if (dayOfDate > daysInMonth) {
      dayOfDate = daysInMonth;
    }
    
    let dayOfTriggerDate = new Date(yearOf, dayOfMonth, dayOfDate, 9, 0, 0); // 9 AM
    
    // If the due day this month has already passed, schedule for next month
    if (dayOfTriggerDate.getTime() < now.getTime()) {
      dayOfMonth += 1;
      if (dayOfMonth > 11) {
        dayOfMonth = 0;
        yearOf += 1;
      }
      dayOfDate = bill.dueDay;
      daysInMonth = new Date(yearOf, dayOfMonth + 1, 0).getDate();
      if (dayOfDate > daysInMonth) {
        dayOfDate = daysInMonth;
      }
      dayOfTriggerDate = new Date(yearOf, dayOfMonth, dayOfDate, 9, 0, 0);
    }
    
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
        dayOfTrigger
      );
    }

    return dayOfNotificationId ? `${notificationId},${dayOfNotificationId}` : notificationId;
  } catch (error) {
    console.error('[notificationService] Failed to schedule bill reminder', error);
    return null;
  }
};
