import { useEffect } from 'react';
import { useKazaStore } from '../store/kazaStore';
import { syncKazaReminders } from '../services/notificationService';

// Keeps the Kaza notifications armed whenever the app opens or Kaza state
// changes, whether or not the Kaza tab is ever visited.
export const useKazaReminders = () => {
  const streakCurrent = useKazaStore(s => s.streak.current);
  const loggedToday = useKazaStore(s => s.streak.loggedToday);
  const restDays = useKazaStore(s => s.restDays);
  const loading = useKazaStore(s => s.loading);
  const hasPending = useKazaStore(s => s.prayers.some(p => p.pending > 0));

  useEffect(() => {
    useKazaStore.getState().loadKaza();
  }, []);

  useEffect(() => {
    if (loading) return;
    syncKazaReminders().catch(() => {});
  }, [streakCurrent, loggedToday, restDays, loading, hasPending]);
};
