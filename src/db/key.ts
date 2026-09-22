import 'react-native-get-random-values';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'coinkeeper.db.encryptionKey';
const FALLBACK_SERVICE = `${SERVICE}.fallback`;

/**
 * The database encryption key is a raw 256-bit key, never a user-facing
 * passphrase — it never needs to be typed or remembered, so there is no
 * reason to weaken it into something KDF-friendly. Stored as lowercase hex.
 */
const generateKeyHex = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Development's key: the plain, ungated keychain entry, and only that entry
 * — no biometric prompt, ever, on a machine that already belongs to the
 * developer.
 *
 * It used to be a *mirror* of the real (biometric-gated) key, refreshed
 * opportunistically whenever the gated read happened to succeed. That mirror
 * once fell out of sync with the real key — how is unclear, but the effect
 * was not — and every launch after that read the stale copy, which could not
 * open the database, with no warning and no biometric prompt to explain why.
 * The plain entry is now the *only* source dev ever reads or writes, so there
 * is nothing left for it to fall out of sync with.
 */
const getOrCreateDevKey = async (): Promise<string> => {
  try {
    const plain = await Keychain.getGenericPassword({ service: FALLBACK_SERVICE });
    if (plain) return plain.password;
  } catch (e) {
    // No plain entry yet, or it could not be read — fall through.
  }

  // One-time recovery, for a device whose plain entry is missing or stale but
  // whose real database is still encrypted under the gated key from before
  // this became dev-only-plain. Adopting it (once, at whatever prompt that
  // costs) is the only way to reach an already-real database; minting a new
  // key here instead is exactly the mistake that caused the stale-mirror bug
  // in the first place.
  try {
    const gated = await Keychain.getGenericPassword({
      service: SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    });
    if (gated) {
      await Keychain.setGenericPassword(FALLBACK_SERVICE, gated.password, {
        service: FALLBACK_SERVICE,
      }).catch(() => undefined);
      return gated.password;
    }
  } catch (e) {
    // No gated entry either, or it could not be read — this is a first run.
  }

  const key = generateKeyHex();
  const saved = await Keychain.setGenericPassword(FALLBACK_SERVICE, key, { service: FALLBACK_SERVICE });
  if (!saved) {
    throw new Error('Failed to persist the database encryption key.');
  }
  return key;
};

/**
 * Returns the database's encryption key, generating and persisting one on
 * first launch.
 *
 * In a release build the key sits in the Android Keystore (SECURE_HARDWARE);
 * retrieval is gated by biometric/device-passcode, not the key material being
 * wrapped by it — changing the device PIN never requires re-encrypting the
 * database, only re-authenticating to read the already-stored key.
 * `__DEV__` is replaced with `false` in release builds, so a shipped app
 * always faces this gate; development never does (see `getOrCreateDevKey`).
 */
export const getOrCreateEncryptionKey = async (): Promise<string> => {
  if (__DEV__) return getOrCreateDevKey();

  // A key that cannot be READ is not a key that is absent. The difference is
  // everything: minting a fresh key made the existing database unreadable, and
  // the opener then deleted it as "stale" — a single cancelled biometric
  // prompt at startup silently destroyed every transaction the user had.
  let readFailed = false;

  try {
    const existing = await Keychain.getGenericPassword({
      service: SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    });
    if (existing) return existing.password;
  } catch (error) {
    readFailed = true;
    console.warn('[db/key] Strict keychain retrieval failed, trying fallback...', error);
  }

  // Check if we have a fallback key (for devices without lock screens)
  try {
    const fallbackExisting = await Keychain.getGenericPassword({
      service: FALLBACK_SERVICE,
    });
    if (fallbackExisting) return fallbackExisting.password;
  } catch (e) {
    readFailed = true;
    console.warn('[db/key] Fallback keychain retrieval failed.', e);
  }

  if (readFailed) {
    throw new Error(
      'Could not read the database key. Your data is safe but locked — unlock the device and open CoinKeeper again.',
    );
  }

  // Both stores answered, and neither holds a key: this is a first run.
  const key = generateKeyHex();

  try {
    // Try to save it with strict hardware security first
    const saved = await Keychain.setGenericPassword(SERVICE, key, {
      service: SERVICE,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    if (saved) return key;
  } catch (error) {
    console.warn('[db/key] Device does not support secure lock screen. Falling back to standard keychain.');
  }

  // Fallback save (standard keychain, works on emulators without PIN)
  const fallbackSaved = await Keychain.setGenericPassword(FALLBACK_SERVICE, key, {
    service: FALLBACK_SERVICE,
  });

  if (!fallbackSaved) {
    throw new Error('Failed to persist the database encryption key to both strict and fallback keychains.');
  }

  return key;
};
