import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');

/**
 * Migration 002 renamed transactions_v2 -> transactions. The live table has
 * amount_paise / occurred_at / category_id and NO amount, date, or category
 * column. Queries written against the pre-002 names throw "no such column"
 * at runtime — which is how every expense silently became "unknown":
 * TransactionPredictionService.predict() threw, the caller had no try/catch,
 * and the save path fell through to || 'unknown'.
 *
 * op-sqlite is a mocked native module in Jest, so this reads source the same
 * fs + regex way categorySeeding.test.ts and migrations.test.ts do.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

// Migrations legitimately reference the old schema while migrating it.
const files = walk(SRC).filter(f => !f.includes(join('db', 'migrations')));

/** Every quoted/backticked string literal in a source file. */
const STRING_LITERAL = /`[^`]*`|'[^'\n]*'|"[^"\n]*"/g;

/** A literal that actually talks to the transactions table. */
const TOUCHES_TRANSACTIONS = /\b(?:FROM|UPDATE|INTO)\s+transactions\b/i;

/**
 * A pre-002 column used as a real SQL column reference — compared, summed,
 * assigned, or sorted on. Three exclusions keep this precise:
 *   - `(?!_)` so amount_paise / occurred_at / category_id don't match
 *   - `(?<!\bas )` so output aliases (`c.name AS category`) don't match
 *   - `(?<!\.)` so qualified columns on other tables don't match
 */
const LEGACY_COLUMN =
  /(?<!\bas )(?<!\.)\b(amount|date|category)\b(?!_)\s*(?:=|>=|<=|<>|>|<|\)|,|\s+DESC\b|\s+ASC\b)/i;

describe('transactions column drift', () => {
  it('no query outside migrations uses pre-002 transaction columns', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (!TOUCHES_TRANSACTIONS.test(src)) continue;

      for (const literal of src.match(STRING_LITERAL) ?? []) {
        if (!TOUCHES_TRANSACTIONS.test(literal)) continue;
        if (!LEGACY_COLUMN.test(literal)) continue;

        offenders.push(
          `${file.replace(ROOT + '/', '')}: ${literal.replace(/\s+/g, ' ').trim()}`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
