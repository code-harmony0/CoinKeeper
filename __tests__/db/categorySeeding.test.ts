import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

const migrationSrc = readFileSync(
  join(ROOT, 'src/db/migrations/002_finance.ts'),
  'utf8',
);
const categorySelectorSrc = readFileSync(
  join(ROOT, 'src/components/transaction/CategorySelector.tsx'),
  'utf8',
);

/**
 * DEFAULT_CATEGORIES ids from CategorySelector.tsx, extracted the same
 * source-level way moduleBoundary.test.ts and routeIntegrity.test.ts read
 * real source with fs + regex rather than executing it — op-sqlite is a
 * native JSI module with no Jest-safe way to run the migration against a
 * real DB (see docs/plans/2026-07-29-coinkeeper-finance.md Task 1.3's notes).
 */
const defaultCategoryIds = Array.from(
  categorySelectorSrc.matchAll(/\{\s*id:\s*'([a-z0-9_]+)'/g),
).map(m => m[1]);

/**
 * The migration's transaction-data-processing loop begins with the SELECT
 * that reads the legacy `transactions` table. Seeding must happen strictly
 * before this point in file order, or resolveCategoryId's find-or-create
 * pass runs against legacy rows before the seeded categories exist, creating
 * duplicate categories with different ids instead of reusing the seeded ones.
 */
const migrationLoopIndex = migrationSrc.indexOf(
  "await tx.execute('SELECT * FROM transactions;');",
);

describe('category seeding (002_finance migration)', () => {
  it('finds the default category ids from CategorySelector.tsx (guards against the regex silently breaking)', () => {
    expect(defaultCategoryIds.length).toBeGreaterThan(0);
  });

  it('seeds exactly 8 default categories', () => {
    expect(defaultCategoryIds).toHaveLength(8);
  });

  it('seeds every DEFAULT_CATEGORIES id via an INSERT statement in 002_finance.ts', () => {
    const missing: string[] = [];

    for (const id of defaultCategoryIds) {
      const idPattern = new RegExp(`id:\\s*'${id}'`);
      if (!idPattern.test(migrationSrc)) {
        missing.push(id);
      }
    }

    expect(missing).toEqual([]);
    expect(migrationSrc).toMatch(
      /INSERT OR IGNORE INTO categories \(id, name, icon\) VALUES/,
    );
  });

  it('runs the category seeding before the legacy transactions migration loop', () => {
    const seedInsertIndex = migrationSrc.indexOf(
      'INSERT OR IGNORE INTO categories (id, name, icon) VALUES',
    );

    expect(seedInsertIndex).toBeGreaterThan(-1);
    expect(migrationLoopIndex).toBeGreaterThan(-1);
    expect(seedInsertIndex).toBeLessThan(migrationLoopIndex);
  });
});
