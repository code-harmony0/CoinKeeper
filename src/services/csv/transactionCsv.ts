/**
 * CSV import/export for personal transactions.
 *
 * Hand-rolled rather than pulling in a parser: the grammar below (RFC 4180
 * quoting) is the whole of what a spreadsheet emits, and a dependency for it
 * would be larger than the code. Everything here is pure — file I/O and
 * sharing live in the caller — so the round-trip is directly testable.
 */

export type CsvTransactionType = 'expense' | 'income';

export interface CsvTransaction {
  occurredAt: number;
  amountPaise: number;
  type: CsvTransactionType;
  category: string;
  description: string;
  notes: string;
}

const COLUMNS = ['Date', 'Amount', 'Type', 'Category', 'Description', 'Notes'] as const;

export const CSV_HEADER = `${COLUMNS.join(',')}\n`;

const needsQuoting = (field: string): boolean => /[",\n\r]/.test(field);

const escapeField = (value: string): string =>
  needsQuoting(value) ? `"${value.replace(/"/g, '""')}"` : value;

const isoDate = (ms: number): string => new Date(ms).toISOString().split('T')[0];

export const toCsv = (transactions: CsvTransaction[]): string =>
  transactions.reduce(
    (out, t) =>
      out +
      [
        isoDate(t.occurredAt),
        (t.amountPaise / 100).toFixed(2),
        t.type,
        t.category ?? '',
        t.description ?? '',
        t.notes ?? '',
      ]
        .map(escapeField)
        .join(',') +
      '\n',
    CSV_HEADER,
  );

/**
 * Splits CSV text into rows of fields, honouring quoted fields that contain
 * commas, quotes, or newlines.
 */
const tokenize = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
    } else if (char === ',') {
      endField();
      i++;
    } else if (char === '\r') {
      i++;
    } else if (char === '\n') {
      endRow();
      i++;
    } else {
      field += char;
      i++;
    }
  }

  if (field !== '' || row.length > 0) endRow();

  return rows;
};

export interface ParsedCsv {
  rows: CsvTransaction[];
  /** One human-readable message per rejected row; good rows are still kept. */
  errors: string[];
}

export const parseCsv = (text: string): ParsedCsv => {
  const table = tokenize(text).filter(
    r => !(r.length === 1 && r[0].trim() === ''),
  );

  if (table.length === 0) {
    return { rows: [], errors: ['The file is empty.'] };
  }

  const header = table[0].map(h => h.trim().toLowerCase());
  const expected = COLUMNS.map(c => c.toLowerCase());
  if (expected.some((col, idx) => header[idx] !== col)) {
    return {
      rows: [],
      errors: [`Unexpected header. Expected columns: ${COLUMNS.join(', ')}.`],
    };
  }

  const rows: CsvTransaction[] = [];
  const errors: string[] = [];

  table.slice(1).forEach((cells, idx) => {
    const lineNo = idx + 2; // 1-based, and the header occupies line 1
    const [rawDate, rawAmount, rawType, category, description, notes] = cells;

    const occurredAt = Date.parse(rawDate?.trim() ?? '');
    if (Number.isNaN(occurredAt)) {
      errors.push(`Line ${lineNo}: could not read the date "${rawDate ?? ''}".`);
      return;
    }

    const amount = Number((rawAmount ?? '').replace(/[,\s₹]/g, ''));
    if (!(rawAmount ?? '').trim() || Number.isNaN(amount)) {
      errors.push(`Line ${lineNo}: "${rawAmount ?? ''}" is not an amount.`);
      return;
    }

    const type = (rawType ?? '').trim().toLowerCase();
    if (type !== 'expense' && type !== 'income') {
      errors.push(`Line ${lineNo}: type must be expense or income, not "${rawType ?? ''}".`);
      return;
    }

    rows.push({
      occurredAt,
      amountPaise: Math.round(amount * 100),
      type,
      category: (category ?? '').trim(),
      description: description ?? '',
      notes: notes ?? '',
    });
  });

  return { rows, errors };
};
