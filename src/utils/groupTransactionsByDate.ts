import { Transaction } from '../types/transaction';

export type GroupedRow =
  | { type: 'header'; label: string; key: string }
  | { type: 'row'; tx: Transaction; key: string };

const dayKey = (iso: string): string => iso.slice(0, 10);

const dayLabel = (iso: string): string => {
  const date = new Date(iso);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  const key = dayKey(iso);

  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Assumes transactions are already sorted newest-first (transactionStore
// loads them with `ORDER BY t.occurred_at DESC`) — this only groups, it
// does not re-sort.
export const groupTransactionsByDate = (transactions: Transaction[]): GroupedRow[] => {
  const rows: GroupedRow[] = [];
  let currentKey: string | null = null;

  for (const tx of transactions) {
    const key = dayKey(tx.date);
    if (key !== currentKey) {
      currentKey = key;
      rows.push({ type: 'header', label: dayLabel(tx.date), key: `header-${key}` });
    }
    rows.push({ type: 'row', tx, key: tx.id });
  }

  return rows;
};
