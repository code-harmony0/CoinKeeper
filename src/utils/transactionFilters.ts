import { Transaction } from '../types/transaction';

export interface AmountDateFilter {
  minAmountPaise?: number;
  maxAmountPaise?: number;
  dateFromIso?: string;
  dateToIso?: string;
}

/**
 * A date-range filter selects whole local days, inclusive at both ends.
 *
 * This used to compare raw instants. A date picker hands back the chosen day
 * carrying the current time, so "From 9 Aug" was really 9 Aug 17:41 — and
 * picking From = To = today, the most obvious thing a person does with a date
 * filter, matched a range one instant wide and returned nothing at all.
 *
 * Normalising here rather than at the call site means every caller gets the
 * same semantics, whatever instant it happens to pass in.
 */
const startOfDay = (iso: string): number => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const endOfDay = (iso: string): number => {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export const matchesAmountDateFilter = (
  tx: Transaction,
  filter: AmountDateFilter,
): boolean => {
  if (filter.minAmountPaise !== undefined && tx.amountPaise < filter.minAmountPaise) return false;
  if (filter.maxAmountPaise !== undefined && tx.amountPaise > filter.maxAmountPaise) return false;

  const at = new Date(tx.date).getTime();
  if (filter.dateFromIso && at < startOfDay(filter.dateFromIso)) return false;
  if (filter.dateToIso && at > endOfDay(filter.dateToIso)) return false;
  return true;
};

export const isFilterActive = (filter: AmountDateFilter): boolean =>
  filter.minAmountPaise !== undefined ||
  filter.maxAmountPaise !== undefined ||
  !!filter.dateFromIso ||
  !!filter.dateToIso;

/**
 * Puts a filter into a state that can actually match something.
 *
 * Ranges get entered backwards — people set the end first, or change their
 * mind about the start. Silently returning an empty list is the worst possible
 * response: it looks like "you have no transactions" rather than "your filter
 * is inside out". Swapping is unambiguous and is what the user meant.
 *
 * A bound that isn't a usable number is dropped rather than coerced, because
 * `Money.toPaise('abc')` is 0, and a min of 0 silently filters nothing while
 * a max of 0 silently filters everything.
 */
export const normalizeFilter = (filter: AmountDateFilter): AmountDateFilter => {
  let { minAmountPaise, maxAmountPaise, dateFromIso, dateToIso } = filter;

  if (minAmountPaise !== undefined && !(minAmountPaise > 0)) minAmountPaise = undefined;
  if (maxAmountPaise !== undefined && !(maxAmountPaise > 0)) maxAmountPaise = undefined;

  if (
    minAmountPaise !== undefined &&
    maxAmountPaise !== undefined &&
    minAmountPaise > maxAmountPaise
  ) {
    [minAmountPaise, maxAmountPaise] = [maxAmountPaise, minAmountPaise];
  }

  if (dateFromIso && dateToIso && startOfDay(dateFromIso) > startOfDay(dateToIso)) {
    [dateFromIso, dateToIso] = [dateToIso, dateFromIso];
  }

  return { minAmountPaise, maxAmountPaise, dateFromIso, dateToIso };
};

/** A short human summary of what a filter is doing, or null when it does nothing. */
export const describeFilter = (
  filter: AmountDateFilter,
  formatMoney: (paise: number) => string,
): string | null => {
  const parts: string[] = [];
  const { minAmountPaise, maxAmountPaise, dateFromIso, dateToIso } = filter;

  if (minAmountPaise !== undefined && maxAmountPaise !== undefined) {
    parts.push(`${formatMoney(minAmountPaise)}–${formatMoney(maxAmountPaise)}`);
  } else if (minAmountPaise !== undefined) {
    parts.push(`over ${formatMoney(minAmountPaise)}`);
  } else if (maxAmountPaise !== undefined) {
    parts.push(`under ${formatMoney(maxAmountPaise)}`);
  }

  const day = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (dateFromIso && dateToIso) {
    parts.push(
      startOfDay(dateFromIso) === startOfDay(dateToIso)
        ? `on ${day(dateFromIso)}`
        : `${day(dateFromIso)} – ${day(dateToIso)}`,
    );
  } else if (dateFromIso) {
    parts.push(`from ${day(dateFromIso)}`);
  } else if (dateToIso) {
    parts.push(`until ${day(dateToIso)}`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
};

/**
 * Exact category match for the Reports drill-down. Deliberately not a substring
 * test: tapping "Food" must not also pull in "Food Court", which is what reusing
 * the free-text search would have done.
 */
export const matchesCategory = (
  transaction: { category?: string },
  category: string | null,
): boolean => {
  const wanted = (category ?? '').trim().toLowerCase();
  if (!wanted) return true;
  return (transaction.category ?? '').trim().toLowerCase() === wanted;
};
