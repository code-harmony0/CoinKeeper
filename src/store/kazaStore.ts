import { create } from 'zustand';
import { getDb } from './database';
import { computeStreaks, dayKey, StreakInfo } from '../services/kazaStreak';

export interface KazaPrayer {
  name: string;
  arabic: string;
  completed: number;
  pending: number;
}

export interface MakeUpEntry {
  name: string;
  count: number;
}

interface KazaState {
  prayers: KazaPrayer[];
  weeklyMadeUp: number;
  madeUpToday: number;
  totalMadeUp: number;
  /** Prayers made up per local day ("YYYY-MM-DD"). */
  dailyCounts: Record<string, number>;
  restDays: string[];
  streak: StreakInfo;
  /** Made-up logs from the last 14 days, newest first — feeds the journey timeline. */
  recent: { prayer: string; date: string }[];
  /** The prayer most recently made up, to suggest the next one in order. */
  lastLogged: string | null;
  loading: boolean;
  loadKaza: () => Promise<void>;
  missedPrayer: (name: string) => Promise<void>;
  makeUpPrayer: (name: string) => Promise<void>;
  /** Logs several prayers at once; `daysAgo` 1 backdates to yesterday. */
  logMakeUp: (entries: MakeUpEntry[], daysAgo?: number) => Promise<void>;
  undoMakeUp: (name: string) => Promise<void>;
  setEstimate: (days: number, names: string[]) => Promise<void>;
  /** Corrects what is left for one prayer when the estimate was off. */
  setPending: (name: string, pending: number) => Promise<void>;
  /** Pauses the streak for `days` days starting today. */
  takeRestDays: (days: number) => Promise<void>;
  endRest: () => Promise<void>;
}

const EMPTY_STREAK: StreakInfo = {
  current: 0,
  longest: 0,
  loggedToday: false,
  atRisk: false,
  graceUsedYesterday: false,
  broken: false,
};

// Every write re-reads get() only when its turn comes, so rapid taps can't act on stale state.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

const timestampFor = (daysAgo: number): string => {
  if (daysAgo <= 0) return new Date().toISOString();
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    12,
  ).toISOString();
};

const computeStats = async () => {
  const db = getDb();
  const logs = await db.execute(
    `SELECT prayer, date FROM kaza_log WHERE action = 'made_up' ORDER BY id DESC;`,
  );
  const rest = await db.execute(
    'SELECT date FROM kaza_rest_days ORDER BY date ASC;',
  );
  const rows = (logs.rows ?? []) as unknown as {
    prayer: string;
    date: string;
  }[];
  const restDays = ((rest.rows ?? []) as unknown as { date: string }[]).map(
    r => r.date,
  );

  const dailyCounts: Record<string, number> = {};
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let weeklyMadeUp = 0;
  for (const row of rows) {
    const when = new Date(row.date);
    const key = dayKey(when);
    dailyCounts[key] = (dailyCounts[key] ?? 0) + 1;
    if (when.getTime() >= sevenDaysAgo) weeklyMadeUp += 1;
  }

  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return {
    recent: rows.filter(r => new Date(r.date).getTime() >= twoWeeksAgo),
    dailyCounts,
    restDays,
    weeklyMadeUp,
    madeUpToday: dailyCounts[dayKey(new Date())] ?? 0,
    totalMadeUp: rows.length,
    lastLogged: rows[0]?.prayer ?? null,
    streak: computeStreaks(
      rows.map(r => r.date),
      restDays,
    ),
  };
};

export const useKazaStore = create<KazaState>((set, get) => ({
  prayers: [],
  weeklyMadeUp: 0,
  madeUpToday: 0,
  totalMadeUp: 0,
  dailyCounts: {},
  restDays: [],
  streak: EMPTY_STREAK,
  recent: [],
  lastLogged: null,
  loading: true,

  loadKaza: async () => {
    try {
      set({ loading: true });
      const db = getDb();
      // An old backup restore can drop the Witr row added by migration 021.
      await db.execute(
        "INSERT OR IGNORE INTO kaza_prayers (name, arabic, completed, pending) VALUES ('Witr', 'الوتر', 0, 0);",
      );
      const result = await db.execute(
        'SELECT * FROM kaza_prayers ORDER BY rowid ASC;',
      );
      const prayers = (result.rows ?? []) as unknown as KazaPrayer[];
      set({ prayers, ...(await computeStats()), loading: false });
    } catch (error) {
      console.error('[kazaStore] loadKaza error:', error);
      set({ loading: false });
    }
  },

  missedPrayer: async name => {
    return serial(async () => {
      try {
        const db = getDb();
        const current = get().prayers.find(p => p.name === name);
        if (!current) return;

        const pending = current.pending + 1;
        await db.execute(
          'UPDATE kaza_prayers SET pending = ? WHERE name = ?;',
          [pending, name],
        );
        await db.execute(
          'INSERT INTO kaza_log (prayer, action, date) VALUES (?, ?, ?);',
          [name, 'missed', new Date().toISOString()],
        );
        set(state => ({
          prayers: state.prayers.map(p =>
            p.name === name ? { ...p, pending } : p,
          ),
        }));
      } catch (error) {
        console.error('[kazaStore] missedPrayer error:', error);
      }
    });
  },

  logMakeUp: async (entries, daysAgo = 0) => {
    return serial(async () => {
      try {
        const db = getDb();
        const date = timestampFor(daysAgo);
        const updates: {
          name: string;
          pending: number;
          completed: number;
          count: number;
        }[] = [];

        for (const { name, count } of entries) {
          const current = get().prayers.find(p => p.name === name);
          const applied = current ? Math.min(count, current.pending) : 0;
          if (!current || applied <= 0) continue;
          updates.push({
            name,
            count: applied,
            pending: current.pending - applied,
            completed: current.completed + applied,
          });
        }
        if (updates.length === 0) return;

        await db.transaction(async tx => {
          for (const u of updates) {
            await tx.execute(
              'UPDATE kaza_prayers SET pending = ?, completed = ? WHERE name = ?;',
              [u.pending, u.completed, u.name],
            );
            for (let i = 0; i < u.count; i += 1) {
              await tx.execute(
                'INSERT INTO kaza_log (prayer, action, date) VALUES (?, ?, ?);',
                [u.name, 'made_up', date],
              );
            }
          }
        });

        set(state => ({
          prayers: state.prayers.map(p => {
            const u = updates.find(x => x.name === p.name);
            return u ? { ...p, pending: u.pending, completed: u.completed } : p;
          }),
        }));
        set(await computeStats());
      } catch (error) {
        console.error('[kazaStore] logMakeUp error:', error);
      }
    });
  },

  makeUpPrayer: async name => get().logMakeUp([{ name, count: 1 }]),

  undoMakeUp: async name => {
    return serial(async () => {
      try {
        const current = get().prayers.find(p => p.name === name);
        if (!current || current.completed <= 0) return;

        const completed = current.completed - 1;
        const pending = current.pending + 1;

        // Drop the latest made_up entry (by date) rather than adding an 'undo' row, so
        // today's count and the streak reflect what really stands.
        await getDb().transaction(async tx => {
          await tx.execute(
            'UPDATE kaza_prayers SET completed = ?, pending = ? WHERE name = ?;',
            [completed, pending, name],
          );
          await tx.execute(
            `DELETE FROM kaza_log WHERE id = (
               SELECT id FROM kaza_log WHERE prayer = ? AND action = 'made_up' ORDER BY date DESC, id DESC LIMIT 1
             );`,
            [name],
          );
        });

        set(state => ({
          prayers: state.prayers.map(p =>
            p.name === name ? { ...p, completed, pending } : p,
          ),
        }));
        set(await computeStats());
      } catch (error) {
        console.error('[kazaStore] undoMakeUp error:', error);
      }
    });
  },

  // Pending becomes the estimate minus what is already made up, so
  // re-running the calculator never erases logged progress.
  setEstimate: async (days, names) => {
    return serial(async () => {
      try {
        const db = getDb();
        const updated = new Map<string, number>();
        for (const prayer of get().prayers) {
          if (!names.includes(prayer.name)) continue;
          const pending = Math.max(0, days - prayer.completed);
          await db.execute(
            'UPDATE kaza_prayers SET pending = ? WHERE name = ?;',
            [pending, prayer.name],
          );
          updated.set(prayer.name, pending);
        }
        set(state => ({
          prayers: state.prayers.map(p =>
            updated.has(p.name) ? { ...p, pending: updated.get(p.name)! } : p,
          ),
        }));
      } catch (error) {
        console.error('[kazaStore] setEstimate error:', error);
      }
    });
  },

  setPending: async (name, pending) => {
    return serial(async () => {
      try {
        const value = Math.max(0, Math.round(pending));
        await getDb().execute(
          'UPDATE kaza_prayers SET pending = ? WHERE name = ?;',
          [value, name],
        );
        set(state => ({
          prayers: state.prayers.map(p =>
            p.name === name ? { ...p, pending: value } : p,
          ),
        }));
      } catch (error) {
        console.error('[kazaStore] setPending error:', error);
      }
    });
  },

  takeRestDays: async days => {
    return serial(async () => {
      try {
        const db = getDb();
        const now = new Date();
        for (let i = 0; i < days; i += 1) {
          const key = dayKey(
            new Date(now.getFullYear(), now.getMonth(), now.getDate() + i),
          );
          await db.execute(
            'INSERT OR IGNORE INTO kaza_rest_days (date) VALUES (?);',
            [key],
          );
        }
        set(await computeStats());
      } catch (error) {
        console.error('[kazaStore] takeRestDays error:', error);
      }
    });
  },

  // Ends a pause early: removes today and every future rest day.
  endRest: async () => {
    return serial(async () => {
      try {
        await getDb().execute('DELETE FROM kaza_rest_days WHERE date >= ?;', [
          dayKey(new Date()),
        ]);
        set(await computeStats());
      } catch (error) {
        console.error('[kazaStore] endRest error:', error);
      }
    });
  },
}));
