/**
 * Distributed Lock Utility
 * Firestore-based locking for preventing concurrent operations
 */

import * as admin from 'firebase-admin';

const LOCKS_COLLECTION = 'distributedLocks';
const DEFAULT_LOCK_TIMEOUT_MS = 60000; // 1 minute
const DEFAULT_ACQUIRE_TIMEOUT_MS = 10000; // 10 seconds

export interface LockOptions {
  lockTimeoutMs?: number;
  acquireTimeoutMs?: number;
  ownerId?: string;
}

export interface Lock {
  key: string;
  ownerId: string;
  acquiredAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
}

/**
 * Generate a unique owner ID for lock acquisition
 */
export const generateLockOwnerId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Acquire a distributed lock
 * Returns true if lock acquired, false if timeout
 */
export const acquireLock = async (
  lockKey: string,
  options: LockOptions = {}
): Promise<{ acquired: boolean; ownerId: string }> => {
  const db = admin.firestore();
  const lockRef = db.collection(LOCKS_COLLECTION).doc(lockKey);

  const lockTimeout = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  const acquireTimeout = options.acquireTimeoutMs ?? DEFAULT_ACQUIRE_TIMEOUT_MS;
  const ownerId = options.ownerId ?? generateLockOwnerId();

  const startTime = Date.now();

  while (Date.now() - startTime < acquireTimeout) {
    try {
      const acquired = await db.runTransaction(async transaction => {
        const lockDoc = await transaction.get(lockRef);
        const now = admin.firestore.Timestamp.now();

        if (lockDoc.exists) {
          const lockData = lockDoc.data() as Lock;

          // Check if lock is expired
          if (lockData.expiresAt.toMillis() > now.toMillis()) {
            // Lock is still held by another process
            return false;
          }
        }

        // Acquire the lock
        const expiresAt = admin.firestore.Timestamp.fromMillis(
          now.toMillis() + lockTimeout
        );

        transaction.set(lockRef, {
          key: lockKey,
          ownerId,
          acquiredAt: now,
          expiresAt,
        });

        return true;
      });

      if (acquired) {
        return { acquired: true, ownerId };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Transaction failed, retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { acquired: false, ownerId };
};

/**
 * Release a distributed lock
 */
export const releaseLock = async (
  lockKey: string,
  ownerId: string
): Promise<boolean> => {
  const db = admin.firestore();
  const lockRef = db.collection(LOCKS_COLLECTION).doc(lockKey);

  try {
    return await db.runTransaction(async transaction => {
      const lockDoc = await transaction.get(lockRef);

      if (!lockDoc.exists) {
        return true; // Lock doesn't exist, consider it released
      }

      const lockData = lockDoc.data() as Lock;

      // Only release if we own it
      if (lockData.ownerId !== ownerId) {
        return false;
      }

      transaction.delete(lockRef);
      return true;
    });
  } catch (error) {
    console.error('[distributedLock] Error releasing lock:', error);
    return false;
  }
};

/**
 * Extend lock timeout
 */
export const extendLock = async (
  lockKey: string,
  ownerId: string,
  extensionMs: number = DEFAULT_LOCK_TIMEOUT_MS
): Promise<boolean> => {
  const db = admin.firestore();
  const lockRef = db.collection(LOCKS_COLLECTION).doc(lockKey);

  try {
    return await db.runTransaction(async transaction => {
      const lockDoc = await transaction.get(lockRef);

      if (!lockDoc.exists) {
        return false;
      }

      const lockData = lockDoc.data() as Lock;

      if (lockData.ownerId !== ownerId) {
        return false;
      }

      const now = admin.firestore.Timestamp.now();
      const newExpiresAt = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + extensionMs
      );

      transaction.update(lockRef, { expiresAt: newExpiresAt });
      return true;
    });
  } catch (error) {
    console.error('[distributedLock] Error extending lock:', error);
    return false;
  }
};

/**
 * Execute operation with lock
 * Automatically acquires and releases lock
 */
export const withLock = async <T>(
  lockKey: string,
  operation: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> => {
  const { acquired, ownerId } = await acquireLock(lockKey, options);

  if (!acquired) {
    throw new Error(`Failed to acquire lock: ${lockKey}`);
  }

  try {
    return await operation();
  } finally {
    await releaseLock(lockKey, ownerId);
  }
};

/**
 * Check if a lock exists and is valid
 */
export const isLocked = async (lockKey: string): Promise<boolean> => {
  const db = admin.firestore();
  const lockRef = db.collection(LOCKS_COLLECTION).doc(lockKey);

  const lockDoc = await lockRef.get();

  if (!lockDoc.exists) {
    return false;
  }

  const lockData = lockDoc.data() as Lock;
  const now = admin.firestore.Timestamp.now();

  return lockData.expiresAt.toMillis() > now.toMillis();
};

/**
 * Clean up expired locks (maintenance task)
 */
export const cleanupExpiredLocks = async (): Promise<number> => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const expiredLocks = await db
    .collection(LOCKS_COLLECTION)
    .where('expiresAt', '<', now)
    .get();

  if (expiredLocks.empty) {
    return 0;
  }

  const batch = db.batch();
  expiredLocks.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return expiredLocks.size;
};
