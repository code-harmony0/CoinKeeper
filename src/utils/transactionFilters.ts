import { Transaction } from '../types/transaction';

export interface AmountDateFilter {
  minAmountPaise?: number;
  maxAmountPaise?: number;
  dateFromIso?: string;
  dateToIso?: string;
}

export const matchesAmountDateFilter = (tx: Transaction, filter: AmountDateFilter): boolean => {
  if (filter.minAmountPaise !== undefined && tx.amountPaise < filter.minAmountPaise) return false;
  if (filter.maxAmountPaise !== undefined && tx.amountPaise > filter.maxAmountPaise) return false;
  if (filter.dateFromIso && new Date(tx.date) < new Date(filter.dateFromIso)) return false;
  if (filter.dateToIso && new Date(tx.date) > new Date(filter.dateToIso)) return false;
  return true;
};

export const isFilterActive = (filter: AmountDateFilter): boolean =>
  filter.minAmountPaise !== undefined ||
  filter.maxAmountPaise !== undefined ||
  !!filter.dateFromIso ||
  !!filter.dateToIso;
