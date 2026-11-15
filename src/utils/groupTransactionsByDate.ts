import { Transaction } from '../types/transaction';

export type GroupedRow =
  /** netPaise: that day's income minus expenses; goal transfers are not spending. */
  | { type: 'header'; label: string; key: string; netPaise: number }
  | { type: 'row'; tx: Transaction; key: string };

/**
 * The local calendar day a timestamp falls on.
 *
 * This used to be `iso.slice(0, 10)` — the UTC date carved off the string —
 * while the header label was rendered with `toLocaleDateString`, i.e. in local
 * time. The two disagree for every timestamp after 18:30 IST, so two different
 * UTC days produced two separate groups carrying the *same* local label, and
 * the list showed "9 August 2026" twice in a row.
 *
 * It also broke Today/Yesterday every evening in India, which is the entire
 * user base: at 23:00 IST the UTC date is already tomorrow, so "Today" stopped
 * matching the day the user was actually having.
 *
 * Key and label must be derived from the same clock. Both are local now.
 */
const dayKey = (value: string | Date): string => {
  const d = value instanceof Date ? value : new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const dayLabel = (iso: string, now: Date): string => {
  const date = new Date(iso);
  const key = dayKey(date);

  if (key === dayKey(now)) return 'Today';
  if (key === dayKey(new Date(now.getTime() - 86400000))) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Assumes transactions are already sorted newest-first (transactionStore
// loads them with `ORDER BY t.occurred_at DESC`) — this only groups, it
// does not re-sort.
export const groupTransactionsByDate = (
  transactions: Transaction[],
  now: Date = new Date(),
): GroupedRow[] => {
  const rows: GroupedRow[] = [];
  let currentKey: string | null = null;

  let header: Extract<GroupedRow, { type: 'header' }> | null = null;

  for (const tx of transactions) {
    const key = dayKey(tx.date);
    if (key !== currentKey) {
      currentKey = key;
      header = {
        type: 'header',
        label: dayLabel(tx.date, now),
        key: `header-${key}`,
        netPaise: 0,
      };
      rows.push(header);
    }
    if (header && tx.type === 'income') header.netPaise += tx.amountPaise;
    if (header && tx.type === 'expense') header.netPaise -= tx.amountPaise;
    rows.push({ type: 'row', tx, key: tx.id });
  }

  return rows;
};
