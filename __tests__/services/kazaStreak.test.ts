import {
  buildHeatmap, buildMilestones, computeStreaks, dayKey, nextNudgeAt, nextPrayerInOrder,
} from '../../src/services/kazaStreak';

const NOW = new Date(2026, 9, 14, 12); // Wed 14 Oct 2026
const at = (day: number) => new Date(2026, 9, day, 9).toISOString();
const key = (day: number) => dayKey(new Date(2026, 9, day));

describe('computeStreaks', () => {
  it('counts consecutive days ending today', () => {
    const s = computeStreaks([at(14), at(13), at(12)], [], NOW);
    expect(s).toMatchObject({ current: 3, loggedToday: true, atRisk: false });
  });

  it('does not treat an empty today as a miss, but flags the streak at risk', () => {
    const s = computeStreaks([at(13), at(12)], [], NOW);
    expect(s).toMatchObject({ current: 2, loggedToday: false, atRisk: true });
  });

  it('bridges one missed day with the weekly grace', () => {
    // 10,11,12 logged, 13 missed, 14 today logged
    const s = computeStreaks([at(10), at(11), at(12), at(14)], [], NOW);
    expect(s.current).toBe(4);
  });

  it('flags grace used yesterday while today is still empty', () => {
    const s = computeStreaks([at(10), at(11), at(12)], [], NOW);
    expect(s).toMatchObject({ current: 3, graceUsedYesterday: true, atRisk: true });
  });

  it('breaks on a second miss inside the same 7 days', () => {
    // 14 logged, 13 + 12 missed -> second miss breaks
    const s = computeStreaks([at(14), at(11), at(10)], [], NOW);
    expect(s.current).toBe(1);
  });

  it('allows another grace once 7 days have passed since the last one', () => {
    // miss on 13 (bridged) and on 5 (8 days earlier) — both bridged
    const days = [14, 12, 11, 10, 9, 8, 7, 6, 4, 3].map(at);
    expect(computeStreaks(days, [], NOW).current).toBe(10);
  });

  it('ignores rest days: they neither count nor break', () => {
    const s = computeStreaks([at(14), at(10)], [key(13), key(12), key(11)], NOW);
    expect(s.current).toBe(2);
  });

  it('tracks the longest streak and the broken state', () => {
    const s = computeStreaks([at(1), at(2), at(3), at(4), at(5)], [], NOW);
    expect(s).toMatchObject({ current: 0, longest: 5, broken: true });
  });

  it('computes a 1500-day streak quickly', () => {
    const days = Array.from({ length: 1500 }, (_, i) => new Date(2026, 9, 14 - i, 9).toISOString());
    const t0 = Date.now();
    const s = computeStreaks(days, [], NOW);
    expect(Date.now() - t0).toBeLessThan(250);
    expect(s).toMatchObject({ current: 1500, longest: 1500 });
  });

  it('finds the longest run across grace gaps', () => {
    // 1-5, gap 6, 7-9, gap 10, 11: run ending 9 bridges the 6th = 8; run ending 11 = 4
    const s = computeStreaks([1, 2, 3, 4, 5, 7, 8, 9, 11].map(at), [], new Date(2026, 9, 20, 12));
    expect(s.longest).toBe(8);
    expect(computeStreaks([1, 2, 3, 4, 5, 7].map(at), [], new Date(2026, 9, 20, 12)).longest).toBe(6);
  });

  it('is zero with no history and not "broken"', () => {
    expect(computeStreaks([], [], NOW)).toMatchObject({ current: 0, longest: 0, broken: false });
  });
});

describe('buildHeatmap', () => {
  it('builds Monday-first weeks ending this week, with levels', () => {
    const map = buildHeatmap({ [key(14)]: 5, [key(13)]: 2 }, [key(12)], 5, 5, NOW);
    expect(map).toHaveLength(5);
    expect(map.every(w => w.length === 7)).toBe(true);
    const flat = map.flat();
    expect(flat.find(c => c.key === key(14))).toMatchObject({ level: 2, isToday: true });
    expect(flat.find(c => c.key === key(13))?.level).toBe(1);
    expect(flat.find(c => c.key === key(12))?.isRest).toBe(true);
    expect(flat.find(c => c.key === key(15))?.isFuture).toBe(true);
    expect(map[0][0].key).toBe(key(14 - 2 - 28)); // Monday 4 weeks before this week's Monday (12th)
  });
});

describe('buildMilestones', () => {
  const prayers = [
    { name: 'Fajr', completed: 4, pending: 0 },
    { name: 'Isha', completed: 1, pending: 9 },
  ];
  it('marks achieved milestones from streak, count and cleared prayers', () => {
    const list = buildMilestones({ longestStreak: 8, totalMadeUp: 60, prayers });
    const got = (id: string) => list.find(m => m.id === id)?.achieved;
    expect(got('streak-7')).toBe(true);
    expect(got('streak-14')).toBe(false);
    expect(got('count-50')).toBe(true);
    expect(got('count-100')).toBe(false);
    expect(got('clear-Fajr')).toBe(true);
    expect(got('clear-Isha')).toBe(false);
    expect(got('all-clear')).toBe(false);
  });
});

describe('nextPrayerInOrder', () => {
  const prayers = [
    { name: 'Fajr', pending: 3 }, { name: 'Dhuhr', pending: 0 }, { name: 'Asr', pending: 2 },
    { name: 'Maghrib', pending: 1 }, { name: 'Isha', pending: 0 },
  ];
  it('starts at Fajr with no history', () => expect(nextPrayerInOrder(null, prayers)).toBe('Fajr'));
  it('moves on after the last logged and skips cleared prayers', () => {
    expect(nextPrayerInOrder('Fajr', prayers)).toBe('Asr');
    expect(nextPrayerInOrder('Maghrib', prayers)).toBe('Fajr');
  });
  it('is null when nothing is owed', () => {
    expect(nextPrayerInOrder('Fajr', prayers.map(p => ({ ...p, pending: 0 })))).toBeNull();
  });
});

describe('nextNudgeAt', () => {
  it('is 8:30pm today when nothing is logged and it is still earlier', () => {
    expect(nextNudgeAt(false, NOW)).toEqual(new Date(2026, 9, 14, 20, 30));
  });
  it('moves to tomorrow once logged, or once 8:30pm has passed', () => {
    expect(nextNudgeAt(true, NOW)).toEqual(new Date(2026, 9, 15, 20, 30));
    expect(nextNudgeAt(false, new Date(2026, 9, 14, 21))).toEqual(new Date(2026, 9, 15, 20, 30));
  });
});

describe('nextNudgeAt with rest days', () => {
  it('skips a rest today', () => {
    expect(nextNudgeAt(false, NOW, [key(14)])).toEqual(new Date(2026, 9, 15, 20, 30));
  });
  it('skips consecutive rest days', () => {
    expect(nextNudgeAt(false, NOW, [key(14), key(15)])).toEqual(new Date(2026, 9, 16, 20, 30));
  });
});

describe('first-run state', () => {
  it('does not claim a free rest day when there is no streak to protect', () => {
    expect(computeStreaks([], [], NOW)).toMatchObject({ graceUsedYesterday: false, atRisk: false });
  });
});
