import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { getDb } from '../../store/database';
import { toCsv, type CsvTransaction } from './transactionCsv';

export * from './transactionCsv';
export * from './importTransactions';

/** Dated so a new export never silently overwrites yesterday's. */
const exportFileName = (): string =>
  `coinkeeper-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

export const collectTransactionsForExport = async (): Promise<CsvTransaction[]> => {
  const db = getDb();
  const result = await db.execute(
    `SELECT t.occurred_at, t.amount_paise, t.type, t.description, c.name AS category
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ORDER BY t.occurred_at DESC;`,
  );

  return ((result?.rows ?? []) as any[]).map(row => ({
    occurredAt: row.occurred_at,
    amountPaise: row.amount_paise,
    type: row.type === 'income' ? 'income' : 'expense',
    category: row.category ?? '',
    description: row.description ?? '',
    notes: '',
  }));
};

/**
 * Writes every transaction to a CSV file and hands it to the share sheet. The
 * file stays on the device unless the user chooses to send it somewhere —
 * nothing is uploaded.
 */
export const exportAndShareTransactionsCsv = async (): Promise<number> => {
  const transactions = await collectTransactionsForExport();

  // The cache directory, not documents: react-native-share's FileProvider
  // serves cache-path and external Download/ only, so a file written to the
  // app's private files/ dir cannot be handed to the share sheet at all.
  const path = `${RNFS.CachesDirectoryPath}/${exportFileName()}`;
  await RNFS.writeFile(path, toCsv(transactions), 'utf8');

  try {
    await Share.open({ url: `file://${path}`, type: 'text/csv' });
  } catch (error) {
    // Dismissing the sheet rejects with this exact message, and the file is
    // already written, so that is genuinely not a failure. Anything else is.
    const dismissed =
      error instanceof Error && /User did not share/i.test(error.message);
    if (!dismissed) throw error;
  }

  return transactions.length;
};
