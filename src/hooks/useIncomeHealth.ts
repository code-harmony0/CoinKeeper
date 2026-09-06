/**
 * useIncomeHealth — the one read path for income health.
 *
 * The home card and the detail screen both need the same score, the same
 * pillars, the same six months and the same sources. Loading them from one
 * hook is what guarantees the card and the screen behind it can never show
 * different numbers for the same day.
 *
 * IncomeHealthService recalculates and caches the scores whenever income is
 * saved; this hook re-reads that cache on every financial event, so adding
 * income updates the score without a manual refresh.
 */
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../store/database';
import {
  IncomeAnalyticsService,
  NOT_ENOUGH_DATA,
  type IncomeMonth,
  type IncomeSource,
} from '../services/income/IncomeAnalyticsService';
import {
  buildPillars,
  weakestPillar,
  type Pillar,
} from '../services/income/incomeHealthCopy';
import { financialEventBus } from '../services/EventBus';

export interface IncomeHealth {
  /** 0–100, or NOT_ENOUGH_DATA. */
  score: number;
  pillars: Pillar[];
  weakest: Pillar | null;
  months: IncomeMonth[];
  sources: IncomeSource[];
  /** True once the first load has finished, whatever it found. */
  loaded: boolean;
  /** True when no cached score exists yet — the card hides itself. */
  empty: boolean;
  reload: () => Promise<void>;
}

const EMPTY_SCORES = {
  stability: NOT_ENOUGH_DATA,
  diversity: NOT_ENOUGH_DATA,
  growth: NOT_ENOUGH_DATA,
};

export const useIncomeHealth = (): IncomeHealth => {
  const [score, setScore] = useState(NOT_ENOUGH_DATA);
  const [pillars, setPillars] = useState<Pillar[]>(() =>
    buildPillars(EMPTY_SCORES),
  );
  const [months, setMonths] = useState<IncomeMonth[]>([]);
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [empty, setEmpty] = useState(true);

  const load = useCallback(async () => {
    try {
      const db = getDb();
      const [cache, trend, bySource] = await Promise.all([
        db.execute(
          'SELECT * FROM income_health_cache ORDER BY date DESC LIMIT 1',
        ),
        IncomeAnalyticsService.getMonthlyTrend(6),
        IncomeAnalyticsService.getIncomeBySource(6),
      ]);

      const row = (cache.rows ?? [])[0] as any;
      setMonths(trend);
      setSources(bySource);

      if (!row) {
        setScore(NOT_ENOUGH_DATA);
        setPillars(buildPillars(EMPTY_SCORES));
        setEmpty(true);
      } else {
        setScore(Number(row.overall_score));
        setPillars(
          buildPillars({
            stability: Number(row.stability_score),
            diversity: Number(row.diversity_score),
            growth: Number(row.growth_score),
          }),
        );
        setEmpty(false);
      }
    } catch (e) {
      // A missing cache table on a fresh install is not an error worth
      // surfacing — the card simply doesn't appear until there is a score.
      console.warn('[useIncomeHealth] could not read income health', e);
      setEmpty(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    return financialEventBus.subscribe(load);
  }, [load]);

  return {
    score,
    pillars,
    weakest: weakestPillar(pillars),
    months,
    sources,
    loaded,
    empty,
    reload: load,
  };
};
