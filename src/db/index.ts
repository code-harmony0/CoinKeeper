import { open, type DB } from '@op-engineering/op-sqlite';
import { getOrCreateEncryptionKey } from './key';
import { runMigrations } from './migrations';

let db: DB | null = null;
let initPromise: Promise<DB> | null = null;

/**
 * Opens the encrypted database, runs any pending migrations, and caches the
 * connection. Must be awaited once before any getDb() call — the encryption
 * key comes from the Keychain, an async native-bridge call, so this cannot
 * be folded into a synchronous getDb(). Safe to call more than once
 * concurrently; later calls await the same in-flight promise rather than
 * opening a second connection or re-running migrations.
 */
export const initEncryptedDb = async (): Promise<DB> => {
  if (db) {
    return db;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const encryptionKey = await getOrCreateEncryptionKey();
      const connection = open({ name: 'coinkeeper.db', encryptionKey });
      await runMigrations(connection);
      db = connection;
      return connection;
    })();
  }
  return initPromise;
};

/**
 * Synchronous accessor for call sites that assume a DB handle is already
 * available (the existing pattern throughout src/store, src/services).
 * Throws if called before initEncryptedDb() has resolved — callers must
 * await initialization once at app startup (see TransactionsContext).
 */
export const getDb = (): DB => {
  if (!db) {
    throw new Error('Database not initialized — call initEncryptedDb() before getDb().');
  }
  return db;
};
