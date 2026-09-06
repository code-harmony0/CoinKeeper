import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  earnedBadges,
  headlineBadge,
  takeUncelebrated,
} from '../../src/services/badges';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    __reset: () => {
      store = {};
    },
  };
});

const none = { streakDays: 0, goalSavedPaise: 0, bestGoalProgress: 0 };

beforeEach(() => {
  (AsyncStorage as any).__reset();
  jest.clearAllMocks();
});

describe('earnedBadges', () => {
  it('awards nothing to a user who has done nothing', () => {
    expect(earnedBadges(none)).toEqual([]);
  });

  it('awards the whole streak ladder up to the day count reached', () => {
    const ids = earnedBadges({ ...none, streakDays: 5 }).map(b => b.id);
    expect(ids).toEqual(['steady-start', 'budget-master']);
  });

  it('awards Starter Saver at exactly ₹5,000, not before', () => {
    expect(
      earnedBadges({ ...none, goalSavedPaise: 499900 }).map(b => b.id),
    ).toEqual([]);
    expect(
      earnedBadges({ ...none, goalSavedPaise: 500000 }).map(b => b.id),
    ).toEqual(['starter-saver']);
  });

  it('picks the strongest earned badge as the headline', () => {
    expect(headlineBadge({ ...none, streakDays: 31 })?.id).toBe('month-master');
  });
});

describe('takeUncelebrated', () => {
  it('hands back a newly earned badge exactly once', async () => {
    const ctx = { ...none, streakDays: 3 };
    expect((await takeUncelebrated(ctx)).map(b => b.id)).toEqual([
      'steady-start',
    ]);
    expect(await takeUncelebrated(ctx)).toEqual([]);
  });

  it('celebrates only the badges that are new since last time', async () => {
    await takeUncelebrated({ ...none, streakDays: 3 });
    const fresh = await takeUncelebrated({ ...none, streakDays: 5 });
    expect(fresh.map(b => b.id)).toEqual(['budget-master']);
  });

  it('still celebrates when the record cannot be persisted', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('disk full'),
    );
    const fresh = await takeUncelebrated({ ...none, streakDays: 3 });
    expect(fresh).toHaveLength(1);
  });
});
