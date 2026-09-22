import {
  toCsv,
  parseCsv,
  CSV_HEADER,
  type CsvTransaction,
} from '../../src/services/csv/transactionCsv';

const tx = (over: Partial<CsvTransaction> = {}): CsvTransaction => ({
  occurredAt: new Date('2026-07-14T09:30:00Z').getTime(),
  amountPaise: 125050,
  type: 'expense',
  category: 'Food',
  description: 'Swiggy',
  notes: '',
  ...over,
});

describe('toCsv', () => {
  it('writes a header row even when there are no transactions', () => {
    expect(toCsv([])).toBe(CSV_HEADER);
  });

  it('writes amounts in rupees with two decimals, not paise', () => {
    expect(toCsv([tx()])).toContain('1250.50');
  });

  it('quotes fields containing a comma so columns do not shift', () => {
    const line = toCsv([tx({ description: 'Reliance Fresh, Andheri' })]);

    expect(line).toContain('"Reliance Fresh, Andheri"');
  });

  it('escapes embedded quotes by doubling them', () => {
    const line = toCsv([tx({ description: 'The "Good" Cafe' })]);

    expect(line).toContain('"The ""Good"" Cafe"');
  });

  it('quotes fields containing a newline', () => {
    const line = toCsv([tx({ notes: 'line one\nline two' })]);

    expect(line).toContain('"line one\nline two"');
  });
});

describe('parseCsv', () => {
  it('round-trips a transaction back to the same values', () => {
    const original = tx({ description: 'Reliance Fresh, Andheri', notes: 'weekly "big" shop' });

    const { rows, errors } = parseCsv(toCsv([original]));

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].amountPaise).toBe(original.amountPaise);
    expect(rows[0].description).toBe('Reliance Fresh, Andheri');
    expect(rows[0].notes).toBe('weekly "big" shop');
    expect(rows[0].type).toBe('expense');
  });

  it('round-trips a field containing a newline', () => {
    const { rows, errors } = parseCsv(toCsv([tx({ notes: 'line one\nline two' })]));

    expect(errors).toEqual([]);
    expect(rows[0].notes).toBe('line one\nline two');
  });

  it('reads amounts with thousands separators', () => {
    const csv = `${CSV_HEADER}2026-07-14,"1,250.50",expense,Food,Swiggy,\n`;

    const { rows } = parseCsv(csv);

    expect(rows[0].amountPaise).toBe(125050);
  });

  it('rejects a row whose amount is not a number, naming the line', () => {
    const csv = `${CSV_HEADER}2026-07-14,abc,expense,Food,Swiggy,\n`;

    const { rows, errors } = parseCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors[0]).toContain('2');
  });

  it('rejects a row with an unrecognised type', () => {
    const csv = `${CSV_HEADER}2026-07-14,100.00,transfer,Food,Swiggy,\n`;

    const { rows, errors } = parseCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/type/i);
  });

  it('rejects a row with an unparseable date', () => {
    const csv = `${CSV_HEADER}not-a-date,100.00,expense,Food,Swiggy,\n`;

    const { rows, errors } = parseCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/date/i);
  });

  it('keeps the good rows when only some rows are bad', () => {
    const csv =
      `${CSV_HEADER}` +
      '2026-07-14,100.00,expense,Food,Swiggy,\n' +
      '2026-07-15,oops,expense,Food,Zomato,\n' +
      '2026-07-16,200.00,income,Salary,Acme,\n';

    const { rows, errors } = parseCsv(csv);

    expect(rows).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  it('ignores a trailing blank line', () => {
    const { rows, errors } = parseCsv(`${CSV_HEADER}2026-07-14,100.00,expense,Food,Swiggy,\n\n`);

    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it('reports a file whose header does not match', () => {
    const { errors } = parseCsv('Foo,Bar\n1,2\n');

    expect(errors[0]).toMatch(/header|column/i);
  });

  it('returns nothing for an empty file', () => {
    const { rows, errors } = parseCsv('');

    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
