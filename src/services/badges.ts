/**
 * Badges — the small set of things worth marking, and the record of which ones
 * the user has already been shown.
 *
 * Two rules keep this from becoming a slot machine:
 *
 * 1. A badge is earned by a real threshold in the ledger, never by opening the
 *    app or by a streak of engagement. Every rule below reads money.
 * 2. A badge is celebrated exactly once. Losing one is silent — the badge
 *    simply stops showing. DESIGN.md's streak guidance (loss aversion past
 *    ~30 days turns a counter into something fragile) applies here too: we
 *    never dramatize the loss of a thing we made a fuss about earning.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'ck.badges.celebrated.v1';

export type BadgeId =
  | 'steady-start'
  | 'budget-master'
  | 'month-master'
  | 'starter-saver'
  | 'halfway-there';

export interface Badge {
  id: BadgeId;
  label: string;
  /** Why it appeared — shown in the celebration, not on the chip. */
  earnedFor: string;
  /** lucide-react-native icon name. */
  icon: 'Flame' | 'Trophy' | 'Medal' | 'PiggyBank' | 'Target';
}

export interface BadgeContext {
  /** Consecutive days at or under the daily allowance. */
  streakDays: number;
  /** Total saved across all goals, paise. */
  goalSavedPaise: number;
  /** Best single-goal completion, 0..1. */
  bestGoalProgress: number;
}

const RULES: Array<{ badge: Badge; earned: (c: BadgeContext) => boolean }> = [
  {
    badge: {
      id: 'steady-start',
      label: 'Steady Start',
      earnedFor: 'Three days running under your daily budget.',
      icon: 'Flame',
    },
    earned: c => c.streakDays >= 3,
  },
  {
    badge: {
      id: 'budget-master',
      label: 'Budget Master',
      earnedFor: 'Five days running under your daily budget.',
      icon: 'Trophy',
    },
    earned: c => c.streakDays >= 5,
  },
  {
    badge: {
      id: 'month-master',
      label: 'Month Master',
      earnedFor: 'Thirty days running under your daily budget.',
      icon: 'Medal',
    },
    earned: c => c.streakDays >= 30,
  },
  {
    badge: {
      id: 'starter-saver',
      label: 'Starter Saver',
      earnedFor: 'Your first ₹5,000 put away toward a goal.',
      icon: 'PiggyBank',
    },
    earned: c => c.goalSavedPaise >= 500000,
  },
  {
    badge: {
      id: 'halfway-there',
      label: 'Halfway There',
      earnedFor: 'A savings goal past the halfway mark.',
      icon: 'Target',
    },
    earned: c => c.bestGoalProgress >= 0.5,
  },
];

/** Every badge currently earned, strongest last. */
/** Every badge in ladder order, earned or not, for the badge shelf. */
export const BADGE_LADDER: Badge[] = RULES.map(r => r.badge);

export const earnedBadges = (ctx: BadgeContext): Badge[] =>
  RULES.filter(r => r.earned(ctx)).map(r => r.badge);

/**
 * The single badge worth showing on the home hero — the last one earned, since
 * the ladder is ordered weakest to strongest within each track.
 */
export const headlineBadge = (ctx: BadgeContext): Badge | null => {
  const earned = earnedBadges(ctx);
  return earned.length > 0 ? earned[earned.length - 1] : null;
};

/** The thresholds the goal-track badges are earned at. */
export const STARTER_SAVER_PAISE = 500000;
export const HALFWAY_RATIO = 0.5;

export interface BadgeProgress {
  badge: Badge;
  /** How far along the user is toward earning it, 0..1. */
  ratio: number;
  /** What closes the gap, in the app's voice. */
  hint: string;
}

/**
 * The next money-track badge and how close it is.
 *
 * This exists because GoalsStrip carried its own private copy of these two
 * rules — a literal `500000` and a `targetPaise / 2` inline in the component —
 * so the home card and the badge engine were two independent implementations
 * of one ladder, free to disagree the moment either moved. The thresholds are
 * declared once, here, and both read them.
 *
 * Returns null once the money track is exhausted; the caller falls back to the
 * goal's own remaining balance, which is the only honest thing left to show.
 */
export const nextGoalBadge = (
  goalSavedPaise: number,
  bestGoalProgress: number,
  bestGoalHalfwayGapPaise: number,
): BadgeProgress | null => {
  const rule = (id: BadgeId) => RULES.find(r => r.badge.id === id)!.badge;

  if (goalSavedPaise < STARTER_SAVER_PAISE) {
    return {
      badge: rule('starter-saver'),
      ratio: Math.max(0, goalSavedPaise / STARTER_SAVER_PAISE),
      hint: `${formatPaise(STARTER_SAVER_PAISE - goalSavedPaise)} more unlocks Starter Saver`,
    };
  }

  if (bestGoalProgress < HALFWAY_RATIO) {
    return {
      badge: rule('halfway-there'),
      ratio: bestGoalProgress / HALFWAY_RATIO,
      hint: `${formatPaise(bestGoalHalfwayGapPaise)} more reaches halfway`,
    };
  }

  return null;
};

/**
 * Local so this module stays free of UI imports — it needs exactly one
 * currency string and nothing else Money offers.
 */
const formatPaise = (paise: number): string =>
  `₹${Math.max(0, Math.round(paise / 100)).toLocaleString('en-IN')}`;

const readSeen = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    // A corrupt or unreadable record must never block the home screen; the
    // worst case of treating it as empty is one repeated celebration.
    return new Set<string>();
  }
};

/**
 * Badges earned but never celebrated, marked celebrated as a side effect.
 * Called once per home load, so the animation fires on the load after the
 * threshold is crossed and never again.
 */
export const takeUncelebrated = async (
  ctx: BadgeContext,
): Promise<Badge[]> => {
  const earned = earnedBadges(ctx);
  if (earned.length === 0) return [];

  const seen = await readSeen();
  const fresh = earned.filter(b => !seen.has(b.id));
  if (fresh.length === 0) return [];

  try {
    await AsyncStorage.setItem(
      SEEN_KEY,
      JSON.stringify([...seen, ...fresh.map(b => b.id)]),
    );
  } catch (e) {
    // Persisting failed — show it anyway. A duplicate celebration is a far
    // smaller failure than silently swallowing the first one.
    console.warn('[badges] could not persist celebration record', e);
  }

  return fresh;
};


const STREAK_TARGETS: Record<string, number> = {
  'steady-start': 3,
  'budget-master': 5,
  'month-master': 30,
};

/** The unearned badge you are closest to, with a plain hint on what is left. */
export const nextBadgeProgress = (
  ctx: BadgeContext,
): { label: string; ratio: number; hint: string } | null => {
  const earned = new Set(earnedBadges(ctx).map(b => b.id));
  let best: { label: string; ratio: number; hint: string } | null = null;
  for (const badge of BADGE_LADDER) {
    if (earned.has(badge.id)) continue;
    let ratio = 0;
    let hint = '';
    const streak = STREAK_TARGETS[badge.id];
    if (streak) {
      ratio = ctx.streakDays / streak;
      const left = Math.max(streak - ctx.streakDays, 0);
      hint = `${left} more ${left === 1 ? 'day' : 'days'} under your daily limit`;
    } else if (badge.id === 'starter-saver') {
      ratio = ctx.goalSavedPaise / STARTER_SAVER_PAISE;
      hint = `${formatPaise(Math.max(STARTER_SAVER_PAISE - ctx.goalSavedPaise, 0))} more saved towards your goals`;
    } else if (badge.id === 'halfway-there') {
      ratio = ctx.bestGoalProgress / HALFWAY_RATIO;
      hint = 'Get one goal to the halfway mark';
    }
    if (!best || ratio > best.ratio) best = { label: badge.label, ratio: Math.min(ratio, 1), hint };
  }
  return best;
};
