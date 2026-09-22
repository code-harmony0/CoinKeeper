import { getDb } from '../../store/database';
import { resolveCategoryId } from '../../store/transactionStore';
import { financialEventBus } from '../EventBus';
import { parseCsv } from './transactionCsv';

export interface ImportResult {
  imported: number;
  /** Rows that were valid but already present in the ledger. */
  skipped: number;
  errors: string[];
}

let idCounter = 0;
const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${idCounter++}`;

/**
 * Imports transactions from CSV text.
 *
 * Re-importing the same file is a normal thing for a person to do, so a row
 * matching an existing transaction on date and amount is skipped rather than
 * duplicated — silently doubling someone's spending would be worse than
 * missing an genuine same-day, same-amount repeat.
 */
export const importTransactionsFromCsv = async (text: string): Promise<ImportResult> => {
  const { rows, errors } = parseCsv(text);
  const db = getDb();

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const duplicate = await db.execute(
      'SELECT id FROM transactions WHERE occurred_at = ? AND amount_paise = ? LIMIT 1;',
      [row.occurredAt, row.amountPaise],
    );

    if ((duplicate?.rows ?? []).length > 0) {
      skipped++;
      continue;
    }

    const categoryId = row.category
      ? await resolveCategoryId(db, row.category, undefined)
      : null;

    await db.execute(
      `INSERT INTO transactions
        (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
       VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL);`,
      [
        generateId(),
        row.amountPaise,
        row.type,
        categoryId,
        row.description || null,
        row.occurredAt,
      ],
    );
    imported++;
  }

  // One notification for the whole file, not one per row: the dashboard,
  // Money Plan and Reports all refetch on this, and a 500-row import would
  // otherwise trigger 500 refetches.
  if (imported > 0) financialEventBus.emit();

  return { imported, skipped, errors };
};
