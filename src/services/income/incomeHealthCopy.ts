/**
 * Income health, in words.
 *
 * The scores are computed in IncomeAnalyticsService; this file is the only
 * place that decides what a score *means* and what to do about it, so the home
 * card and the detail screen can never tell the user two different stories
 * about the same number.
 *
 * Every tip is something the user can actually do in this app or in their own
 * life this week. "Improve your stability" is not a tip.
 */

import { NOT_ENOUGH_DATA } from './IncomeAnalyticsService';

export type PillarKey = 'stability' | 'diversity' | 'growth';

export interface Pillar {
  key: PillarKey;
  label: string;
  /** lucide-react-native icon name. */
  icon: 'Activity' | 'Layers' | 'TrendingUp';
  /** -1 when there isn't enough history to score it honestly. */
  score: number;
  /** What the number measures, in one sentence. */
  meaning: string;
  /** What to do about this score specifically. */
  tip: string;
}

export interface PillarScores {
  stability: number;
  diversity: number;
  growth: number;
}

const MEANING: Record<PillarKey, string> = {
  stability:
    'How close each month’s income is to the last. High means you can plan against a number you trust.',
  diversity:
    'How spread your income is across sources. A single source scores 0 no matter how large it is.',
  growth:
    'The last 90 days against the 90 before them. 50 is flat, above is growing.',
};

const tipFor = (key: PillarKey, score: number): string => {
  if (score === NOT_ENOUGH_DATA) {
    return key === 'growth'
      ? 'Needs a previous quarter to compare against — this fills in once you have six months of history.'
      : 'Log a few months of income and this starts scoring.';
  }

  if (key === 'stability') {
    if (score < 40)
      return 'Budget against your lowest month, not your average. A single recurring source — a retainer, a standing invoice — moves this faster than a bigger month does.';
    if (score < 70)
      return 'You’re close to predictable. Marking your regular income as recurring lets CoinKeeper forecast the month before it starts.';
    return 'Steady enough to plan against. Keep the recurring sources recurring.';
  }

  if (key === 'diversity') {
    if (score < 40)
      return 'Almost everything comes from one place. A second source, even a small one, is what turns a lost client into a bad month instead of a crisis.';
    if (score < 70)
      return 'You have a second stream. Growing it toward a third of your total is what makes it a real cushion.';
    return 'Well spread. No single source can take out your month.';
  }

  if (score < 40)
    return 'Income is trending down against last quarter. Worth checking whether a source stopped rather than shrank.';
  if (score < 70)
    return 'Broadly flat. A rate rise on your steadiest source is usually easier than finding a new one.';
  return 'Trending up. Bank the difference before it becomes the new baseline.';
};

const LABELS: Record<PillarKey, { label: string; icon: Pillar['icon'] }> = {
  stability: { label: 'Stability', icon: 'Activity' },
  diversity: { label: 'Diversity', icon: 'Layers' },
  growth: { label: 'Growth', icon: 'TrendingUp' },
};

export const buildPillars = (scores: PillarScores): Pillar[] =>
  (['stability', 'diversity', 'growth'] as PillarKey[]).map(key => ({
    key,
    label: LABELS[key].label,
    icon: LABELS[key].icon,
    score: scores[key],
    meaning: MEANING[key],
    tip: tipFor(key, scores[key]),
  }));

/** The weakest measurable pillar — the one worth acting on first. */
export const weakestPillar = (pillars: Pillar[]): Pillar | null => {
  const measured = pillars.filter(p => p.score !== NOT_ENOUGH_DATA);
  if (measured.length === 0) return null;
  return measured.reduce((a, b) => (b.score < a.score ? b : a));
};

export type ScoreBand = 'low' | 'medium' | 'high';

export const bandFor = (score: number): ScoreBand =>
  score <= 30 ? 'low' : score <= 60 ? 'medium' : 'high';

/** The one-line reading of the overall score. */
export const verdictFor = (score: number): string => {
  if (score === NOT_ENOUGH_DATA)
    return 'Not enough income history to score yet.';
  if (score < 40) return 'Your income is unstable. Let’s fix that.';
  if (score < 70) return 'Decent, with room to grow.';
  return 'Solid income health.';
};
