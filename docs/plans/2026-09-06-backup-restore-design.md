# Backup & Restore — Design

**Date:** 2026-09-06
**Status:** Approved, not yet implemented
**Scope:** The lite (public) consumer app only. No chit-fund/pro code is involved.

## Problem

Every transaction, goal, bill and budget lives in one on-device SQLite file and
nowhere else. There is no backup, no export, and no cloud. Losing the phone
loses everything permanently. For an app that deliberately has no server, this
is the largest real user risk in the product.

## The constraint that shapes everything

The database is SQLCipher-encrypted (`op-sqlite` with `"sqlcipher": true`, opened
in `src/db/index.ts`). The key is a machine-generated 256-bit random value held in
Keychain/Keystore under `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`src/db/key.ts`).

Three consequences:

1. The key never leaves the device and is never in an iCloud/Google backup, so a
   raw copy of `coinkeeper.db` is unreadable anywhere else, permanently.
2. The key is machine-generated, so the user cannot be prompted for it at restore.
3. `src/db/index.ts` **deletes and recreates the database** when SQLCipher rejects
   a file. A file-level restore would therefore not merely fail — it would wipe
   the user's data.

**Therefore the backup must be a logical export**: read rows out, serialize, and
re-insert on restore. File-level copy is off the table.

## Format

The backup file is itself a SQLite database, optionally SQLCipher-encrypted with
a passphrase the user chooses.

```
coinkeeper-backup-YYYY-MM-DD.ckbackup
├── backup_meta   format_version, schema_user_version, created_at, row counts
└── one table per backed-up table, rows verbatim
```

Encryption uses SQLCipher directly: the passphrase is passed as the
`encryptionKey`, and SQLCipher performs PBKDF2-HMAC-SHA512 (256,000 iterations)
with a random salt it stores in its own plaintext file header.

An earlier draft derived a raw key with Argon2 and handed that to SQLCipher. That
is broken: the Argon2 salt would have to live inside the encrypted file, so the
key needed to open the file could not be derived without first opening it. Passing
the passphrase straight to SQLCipher avoids the circularity and uses the library
as intended. Argon2 is not used here.

**Detecting encryption needs no flag.** Restore attempts to open the file with no
key; if SQLCipher throws, the file is encrypted and the user is prompted. A wrong
passphrase fails the same way, so both cases share one code path.

## Contents

Included — all live user tables:

`transactions`, `categories`, `goals`, `bills`, `budget_settings`, `preferences`,
`recurring_income`, `subscriptions`, `income_sources`, `income_patterns`,
`income_rules`, `income_allocations`, `income_accounts`, `employer_learning`,
`merchant_learning`, `merchant_aliases`, `merchant_category_map`,
`favorite_merchants`, `recent_merchants`, `quick_templates`, `transaction_drafts`,
`receipt_history`, `kaza_prayers`, `kaza_log`

Excluded, with reasons:

- **Cache/derived tables** (`financial_insights_cache`, `income_predictions`,
  `income_forecasts`, `income_insights_cache`, `income_health_cache`) — regenerable.
- **Dead tables** (`accounts`, `merchants`, `ai_memory`, `ai_conversations`,
  `budget_history`, `goal_predictions`, `subscription_predictions`,
  `cashflow_predictions`, `financial_health`, `prediction_history`) — zero reads
  or writes anywhere in the app.
- **Legacy migration tables** (`transactions_v1_backup`,
  `personal_transactions_v1_backup`, `goals_v1_backup`, `transactions_v3_backup`)
  — stale money data that would bloat the file and could be mistaken for live rows.

`receipt_history` rows are kept but their `image_uri` is set to null: the images
live on disk outside the database, so carrying the paths would restore dangling
references to files that are not in the backup.

## Restore

The user chooses the mode on the restore screen, after a confirmation step that
shows the row counts about to be applied.

- **Replace** — delete the backed-up tables, then insert the backup's rows. The
  result is exactly the backup.
- **Merge** — `INSERT OR IGNORE` only. Purely additive: existing rows always win,
  nothing is overwritten or deleted.

Merge is deliberately additive rather than `INSERT OR REPLACE`. An upsert would
let a stale backup overwrite newer edits and could double-count goal and budget
totals; ignoring conflicts keeps the operation reasoning-friendly and testable.
The known trade-off is that a row the user deleted after taking the backup will
reappear.

Both modes run inside a single transaction, so a mid-restore failure rolls back
and leaves the existing data untouched.

## Version safety

`backup_meta.schema_user_version` is compared against the device's `PRAGMA
user_version`. A backup newer than the running app is refused with a clear
message rather than partially applied. An older backup is accepted; the existing
migration runner closes the gap.

## Surface

A `Backup & Restore` row in Settings, following the existing
`SettingsCard`/`SettingsRow` pattern in `src/components/shared/SettingsRow.tsx`,
and a `BackupRestore` route. The route must be registered:
`__tests__/navigation/routeIntegrity.test.ts` asserts that every
`navigation.navigate` target exists.

- Writing and sharing follow the write-file-then-share pattern already used in
  `src/services/receiptService.ts` (`react-native-fs` + `react-native-share`).
- Restore picks a file with `@react-native-documents/picker`, which is already a
  dependency and currently unused.

## Testing

Test-driven, mocking `getDb` per the pattern in
`__tests__/services/categoryMergeService.test.ts`. `react-native-fs` is already
mocked in `jest.setup.js`.

Cases: round-trip fidelity; replace deletes before inserting; merge never
overwrites an existing row; wrong passphrase is reported, not swallowed; a
too-new `schema_user_version` is refused; `image_uri` is nulled; a mid-restore
failure rolls back.

Jest cannot exercise SQLCipher or the document picker, both of which are native.
A real Android build is required to verify the round-trip end to end.

## Build-time constraint

`scripts/verify-bundle-split.sh` fails the lite bundle if certain pro-only
identifiers appear as strings anywhere in it. The check is a `strings | grep`
over the whole bundle, so those words must not appear in this feature's code,
identifiers, string literals, or comments.

## Decisions taken

| Question | Decision |
|---|---|
| Backup vs export | Round-trip backup and restore |
| File protection | Passphrase, optional |
| Contents | Everything except caches |
| Receipt images | Keep rows, null the `image_uri` |
| Restore semantics | Ask the user: replace or merge |
| Cipher | SQLCipher itself, no new dependency |
