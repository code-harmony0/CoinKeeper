import type { DB } from '@op-engineering/op-sqlite';
import {
  mapLegacyType,
  parseOccurredAt,
  toPaiseFromLegacyAmount,
  normalizeCategoryName,
} from './transform';

const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Schema v2 — corrects 4 defects found in the master spec's §5 schema
 * (see docs/plans/2026-07-29-coinkeeper-finance.md Task 1.3's correction
 * table). Deliberately NOT included here, and flagged rather than guessed:
 *
 * - "chit tables" (spec said always-create, gate only the UI) — contradicts
 *   Phase 7 of the same plan, which keeps the chit-fund system on Firestore,
 *   untouched. Building parallel SQLite chit tables nothing would ever read
 *   is not a reasonable interpretation of either instruction; skipped.
 * - `category_budgets` — only referenced via "drop spent_amount, compute it
 *   instead"; no full column list exists anywhere in the plan. It belongs to
 *   Task 4.1 (50/30/20 budgets, not yet reached) — its schema is defined
 *   there, when the feature that needs it is actually built.
 */
export const migrate002Finance = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    // --- New tables -------------------------------------------------------

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        icon TEXT
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT,
        last_four TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS merchant_category_map (
        merchant TEXT PRIMARY KEY,
        category_id TEXT REFERENCES categories(id),
        updated_at INTEGER NOT NULL
      );
    `);

    // Singleton row (id always 1) — the sum=100 CHECK is the whole point of
    // this table existing; a multi-row budgets table couldn't enforce it.
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS budget_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        needs_percent INTEGER NOT NULL,
        wants_percent INTEGER NOT NULL,
        savings_percent INTEGER NOT NULL,
        CHECK (needs_percent + wants_percent + savings_percent = 100)
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS transactions_v2 (
        id TEXT PRIMARY KEY,
        amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category_id TEXT REFERENCES categories(id),
        account_id TEXT REFERENCES accounts(id),
        description TEXT,
        occurred_at INTEGER NOT NULL,
        payment_method TEXT,
        upi_ref TEXT UNIQUE,
        sms_hash TEXT
      );
    `);

    // --- Seed default categories ------------------------------------------
    // Same 8 categories, ids, and icon names as
    // src/components/transaction/CategorySelector.tsx's DEFAULT_CATEGORIES —
    // the app's actual in-use category list (not the master spec's §5 list,
    // which is never quoted anywhere in this repo). Seeding with these ids
    // BEFORE resolveCategoryId's find-or-create pass below means legacy rows
    // whose `category` name matches one of these (case-insensitively) land on
    // these rows instead of creating duplicate categories with new ids.
    // INSERT OR IGNORE keeps re-running this migration idempotent.

    const DEFAULT_CATEGORIES: Array<{ id: string; name: string; icon: string }> = [
      { id: 'food', name: 'Food', icon: 'food' },
      { id: 'transport', name: 'Transport', icon: 'car' },
      { id: 'shopping', name: 'Shopping', icon: 'shopping' },
      { id: 'entertainment', name: 'Entertainment', icon: 'gamepad-variant' },
      { id: 'bills', name: 'Bills', icon: 'receipt' },
      { id: 'health', name: 'Health', icon: 'medical-bag' },
      { id: 'education', name: 'Education', icon: 'book-open-variant' },
      { id: 'others', name: 'Others', icon: 'dots-horizontal' },
    ];

    for (const category of DEFAULT_CATEGORIES) {
      await tx.execute('INSERT OR IGNORE INTO categories (id, name, icon) VALUES (?, ?, ?);', [
        category.id,
        category.name,
        category.icon,
      ]);
    }

    // --- Category resolution (find-or-create, case-insensitive) ----------

    const categoryIdCache = new Map<string, string>();

    const resolveCategoryId = async (rawName: string | null | undefined): Promise<string> => {
      const name = normalizeCategoryName(rawName);
      const key = name.toLowerCase();
      const cached = categoryIdCache.get(key);
      if (cached) return cached;

      const existing = await tx.execute(
        'SELECT id FROM categories WHERE lower(name) = ? LIMIT 1;',
        [key],
      );
      const existingRow = existing.rows?.[0] as { id?: string } | undefined;
      if (existingRow?.id) {
        categoryIdCache.set(key, existingRow.id);
        return existingRow.id;
      }

      const id = generateId();
      await tx.execute('INSERT INTO categories (id, name) VALUES (?, ?);', [id, name]);
      categoryIdCache.set(key, id);
      return id;
    };

    // --- Migrate live data: transactions (old shape) ----------------------
    // account_id is left null for migrated rows — the old `transactions`
    // table never captured an account reference, so there is nothing to
    // link. Only new transactions entered post-migration can populate it.

    let skippedInvalidAmount = 0;
    let skippedInvalidDate = 0;

    const oldTx = await tx.execute('SELECT * FROM transactions;');
    for (const row of (oldTx.rows ?? []) as any[]) {
      const amountPaise = toPaiseFromLegacyAmount(row.amount);
      const occurredAt = parseOccurredAt(row.date);

      if (amountPaise === null) {
        skippedInvalidAmount++;
        continue;
      }
      if (occurredAt === null) {
        skippedInvalidDate++;
        continue;
      }

      const categoryId = await resolveCategoryId(row.category);

      await tx.execute(
        `INSERT INTO transactions_v2
           (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL);`,
        [
          row.id,
          amountPaise,
          mapLegacyType(row.type),
          categoryId,
          row.description ?? null,
          occurredAt,
          row.paymentMethod ?? null,
        ],
      );
    }

    // --- Migrate live data: personal_transactions (merge in) --------------
    // Legacy rows used `merchant` where the new schema uses `description`.
    // originalSms is preserved into sms_hash verbatim (not actually hashed)
    // only as a non-unique breadcrumb — Task 5.3 defines the real hash.

    const oldPersonal = await tx.execute('SELECT * FROM personal_transactions;');
    for (const row of (oldPersonal.rows ?? []) as any[]) {
      const amountPaise = toPaiseFromLegacyAmount(row.amount);
      const occurredAt = parseOccurredAt(row.date);

      if (amountPaise === null) {
        skippedInvalidAmount++;
        continue;
      }
      if (occurredAt === null) {
        skippedInvalidDate++;
        continue;
      }

      const categoryId = await resolveCategoryId(row.category);

      await tx.execute(
        `INSERT INTO transactions_v2
           (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
         VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?);`,
        [
          row.id,
          amountPaise,
          mapLegacyType(row.type),
          categoryId,
          row.merchant ?? row.notes ?? null,
          occurredAt,
          row.originalSms ?? null,
        ],
      );
    }

    if (skippedInvalidAmount > 0 || skippedInvalidDate > 0) {
      console.warn(
        `[migration 002] Skipped ${skippedInvalidAmount} row(s) with an invalid amount and ` +
          `${skippedInvalidDate} row(s) with an unparseable date. These remain in the renamed ` +
          'backup tables below, untouched, for manual recovery.',
      );
    }

    // --- Swap tables: keep the old data as a backup, never delete it ------
    // Money data. A migration bug here must be recoverable, not silently
    // destructive — rename, don't drop.

    await tx.execute('ALTER TABLE transactions RENAME TO transactions_v1_backup;');
    await tx.execute('ALTER TABLE personal_transactions RENAME TO personal_transactions_v1_backup;');
    await tx.execute('ALTER TABLE transactions_v2 RENAME TO transactions;');
  });
};
