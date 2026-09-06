# Backup & Restore Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let a user export every piece of their financial data to a single optionally-encrypted file, and restore it onto another device.

**Architecture:** A logical export, not a file copy. `backupService.ts` reads rows out of the live SQLCipher database via `getDb()`, writes them into a *second* SQLite database opened with `open({ name, location, encryptionKey })`, and shares that file. Restore opens the picked file, validates its schema version, and re-inserts rows in either replace or merge mode inside one transaction.

**Tech Stack:** `@op-engineering/op-sqlite` (SQLCipher already compiled in), `react-native-fs`, `react-native-share`, `@react-native-documents/picker`, Jest + `@testing-library/react-native`.

**Design doc:** `docs/plans/2026-09-06-backup-restore-design.md`

**Read before starting:**
- `src/db/index.ts` — how the live DB is opened; note the wipe-on-corrupt path at lines 30-39
- `src/db/key.ts` — why the live key cannot be exported
- `__tests__/services/categoryMergeService.test.ts` — the `getDb` mocking pattern to copy
- `jest.setup.js` — `react-native-fs` and `@op-engineering/op-sqlite` are already mocked

**Two constraints that will bite you:**
1. `scripts/verify-bundle-split.sh` runs `strings | grep -ic` over the lite bundle for pro-only identifiers. Do not put those words in any identifier, string literal, or comment in this feature.
2. `__tests__/db/transactionColumnDrift.test.ts` scans every file for SQL against `transactions`. Use `amount_paise`, `occurred_at`, `category_id` — never `amount`, `date`, `category`.

---

### Task 1: The table manifest

**Files:**
- Create: `src/services/backup/backupTables.ts`
- Test: `__tests__/services/backup/backupTables.test.ts`

**Step 1: Write the failing test**

```ts
import { BACKUP_TABLES, EXCLUDED_TABLES } from '../../../src/services/backup/backupTables';

describe('backup table manifest', () => {
  it('includes the tables holding real user money data', () => {
    for (const t of ['transactions', 'categories', 'goals', 'bills', 'budget_settings']) {
      expect(BACKUP_TABLES).toContain(t);
    }
  });

  it('excludes regenerable caches', () => {
    for (const t of ['financial_insights_cache', 'income_health_cache']) {
      expect(BACKUP_TABLES).not.toContain(t);
      expect(EXCLUDED_TABLES).toContain(t);
    }
  });

  it('excludes legacy migration tables holding stale money data', () => {
    for (const t of ['transactions_v1_backup', 'goals_v1_backup', 'transactions_v3_backup']) {
      expect(BACKUP_TABLES).not.toContain(t);
    }
  });

  it('excludes tables nothing reads or writes', () => {
    for (const t of ['accounts', 'merchants', 'ai_memory', 'budget_history']) {
      expect(BACKUP_TABLES).not.toContain(t);
    }
  });

  it('lists no table twice', () => {
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/backup/backupTables.test.ts`
Expected: FAIL — `Cannot find module '.../backupTables'`

**Step 3: Write minimal implementation**

```ts
/**
 * Tables carried in a backup. Kept as an explicit list rather than reading
 * sqlite_master: a new table should be a deliberate decision to back up, not
 * something that silently joins because a migration created it.
 */
export const BACKUP_TABLES: readonly string[] = [
  'transactions',
  'categories',
  'goals',
  'bills',
  'budget_settings',
  'preferences',
  'recurring_income',
  'subscriptions',
  'income_sources',
  'income_patterns',
  'income_rules',
  'income_allocations',
  'income_accounts',
  'employer_learning',
  'merchant_learning',
  'merchant_aliases',
  'merchant_category_map',
  'favorite_merchants',
  'recent_merchants',
  'quick_templates',
  'transaction_drafts',
  'receipt_history',
  'kaza_prayers',
  'kaza_log',
];

/** Documented so a future reader knows these were considered and rejected. */
export const EXCLUDED_TABLES: readonly string[] = [
  // Regenerable from the rows above.
  'financial_insights_cache',
  'income_predictions',
  'income_forecasts',
  'income_insights_cache',
  'income_health_cache',
  // Zero reads or writes anywhere in the app.
  'accounts',
  'merchants',
  'ai_memory',
  'ai_conversations',
  'budget_history',
  'goal_predictions',
  'subscription_predictions',
  'cashflow_predictions',
  'financial_health',
  'prediction_history',
  // Stale copies left by migrations; restoring them would resurrect old money.
  'transactions_v1_backup',
  'personal_transactions_v1_backup',
  'goals_v1_backup',
  'transactions_v3_backup',
];

/** Columns blanked on export because they point at files outside the database. */
export const NULLED_COLUMNS: Record<string, string[]> = {
  receipt_history: ['image_uri'],
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/backup/backupTables.test.ts`
Expected: PASS, 5 tests

**Step 5: Commit**

```bash
git add src/services/backup/backupTables.ts __tests__/services/backup/backupTables.test.ts
git commit -m "feat: declare which tables a backup carries"
```

---

### Task 2: Read rows out of the live database

**Files:**
- Create: `src/services/backup/collectRows.ts`
- Test: `__tests__/services/backup/collectRows.test.ts`

**Step 1: Write the failing test**

```ts
const mockExecute = jest.fn();
jest.mock('../../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

import { collectRows } from '../../../src/services/backup/collectRows';

describe('collectRows', () => {
  beforeEach(() => mockExecute.mockReset());

  it('reads every requested table', async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    await collectRows(['categories', 'goals']);
    const sql = mockExecute.mock.calls.map(c => c[0]).join(' ');
    expect(sql).toContain('FROM categories');
    expect(sql).toContain('FROM goals');
  });

  it('blanks columns that point at files outside the database', async () => {
    mockExecute.mockResolvedValue({
      rows: [{ id: 'r1', image_uri: '/data/user/0/img.jpg', total_paise: 500 }],
    });
    const out = await collectRows(['receipt_history']);
    expect(out.receipt_history[0].image_uri).toBeNull();
    expect(out.receipt_history[0].total_paise).toBe(500);
  });

  it('treats a missing table as empty rather than failing the whole backup', async () => {
    mockExecute.mockRejectedValueOnce(new Error('no such table: quick_templates'));
    const out = await collectRows(['quick_templates']);
    expect(out.quick_templates).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/backup/collectRows.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
import { getDb } from '../../store/database';
import { NULLED_COLUMNS } from './backupTables';

export type BackupRow = Record<string, unknown>;
export type CollectedRows = Record<string, BackupRow[]>;

/**
 * A table absent on this device (an older install that never ran a later
 * migration) yields an empty array. One missing table must not cost the user
 * their entire backup.
 */
export const collectRows = async (tables: readonly string[]): Promise<CollectedRows> => {
  const out: CollectedRows = {};

  for (const table of tables) {
    try {
      const result = await getDb().execute(`SELECT * FROM ${table};`);
      const rows = (result?.rows ?? []) as BackupRow[];
      const blanked = NULLED_COLUMNS[table] ?? [];

      out[table] = blanked.length
        ? rows.map(row => {
            const copy = { ...row };
            for (const column of blanked) {
              copy[column] = null;
            }
            return copy;
          })
        : rows;
    } catch (error) {
      console.warn(`[backup] skipping ${table}:`, error);
      out[table] = [];
    }
  }

  return out;
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/backup/collectRows.test.ts`
Expected: PASS, 3 tests

**Step 5: Commit**

```bash
git add src/services/backup/collectRows.ts __tests__/services/backup/collectRows.test.ts
git commit -m "feat: read backup rows out of the live database"
```

---

### Task 3: Write the backup file

**Files:**
- Create: `src/services/backup/writeBackup.ts`
- Test: `__tests__/services/backup/writeBackup.test.ts`

The backup is a second SQLite database. `open()` takes the passphrase directly as
`encryptionKey`; SQLCipher does the key derivation and stores its salt in the file
header. Passing `undefined` produces an unencrypted file.

**Step 1: Write the failing test**

```ts
const mockBackupExecute = jest.fn();
const mockClose = jest.fn();
const mockOpen = jest.fn(() => ({ execute: mockBackupExecute, close: mockClose }));

jest.mock('@op-engineering/op-sqlite', () => ({ open: mockOpen }));

import { writeBackup, BACKUP_FORMAT_VERSION } from '../../../src/services/backup/writeBackup';

describe('writeBackup', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    mockBackupExecute.mockReset().mockResolvedValue({ rows: [] });
    mockClose.mockClear();
  });

  const rows = { categories: [{ id: 'c1', name: 'Food' }] };

  it('passes the passphrase to SQLCipher as the encryption key', async () => {
    await writeBackup({ rows, schemaVersion: 16, path: '/tmp', passphrase: 'hunter2' });
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ encryptionKey: 'hunter2' }),
    );
  });

  it('writes an unencrypted file when no passphrase is given', async () => {
    await writeBackup({ rows, schemaVersion: 16, path: '/tmp' });
    expect(mockOpen.mock.calls[0][0].encryptionKey).toBeUndefined();
  });

  it('records the schema version so restore can refuse a newer file', async () => {
    await writeBackup({ rows, schemaVersion: 16, path: '/tmp' });
    const sql = mockBackupExecute.mock.calls.map(c => c[0]).join(' ');
    expect(sql).toContain('backup_meta');
    const params = mockBackupExecute.mock.calls.flatMap(c => c[1] ?? []);
    expect(params).toContain(16);
    expect(params).toContain(BACKUP_FORMAT_VERSION);
  });

  it('closes the file even when writing throws', async () => {
    mockBackupExecute.mockRejectedValue(new Error('disk full'));
    await expect(
      writeBackup({ rows, schemaVersion: 16, path: '/tmp' }),
    ).rejects.toThrow('disk full');
    expect(mockClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/backup/writeBackup.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
import { open } from '@op-engineering/op-sqlite';
import type { CollectedRows } from './collectRows';

export const BACKUP_FORMAT_VERSION = 1;

interface WriteBackupOptions {
  rows: CollectedRows;
  schemaVersion: number;
  path: string;
  fileName?: string;
  passphrase?: string;
}

/**
 * The backup is itself a SQLite database. The passphrase goes straight to
 * SQLCipher, which derives the key and stores its own salt in the file header —
 * so the file is openable with nothing but the passphrase. Deriving a key
 * ourselves would strand the salt inside the file it is needed to open.
 */
export const writeBackup = async ({
  rows,
  schemaVersion,
  path,
  fileName = 'coinkeeper-backup.ckbackup',
  passphrase,
}: WriteBackupOptions): Promise<string> => {
  const file = open({ name: fileName, location: path, encryptionKey: passphrase });

  try {
    await file.execute(
      `CREATE TABLE IF NOT EXISTS backup_meta (
         format_version INTEGER NOT NULL,
         schema_user_version INTEGER NOT NULL,
         created_at INTEGER NOT NULL
       );`,
    );
    await file.execute(
      'INSERT INTO backup_meta (format_version, schema_user_version, created_at) VALUES (?, ?, ?);',
      [BACKUP_FORMAT_VERSION, schemaVersion, Date.now()],
    );

    for (const [table, tableRows] of Object.entries(rows)) {
      if (tableRows.length === 0) continue;

      const columns = Object.keys(tableRows[0]);
      const quoted = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');

      await file.execute(
        `CREATE TABLE IF NOT EXISTS ${table} (${columns.join(', ')});`,
      );
      for (const row of tableRows) {
        await file.execute(
          `INSERT INTO ${table} (${quoted}) VALUES (${placeholders});`,
          columns.map(c => row[c] ?? null),
        );
      }
    }

    return `${path}/${fileName}`;
  } finally {
    try {
      file.close();
    } catch {
      // Closing a handle we are abandoning anyway must not mask the real error.
    }
  }
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/backup/writeBackup.test.ts`
Expected: PASS, 4 tests

**Step 5: Commit**

```bash
git add src/services/backup/writeBackup.ts __tests__/services/backup/writeBackup.test.ts
git commit -m "feat: write a backup as an optionally encrypted database"
```

---

### Task 4: Open a backup file and detect encryption

**Files:**
- Create: `src/services/backup/readBackup.ts`
- Test: `__tests__/services/backup/readBackup.test.ts`

**Step 1: Write the failing test**

```ts
const mockOpen = jest.fn();
jest.mock('@op-engineering/op-sqlite', () => ({ open: mockOpen }));

import {
  readBackup,
  BackupEncryptedError,
  BackupTooNewError,
} from '../../../src/services/backup/readBackup';

const fileWith = (meta: any, tables: Record<string, any[]> = {}) => ({
  execute: jest.fn(async (sql: string) => {
    if (sql.includes('backup_meta')) return { rows: meta ? [meta] : [] };
    const match = sql.match(/FROM (\w+)/);
    return { rows: match ? tables[match[1]] ?? [] : [] };
  }),
  close: jest.fn(),
});

describe('readBackup', () => {
  beforeEach(() => mockOpen.mockReset());

  it('asks for a passphrase when the file will not open unencrypted', async () => {
    mockOpen.mockImplementation(() => { throw new Error('file is not a database'); });
    await expect(readBackup('/tmp/b.ckbackup')).rejects.toBeInstanceOf(BackupEncryptedError);
  });

  it('reports a wrong passphrase rather than swallowing it', async () => {
    mockOpen.mockImplementation(() => { throw new Error('file is not a database'); });
    await expect(readBackup('/tmp/b.ckbackup', 'wrong')).rejects.toBeInstanceOf(BackupEncryptedError);
  });

  it('refuses a backup newer than this app understands', async () => {
    mockOpen.mockReturnValue(
      fileWith({ format_version: 1, schema_user_version: 999, created_at: 1 }),
    );
    await expect(readBackup('/tmp/b.ckbackup')).rejects.toBeInstanceOf(BackupTooNewError);
  });

  it('returns rows from an older backup', async () => {
    mockOpen.mockReturnValue(
      fileWith(
        { format_version: 1, schema_user_version: 2, created_at: 1 },
        { categories: [{ id: 'c1', name: 'Food' }] },
      ),
    );
    const result = await readBackup('/tmp/b.ckbackup');
    expect(result.rows.categories).toHaveLength(1);
    expect(result.meta.schema_user_version).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/backup/readBackup.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
import { open } from '@op-engineering/op-sqlite';
import { BACKUP_TABLES } from './backupTables';
import type { CollectedRows } from './collectRows';

/** The device schema version this build understands. Bump with migrations. */
export const CURRENT_SCHEMA_VERSION = 16;

export class BackupEncryptedError extends Error {
  constructor() {
    super('This backup is protected. Enter the passphrase used when it was created.');
  }
}

export class BackupTooNewError extends Error {
  constructor(found: number) {
    super(
      `This backup was made by a newer version of CoinKeeper (v${found}). Update the app, then restore.`,
    );
  }
}

export interface BackupMeta {
  format_version: number;
  schema_user_version: number;
  created_at: number;
}

export const readBackup = async (
  path: string,
  passphrase?: string,
): Promise<{ meta: BackupMeta; rows: CollectedRows }> => {
  const separator = path.lastIndexOf('/');
  const location = path.slice(0, separator);
  const name = path.slice(separator + 1);

  let file;
  try {
    file = open({ name, location, encryptionKey: passphrase });
  } catch {
    // SQLCipher cannot distinguish "encrypted" from "wrong key" — both surface
    // as an unreadable file, and both are answered by asking for the passphrase.
    throw new BackupEncryptedError();
  }

  try {
    const metaResult = await file.execute('SELECT * FROM backup_meta LIMIT 1;');
    const meta = metaResult?.rows?.[0] as BackupMeta | undefined;
    if (!meta) throw new BackupEncryptedError();

    if (meta.schema_user_version > CURRENT_SCHEMA_VERSION) {
      throw new BackupTooNewError(meta.schema_user_version);
    }

    const rows: CollectedRows = {};
    for (const table of BACKUP_TABLES) {
      try {
        const result = await file.execute(`SELECT * FROM ${table};`);
        rows[table] = (result?.rows ?? []) as CollectedRows[string];
      } catch {
        rows[table] = [];
      }
    }

    return { meta, rows };
  } finally {
    try {
      file.close();
    } catch {
      // Nothing useful to do; the real error must survive.
    }
  }
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/backup/readBackup.test.ts`
Expected: PASS, 4 tests

**Step 5: Commit**

```bash
git add src/services/backup/readBackup.ts __tests__/services/backup/readBackup.test.ts
git commit -m "feat: open a backup file and refuse ones this build cannot read"
```

---

### Task 5: Restore, both modes

**Files:**
- Create: `src/services/backup/restoreBackup.ts`
- Test: `__tests__/services/backup/restoreBackup.test.ts`

Merge is `INSERT OR IGNORE`, never `INSERT OR REPLACE`. An upsert would let a
stale backup overwrite newer edits and double-count goal totals.

**Step 1: Write the failing test**

```ts
const mockExecute = jest.fn();
const mockTransaction = jest.fn(async (fn: any) => fn({ execute: mockExecute }));
jest.mock('../../../src/store/database', () => ({
  getDb: () => ({ execute: mockExecute, transaction: mockTransaction }),
}));

import { restoreBackup } from '../../../src/services/backup/restoreBackup';

const rows = { categories: [{ id: 'c1', name: 'Food' }] };

describe('restoreBackup', () => {
  beforeEach(() => {
    mockExecute.mockReset().mockResolvedValue({ rows: [] });
    mockTransaction.mockClear();
  });

  it('replace mode clears a table before inserting into it', async () => {
    await restoreBackup(rows, 'replace');
    const sql = mockExecute.mock.calls.map(c => c[0]);
    const deleted = sql.findIndex(s => s.includes('DELETE FROM categories'));
    const inserted = sql.findIndex(s => s.includes('INSERT') && s.includes('categories'));
    expect(deleted).toBeGreaterThanOrEqual(0);
    expect(inserted).toBeGreaterThan(deleted);
  });

  it('merge mode never deletes and never overwrites', async () => {
    await restoreBackup(rows, 'merge');
    const sql = mockExecute.mock.calls.map(c => c[0]).join(' ');
    expect(sql).not.toContain('DELETE');
    expect(sql).not.toContain('INSERT OR REPLACE');
    expect(sql).toContain('INSERT OR IGNORE');
  });

  it('runs inside a single transaction so a failure rolls back', async () => {
    await restoreBackup(rows, 'replace');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('propagates a mid-restore failure instead of reporting success', async () => {
    mockExecute.mockRejectedValueOnce(new Error('constraint failed'));
    await expect(restoreBackup(rows, 'replace')).rejects.toThrow('constraint failed');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/backup/restoreBackup.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
import { getDb } from '../../store/database';
import { BACKUP_TABLES } from './backupTables';
import type { CollectedRows } from './collectRows';

export type RestoreMode = 'replace' | 'merge';

/**
 * One transaction for the whole restore: a failure part-way through must leave
 * the user exactly as they were, never half-overwritten.
 *
 * Merge inserts with OR IGNORE so existing rows always win. An upsert would let
 * an old backup silently overwrite newer edits and double-count goal totals.
 */
export const restoreBackup = async (
  rows: CollectedRows,
  mode: RestoreMode,
): Promise<void> => {
  await getDb().transaction(async tx => {
    for (const table of BACKUP_TABLES) {
      const tableRows = rows[table];
      if (!tableRows?.length) continue;

      if (mode === 'replace') {
        await tx.execute(`DELETE FROM ${table};`);
      }

      const verb = mode === 'replace' ? 'INSERT' : 'INSERT OR IGNORE';
      const columns = Object.keys(tableRows[0]);
      const placeholders = columns.map(() => '?').join(', ');

      for (const row of tableRows) {
        await tx.execute(
          `${verb} INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`,
          columns.map(c => row[c] ?? null),
        );
      }
    }
  });
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/backup/restoreBackup.test.ts`
Expected: PASS, 4 tests

**Step 5: Commit**

```bash
git add src/services/backup/restoreBackup.ts __tests__/services/backup/restoreBackup.test.ts
git commit -m "feat: restore a backup in replace or additive merge mode"
```

---

### Task 6: The public service entry point

**Files:**
- Create: `src/services/backup/index.ts`
- Test: `__tests__/services/backup/createAndShare.test.ts`

Wires collect → write → share, using the write-file-then-share pattern from
`src/services/receiptService.ts`. Reads the live `PRAGMA user_version` so the
recorded schema version is the device's truth, not a hardcoded guess.

**Step 1: Write the failing test**

```ts
const mockExecute = jest.fn();
jest.mock('../../../src/store/database', () => ({ getDb: () => ({ execute: mockExecute }) }));

const mockWriteBackup = jest.fn(async () => '/tmp/b.ckbackup');
jest.mock('../../../src/services/backup/writeBackup', () => ({
  writeBackup: mockWriteBackup,
  BACKUP_FORMAT_VERSION: 1,
}));

const mockShareOpen = jest.fn(async () => ({ success: true }));
jest.mock('react-native-share', () => ({ default: { open: mockShareOpen } }));

import { createAndShareBackup } from '../../../src/services/backup';

describe('createAndShareBackup', () => {
  beforeEach(() => {
    mockExecute.mockReset().mockResolvedValue({ rows: [{ user_version: 16 }] });
    mockWriteBackup.mockClear();
    mockShareOpen.mockClear();
  });

  it('records the device schema version, not a hardcoded one', async () => {
    await createAndShareBackup();
    expect(mockWriteBackup).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 16 }),
    );
  });

  it('shares the file it just wrote', async () => {
    await createAndShareBackup();
    expect(mockShareOpen).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///tmp/b.ckbackup' }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/backup/createAndShare.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```ts
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { getDb } from '../../store/database';
import { BACKUP_TABLES } from './backupTables';
import { collectRows } from './collectRows';
import { writeBackup } from './writeBackup';

export * from './backupTables';
export * from './collectRows';
export * from './readBackup';
export * from './restoreBackup';
export * from './writeBackup';

const backupFileName = (): string => {
  const today = new Date().toISOString().slice(0, 10);
  return `coinkeeper-backup-${today}.ckbackup`;
};

const readSchemaVersion = async (): Promise<number> => {
  const result = await getDb().execute('PRAGMA user_version;');
  const row = result?.rows?.[0] as Record<string, number> | undefined;
  return row ? Object.values(row)[0] ?? 0 : 0;
};

export const createAndShareBackup = async (passphrase?: string): Promise<void> => {
  const [rows, schemaVersion] = await Promise.all([
    collectRows(BACKUP_TABLES),
    readSchemaVersion(),
  ]);

  const path = await writeBackup({
    rows,
    schemaVersion,
    path: RNFS.DocumentDirectoryPath,
    fileName: backupFileName(),
    passphrase,
  });

  await Share.open({ url: `file://${path}`, failOnCancel: false });
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/backup/createAndShare.test.ts`
Expected: PASS, 2 tests

**Step 5: Commit**

```bash
git add src/services/backup/index.ts __tests__/services/backup/createAndShare.test.ts
git commit -m "feat: create and share a backup file"
```

---

### Task 7: The Backup & Restore screen

**Files:**
- Create: `src/screens/user/BackupRestoreScreen.tsx`
- Test: `__tests__/screens/BackupRestoreScreen.test.tsx`

Follow the visual conventions in `src/screens/user/BillsScreen.tsx` — `useSpecTheme()`,
`PressableScale`, `Animated.View entering={FadeInDown.springify()}`. Do not introduce
new design tokens.

Required behaviour:
- A **Back up now** action with an optional passphrase field. When a passphrase is
  typed it must be confirmed, and the screen must state plainly that a forgotten
  passphrase makes the backup unrecoverable.
- A **Restore** action that picks a file with `@react-native-documents/picker`,
  prompts for a passphrase if `BackupEncryptedError` is thrown, then shows a
  confirmation with per-table row counts and the two mode choices.
- Replace must warn that current data will be overwritten before it proceeds.

**Step 1: Write the failing test**

```tsx
it('warns that a forgotten passphrase cannot be recovered', () => {
  const { getByText } = render(<BackupRestoreScreen navigation={{ goBack: jest.fn() }} />);
  fireEvent.press(getByText('Protect with a passphrase'));
  expect(getByText(/cannot be recovered|cannot restore/i)).toBeTruthy();
});

it('requires confirmation before replacing existing data', async () => {
  // pick a file, choose Replace, assert the confirm step renders before restoreBackup runs
});
```

**Step 2-5:** Standard cycle. Run `npx jest __tests__/screens/BackupRestoreScreen.test.tsx`, implement, verify, commit.

```bash
git commit -m "feat: add the Backup and Restore screen"
```

---

### Task 8: Reach the screen from Settings

**Files:**
- Modify: `src/screens/user/SettingsScreen.tsx` (after the "Savings Goals" row, ~line 308)
- Modify: `src/navigation/RootNavigator.tsx` (register the `BackupRestore` route)
- Test: `__tests__/navigation/routeIntegrity.test.ts` already covers this

**Step 1:** Add the row, matching the existing pattern exactly:

```tsx
<SettingsDivider />
<SettingsRow
  icon={DatabaseBackup}
  tint="indigo"
  label="Backup & Restore"
  description="Save your data, or bring it back on a new phone"
  onPress={() => navigation.navigate('BackupRestore')}
/>
```

**Step 2:** Register the route in `RootNavigator.tsx` beside the other root screens.

**Step 3:** Run `npx jest __tests__/navigation/routeIntegrity.test.ts` — it fails if the
target is not registered.

**Step 4:** Commit.

```bash
git commit -m "feat: reach Backup and Restore from Settings"
```

---

### Task 9: Full verification

**Step 1:** `npx tsc --noEmit` — expect no errors.

**Step 2:** `npx jest` — expect all new suites green. Two suites
(`__tests__/App.test.tsx`, `__tests__/screens/TransactionsScreen.test.tsx`) fail
before this work starts; they must not get worse.

**Step 3:** `npm run verify:split` — expect a pass. If it fails, a forbidden
identifier reached the lite bundle.

**Step 4: Verify on a real Android device.** Jest mocks SQLCipher and the document
picker, so the round-trip has never actually run. Ask before building.

```bash
npx react-native run-android
```

Then, by hand:
1. Back up with no passphrase; confirm the file appears in the share sheet.
2. Back up with a passphrase.
3. Restore the encrypted file with the wrong passphrase — expect the prompt again, not a crash.
4. Restore it with the right passphrase in **merge** mode — confirm nothing existing is lost.
5. Restore in **replace** mode — confirm the data matches the backup exactly.
6. Confirm the app still opens afterwards, i.e. the live database was never corrupted.

**Step 5:** Commit any fixes the device run surfaces.
