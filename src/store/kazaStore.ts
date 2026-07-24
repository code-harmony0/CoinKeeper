import { create } from 'zustand';
import { getDb } from './database';

export interface KazaPrayer {
  name: string;
  arabic: string;
  completed: number;
  pending: number;
}

interface KazaState {
  prayers: KazaPrayer[];
  weeklyMadeUp: number;
  loading: boolean;
  loadKaza: () => Promise<void>;
  missedPrayer: (name: string) => Promise<void>;
  makeUpPrayer: (name: string) => Promise<void>;
  undoMakeUp: (name: string) => Promise<void>;
  setInitialPending: (years: number) => Promise<void>;
}

const computeWeeklyMadeUp = async (): Promise<number> => {
  const db = getDb();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const result = await db.execute(
    `SELECT COUNT(*) as count FROM kaza_log WHERE action = ? AND date >= ?;`,
    ['made_up', sevenDaysAgo],
  );
  const row = result.rows?.[0] as { count?: number } | undefined;
  return row?.count ?? 0;
};

export const useKazaStore = create<KazaState>((set, get) => ({
  prayers: [],
  weeklyMadeUp: 0,
  loading: true,

  loadKaza: async () => {
    try {
      set({ loading: true });
      const db = getDb();
      const result = await db.execute(
        'SELECT * FROM kaza_prayers ORDER BY rowid ASC;',
      );
      const rows = (result.rows ?? []) as unknown as KazaPrayer[];
      const weeklyMadeUp = await computeWeeklyMadeUp();
      set({ prayers: rows, weeklyMadeUp, loading: false });
    } catch (error) {
      console.error('[kazaStore] loadKaza error:', error);
      set({ loading: false });
    }
  },

  missedPrayer: async name => {
    try {
      const db = getDb();
      const current = get().prayers.find(p => p.name === name);
      if (!current) return;

      const date = new Date().toISOString();
      const pending = current.pending + 1;

      await db.execute(
        'UPDATE kaza_prayers SET pending = ? WHERE name = ?;',
        [pending, name],
      );
      await db.execute(
        'INSERT INTO kaza_log (prayer, action, date) VALUES (?, ?, ?);',
        [name, 'missed', date],
      );

      set(state => ({
        prayers: state.prayers.map(p =>
          p.name === name ? { ...p, pending } : p,
        ),
      }));
    } catch (error) {
      console.error('[kazaStore] missedPrayer error:', error);
    }
  },

  makeUpPrayer: async name => {
    try {
      const current = get().prayers.find(p => p.name === name);
      if (!current || current.pending <= 0) return;

      const db = getDb();
      const date = new Date().toISOString();
      const pending = current.pending - 1;
      const completed = current.completed + 1;

      await db.execute(
        'UPDATE kaza_prayers SET pending = ?, completed = ? WHERE name = ?;',
        [pending, completed, name],
      );
      await db.execute(
        'INSERT INTO kaza_log (prayer, action, date) VALUES (?, ?, ?);',
        [name, 'made_up', date],
      );

      set(state => ({
        prayers: state.prayers.map(p =>
          p.name === name ? { ...p, pending, completed } : p,
        ),
      }));

      const weeklyMadeUp = await computeWeeklyMadeUp();
      set({ weeklyMadeUp });
    } catch (error) {
      console.error('[kazaStore] makeUpPrayer error:', error);
    }
  },

  undoMakeUp: async name => {
    try {
      const current = get().prayers.find(p => p.name === name);
      if (!current || current.completed <= 0) return;

      const db = getDb();
      const date = new Date().toISOString();
      const completed = current.completed - 1;
      const pending = current.pending + 1;

      await db.execute(
        'UPDATE kaza_prayers SET completed = ?, pending = ? WHERE name = ?;',
        [completed, pending, name],
      );
      await db.execute(
        'INSERT INTO kaza_log (prayer, action, date) VALUES (?, ?, ?);',
        [name, 'undo', date],
      );

      set(state => ({
        prayers: state.prayers.map(p =>
          p.name === name ? { ...p, completed, pending } : p,
        ),
      }));
    } catch (error) {
      console.error('[kazaStore] undoMakeUp error:', error);
    }
  },

  setInitialPending: async years => {
    try {
      const db = getDb();
      const pending = Math.round(years * 365);
      const prayers = get().prayers;

      for (const prayer of prayers) {
        await db.execute(
          'UPDATE kaza_prayers SET pending = ? WHERE name = ?;',
          [pending, prayer.name],
        );
      }

      set(state => ({
        prayers: state.prayers.map(p => ({ ...p, pending })),
      }));
    } catch (error) {
      console.error('[kazaStore] setInitialPending error:', error);
    }
  },
}));
