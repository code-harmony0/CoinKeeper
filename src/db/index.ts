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
      let connection = open({ name: 'coinkeeper.db', encryptionKey });

      try {
        await runMigrations(connection);
      } catch (error: any) {
        try { connection.close(); } catch (e) {}

        // "file is not a database" means the key did not match the file — the
        // data is still there, encrypted. This used to delete it and start
        // fresh, so one bad key read cost the user everything. Nothing is
        // destroyed here: say so, and let them retry or reset deliberately.
        if (error.message?.includes('file is not a database')) {
          throw new Error(
            'Your data could not be unlocked with the key on this device. Nothing has been deleted. ' +
              'Close and reopen CoinKeeper, or use Reset in Settings to start over.',
          );
        }
        throw error;
      }

      db = connection;
      return connection;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
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
