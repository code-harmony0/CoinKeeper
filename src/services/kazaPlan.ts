/**
 * Kaza maths, kept free of React and SQLite so it can be tested directly.
 */

export interface KazaEstimateInput {
  /** Age the person became obliged to pray (bulugh). */
  pubertyAge: number;
  /** Age they started praying regularly. */
  prayingSinceAge: number;
  /** Days per month excused from prayer (menstruation), 0 for none. */
  cycleDaysPerMonth?: number;
  /** Total postpartum (nifas) days across all births, 0 for none. */
  postpartumDays?: number;
}

/**
 * Days of missed prayer between becoming obliged and praying regularly.
 * Excused cycle days are subtracted so women are not asked to make up
 * prayers they were never required to offer.
 */
export const estimateMissedDays = ({
  pubertyAge,
  prayingSinceAge,
  cycleDaysPerMonth = 0,
  postpartumDays = 0,
}: KazaEstimateInput): number => {
  const years = Math.max(0, prayingSinceAge - pubertyAge);
  const excused = years * 12 * Math.max(0, cycleDaysPerMonth) + Math.max(0, postpartumDays);
  return Math.max(0, Math.round(years * 365 - excused));
};

/** Whole days left at `perDay` prayers a day; null when no goal is set. */
export const daysToFinish = (pendingTotal: number, perDay: number): number | null =>
  perDay > 0 ? Math.ceil(pendingTotal / perDay) : null;
