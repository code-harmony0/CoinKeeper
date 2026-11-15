import {
  averageRakat, chapterProgress, dailyEffort, formatDuration, nextMilestone, projectedFinish, targetPlans, totalRakat, groupActivity, paceChoices, paceOptions, pickReflection, REFLECTIONS, weekStats,
} from '../../src/services/kazaInsights';
import { dayKey } from '../../src/services/kazaStreak';

const NOW = new Date(2026, 9, 14, 12);
const at = (day: number, hour = 9) => new Date(2026, 9, day, hour).toISOString();

describe('chapterProgress', () => {
  it('splits 18,250 prayers into 10 one-year chapters and shows progress inside the first', () => {
    // 3650 days; 60 prayers made up = 12 days
    expect(chapterProgress(60, 18250, 5)).toEqual({
      chapters: 10, current: 1, daysDone: 12, totalDays: 3650, chapterDone: 12, chapterSize: 365,
    });
  });

  it('moves to the next chapter after 365 days', () => {
    const p = chapterProgress(365 * 5 + 25, 18250, 5);
    expect(p).toMatchObject({ current: 2, chapterDone: 5, chapterSize: 365 });
  });

  it('sizes a short final chapter correctly', () => {
    const p = chapterProgress(0, 5 * 400, 5);
    expect(p.chapters).toBe(2);
    const last = chapterProgress(5 * 380, 5 * 400, 5);
    expect(last).toMatchObject({ current: 2, chapterSize: 35, chapterDone: 15 });
  });

  it('copes with nothing owed', () => {
    expect(chapterProgress(0, 0, 5)).toMatchObject({ chapters: 1, totalDays: 0 });
  });
});

describe('weekStats', () => {
  it('sums the last 7 days and finds the best day', () => {
    const counts = { [dayKey(new Date(2026, 9, 14))]: 5, [dayKey(new Date(2026, 9, 12))]: 3, [dayKey(new Date(2026, 8, 1))]: 12 };
    expect(weekStats(counts, NOW)).toEqual({ week: 8, averagePerDay: 1.1, bestDay: 12 });
  });
  it('is zero with no history', () => {
    expect(weekStats({}, NOW)).toEqual({ week: 0, averagePerDay: 0, bestDay: 0 });
  });
});

describe('rakat and effort', () => {
  it('totals rakat across what is left, using each prayer’s own rakat', () => {
    expect(totalRakat([{ name: 'Fajr', pending: 10 }, { name: 'Maghrib', pending: 10 }, { name: 'Isha', pending: 10 }])).toBe(90);
  });
  it('is 17 rakat for a day of five prayers and 20 with Witr', () => {
    expect(averageRakat(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) * 5).toBe(17);
    expect(averageRakat(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Witr']) * 6).toBe(20);
  });
  it('turns a pace into daily rakat and a rough time', () => {
    expect(dailyEffort(5, 3.4)).toEqual({ rakat: 17, minutes: 26 });
  });
});

describe('targetPlans', () => {
  it('says how many a day finish the backlog by each target', () => {
    const plans = targetPlans(18250, NOW);
    expect(plans.map(p => p.label)).toEqual(['In 1 year', 'In 3 years', 'In 5 years', 'In 10 years']);
    expect(plans[0].perDay).toBe(50); // 18250 / 366 days
    expect(plans[3].perDay).toBe(5);
  });
});

describe('projectedFinish', () => {
  it('projects from the recent average', () => {
    expect(projectedFinish(100, 4, NOW)).toEqual(new Date(2026, 9, 14 + 25));
  });
  it('is null with no pace or nothing left', () => {
    expect(projectedFinish(100, 0, NOW)).toBeNull();
    expect(projectedFinish(0, 4, NOW)).toBeNull();
  });
});

describe('nextMilestone', () => {
  it.each([[0, 10, 10], [46, 50, 4], [100, 250, 150], [5000, 6000, 1000], [6400, 7000, 600]])(
    'from %s: target %s, %s to go', (done, target, remaining) =>
      expect(nextMilestone(done)).toEqual({ target, remaining }));
});

describe('formatDuration', () => {
  it.each([[1, '1 day'], [45, '45 days'], [90, '3 months'], [3650, '10.0 years']])('%s days -> %s', (d, text) =>
    expect(formatDuration(d)).toBe(text));
});

describe('paceOptions', () => {
  it('projects a finish date for each pace', () => {
    const [a, b] = paceOptions(100, [5, 10], NOW);
    expect(a.finishOn).toEqual(new Date(2026, 9, 34)); // 20 days out
    expect(b.finishOn).toEqual(new Date(2026, 9, 24)); // 10 days out
  });
  it('has no date when nothing is left', () => {
    expect(paceOptions(0, [5], NOW)[0].finishOn).toBeNull();
  });
  it('offers a gentle start, one after each prayer, and steps up', () => {
    expect(paceChoices(5)).toEqual([1, 5, 10, 15, 25]);
  });
});

describe('groupActivity', () => {
  it('groups logs by local day, newest first, in prayer order', () => {
    const days = groupActivity([
      { prayer: 'Isha', date: at(14) }, { prayer: 'Fajr', date: at(14) }, { prayer: 'Fajr', date: at(14, 10) },
      { prayer: 'Asr', date: at(13) },
    ]);
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ total: 3, prayers: [{ name: 'Fajr', count: 2 }, { name: 'Isha', count: 1 }] });
    expect(days[1].total).toBe(1);
  });
});

describe('pickReflection', () => {
  const base = { streakBroken: false, streakAtRisk: false, pending: 500, hasStarted: true };
  it('answers a broken streak with small-and-steady, not a repentance verse', () => {
    expect(pickReflection({ ...base, streakBroken: true }, NOW).id).toBe('consistent');
  });
  it('offers mercy to someone just beginning', () => {
    expect(pickReflection({ ...base, hasStarted: false }, NOW).id).toBe('mercy');
  });
  it('eases a heavy backlog', () => {
    expect(pickReflection({ ...base, pending: 18000 }, NOW).id).toBe('capacity');
  });
  it('nudges an at-risk streak with small-and-steady', () => {
    expect(pickReflection({ ...base, streakAtRisk: true }, NOW).id).toBe('consistent');
  });
  it('rotates through every reflection otherwise', () => {
    const ids = new Set(
      [0, 1, 2, 3, 4].map(i => pickReflection(base, new Date(2026, 9, 14 + i)).id),
    );
    expect(ids.size).toBe(REFLECTIONS.length);
  });
});
