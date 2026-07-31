import { open, type DB } from '@op-engineering/op-sqlite';
import { getOrCreateEncryptionKey } from './key';

let db: DB | null = null;

/**
 * Opens the encrypted database and caches the connection. Must be awaited
 * once before any getDb() call — the encryption key comes from the Keychain,
 * an async native-bridge call, so this cannot be folded into a synchronous
 * getDb(). Safe to call more than once; later calls resolve to the same
 * connection without re-touching the Keychain.
 */
export const initEncryptedDb = async (): Promise<DB> => {
  if (db) {
    return db;
  }
  const encryptionKey = await getOrCreateEncryptionKey();
  db = open({ name: 'coinkeeper.db', encryptionKey });
  return db;
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
