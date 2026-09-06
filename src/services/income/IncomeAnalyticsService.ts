import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { getDb } from '../../store/database';

/** Returned when there isn't enough history to score a factor honestly. */
export const NOT_ENOUGH_DATA = -1;

const DAY = 24 * 60 * 60 * 1000;

/** One calendar month of income. */
export interface IncomeMonth {
  /** YYYY-MM, for keys and ordering. */
  key: string;
  /** Three-letter month, for axis labels. */
  label: string;
  totalPaise: number;
}

/** One income source's share of a window. */
export interface IncomeSource {
  name: string;
  totalPaise: number;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const sumIncomeBetween = async (
  tx: SQLiteTransaction,
  fromMs: number,
  toMs: number,
): Promise<number> => {
  const result = await tx.execute(
    `SELECT COALESCE(SUM(amount_paise), 0) AS total
       FROM transactions
      WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?`,
    [fromMs, toMs],
  );
  return Number((result.rows as any)?.[0]?.total ?? 0);
};

export const IncomeAnalyticsService = {
  /**
   * Calculates income stability based on frequency and variance.
   */
  async calculateStabilityScore(tx: SQLiteTransaction): Promise<number> {
    const result = await tx.execute('SELECT variance_paise, average_amount_paise FROM income_patterns');
    if (!result.rows || result.rows.length === 0) return NOT_ENOUGH_DATA;

    let totalScore = 0;
    for (let i = 0; i < result.rows.length; i++) {
      const pattern = (result.rows as any)[i];
      if (pattern.average_amount_paise > 0) {
        const varianceRatio = pattern.variance_paise / pattern.average_amount_paise;
        // The higher the variance, the lower the score. Max score is 100.
        const score = Math.max(0, 100 - (varianceRatio * 100));
        totalScore += score;
      }
    }
    return Math.floor(totalScore / result.rows.length);
  },

  /**
   * How spread income is across sources over the last 6 months, as the
   * inverse Herfindahl–Hirschman index of each source's share. A single
   * source scores 0, two equal sources 50, four equal sources 75.
   */
  async calculateDiversityScore(tx: SQLiteTransaction): Promise<number> {
    const since = Date.now() - 182 * DAY;
    const result = await tx.execute(
      `SELECT category_id, SUM(amount_paise) AS total
         FROM transactions
        WHERE type = 'income' AND occurred_at >= ?
        GROUP BY category_id`,
      [since],
    );

    const rows = (result.rows ?? []) as any[];
    if (rows.length === 0) return NOT_ENOUGH_DATA;

    const total = rows.reduce((sum, r) => sum + Number(r.total ?? 0), 0);
    if (total <= 0) return NOT_ENOUGH_DATA;

    const hhi = rows.reduce((sum, r) => {
      const share = Number(r.total ?? 0) / total;
      return sum + share * share;
    }, 0);

    return Math.round(clamp(1 - hhi, 0, 1) * 100);
  },

  /**
   * Last 90 days of income against the 90 before it. Flat scores 50; a 50%
   * rise scores 100, a 50% fall scores 0. Needs a prior period to compare
   * against, so a first-quarter user is reported as unmeasured, not as zero.
   */
  async calculateGrowthScore(tx: SQLiteTransaction): Promise<number> {
    const now = Date.now();
    const window = 90 * DAY;

    const [recent, prior] = await Promise.all([
      sumIncomeBetween(tx, now - window, now),
      sumIncomeBetween(tx, now - 2 * window, now - window),
    ]);

    if (prior <= 0) return NOT_ENOUGH_DATA;

    const ratio = recent / prior;
    return Math.round(clamp(50 + (ratio - 1) * 100, 0, 100));
  },

  /**
   * Share of the last 6 months' income that arrived from sources with a
   * detected recurring pattern — the "how much of this is predictable?" number.
   */
  async calculateRecurringShare(tx: SQLiteTransaction): Promise<number> {
    const since = Date.now() - 182 * DAY;

    const totalResult = await tx.execute(
      `SELECT COALESCE(SUM(amount_paise), 0) AS total
         FROM transactions
        WHERE type = 'income' AND occurred_at >= ?`,
      [since],
    );
    const total = Number((totalResult.rows as any)?.[0]?.total ?? 0);
    if (total <= 0) return NOT_ENOUGH_DATA;

    const recurringResult = await tx.execute(
      `SELECT COALESCE(SUM(average_amount_paise), 0) AS total
         FROM income_patterns
        WHERE frequency IN ('weekly', 'bi-weekly', 'monthly')`,
    );
    const recurringMonthly = Number(
      (recurringResult.rows as any)?.[0]?.total ?? 0,
    );

    // Six months of the detected recurring amounts, capped at what actually
    // arrived — patterns are estimates and must never exceed observed income.
    return Math.round(clamp((recurringMonthly * 6) / total, 0, 1) * 100);
  },

  /**
   * Income per calendar month, oldest first, with empty months present as
   * zeroes. The gaps are the point: a volatile income reads as a sawtooth only
   * if the months with nothing in them still occupy the x-axis.
   */
  async getMonthlyTrend(months = 6): Promise<IncomeMonth[]> {
    const db = getDb();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await db.execute(
      `SELECT strftime('%Y-%m', occurred_at / 1000, 'unixepoch', 'localtime') AS key,
              COALESCE(SUM(amount_paise), 0) AS total
         FROM transactions
        WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?
        GROUP BY key`,
      [from.getTime(), to.getTime()],
    );

    const totals = new Map<string, number>(
      ((result.rows ?? []) as any[]).map(r => [r.key, Number(r.total ?? 0)]),
    );

    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        totalPaise: totals.get(key) ?? 0,
      };
    });
  },

  /**
   * Income by category over the trailing window — the slices behind the
   * diversity score, so the number and the picture can never disagree.
   */
  async getIncomeBySource(months = 6): Promise<IncomeSource[]> {
    const db = getDb();
    const since = Date.now() - months * 30.44 * DAY;

    const result = await db.execute(
      `SELECT COALESCE(c.name, 'Other') AS name,
              SUM(t.amount_paise) AS total
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.type = 'income' AND t.occurred_at >= ?
        GROUP BY name
        ORDER BY total DESC`,
      [since],
    );

    return ((result.rows ?? []) as any[]).map(r => ({
      name: String(r.name),
      totalPaise: Number(r.total ?? 0),
    }));
  },
};
