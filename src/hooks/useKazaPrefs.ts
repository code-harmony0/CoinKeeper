import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { getPreference, setPreference } from '../store/database';
import {
  areNotificationsEnabled,
  syncKazaReminders,
} from '../services/notificationService';

export const DEFAULT_GOAL = 5;
const MAX_GOAL = 200;

const clampGoal = (n: number) => Math.min(MAX_GOAL, Math.max(1, n));

/**
 * Everything Kaza remembers between sessions: daily goal, Witr, the reminder,
 * and which milestones were already celebrated. Writes happen in handlers,
 * never inside a state updater, so they run exactly once per change.
 */
export const useKazaPrefs = () => {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:30');
  const [includeWitr, setIncludeWitr] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_GOAL);
  const [hydrated, setHydrated] = useState(false);
  // Prayers already celebrated; null until the first run seeds it silently.
  const seenMilestones = useRef<Set<string> | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const enabled = await getPreference('kazaReminderEnabled');
        if (enabled !== null) setReminderEnabled(enabled === 'on');
        const time = await getPreference('kazaReminderTime');
        if (time !== null) setReminderTime(time);
        setIncludeWitr((await getPreference('kazaIncludeWitr')) === 'on');
        const goal = parseInt((await getPreference('kazaDailyGoal')) ?? '', 10);
        if (goal > 0) setDailyGoal(clampGoal(goal));
        const seen = await getPreference('kazaMilestonesSeen');
        try {
          seenMilestones.current = seen ? new Set(JSON.parse(seen)) : null;
        } catch {
          seenMilestones.current = null;
        }
      } catch (error) {
        console.error('[useKazaPrefs] Error loading preferences:', error);
      } finally {
        // A failed read must not leave milestones dead for the whole session.
        setHydrated(true);
      }
    };
    hydrate();
  }, []);

  const setGoal = useCallback((value: number) => {
    const next = clampGoal(value);
    setDailyGoal(next);
    setPreference('kazaDailyGoal', String(next)).catch(() => {});
  }, []);

  const changeGoal = useCallback(
    (delta: number) => {
      ReactNativeHapticFeedback.trigger('impactLight');
      setGoal(dailyGoal + delta);
    },
    [dailyGoal, setGoal],
  );

  const toggleWitr = useCallback((value: boolean) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setIncludeWitr(value);
    setPreference('kazaIncludeWitr', value ? 'on' : 'off').catch(() => {});
  }, []);

  const toggleReminder = useCallback(async (value: boolean) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setReminderEnabled(value);
    try {
      await setPreference('kazaReminderEnabled', value ? 'on' : 'off');
      await syncKazaReminders();
      if (value && !(await areNotificationsEnabled())) {
        Alert.alert(
          'Reminder not set',
          'Turn on notifications in Settings to get a daily Kaza reminder.',
        );
      }
    } catch (error) {
      console.error('[useKazaPrefs] Error saving reminder preference:', error);
    }
  }, []);

  const saveReminderTime = useCallback(async (time: string) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setReminderTime(time);
    try {
      await setPreference('kazaReminderTime', time);
      await syncKazaReminders();
    } catch (error) {
      console.error('[useKazaPrefs] Error saving reminder time:', error);
    }
  }, []);

  return {
    hydrated,
    seenMilestones,
    dailyGoal,
    setGoal,
    changeGoal,
    includeWitr,
    toggleWitr,
    reminderEnabled,
    toggleReminder,
    reminderTime,
    saveReminderTime,
  };
};
