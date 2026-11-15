import { Transaction } from '../types/transaction';

/**
 * Search by what a person remembers: the merchant, the category, the bank or
 * payment method — or the amount ("450" finds ₹450 and ₹450.50, "₹1,200"
 * finds ₹1,200). Every word must match somewhere, so "swiggy 450" narrows
 * rather than widens.
 */
export const matchesSearch = (tx: Transaction, query: string): boolean => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const rupees = (tx.amountPaise / 100).toString();
  const haystack = [tx.description, tx.category, tx.paymentMethod, tx.bankId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return words.every(word => {
    const asAmount = word.replace(/[₹,]/g, '');
    if (/^\d+(\.\d+)?$/.test(asAmount) && rupees.startsWith(asAmount)) return true;
    return haystack.includes(word);
  });
};
