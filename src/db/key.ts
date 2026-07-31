import 'react-native-get-random-values';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'coinkeeper.db.encryptionKey';

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
 * Returns the database's encryption key, generating and persisting one on
 * first launch. The key itself sits in the Android Keystore (SECURE_HARDWARE);
 * retrieval is gated by biometric/device-passcode, not the key material being
 * wrapped by it — changing the device PIN never requires re-encrypting the
 * database, only re-authenticating to read the already-stored key.
 */
export const getOrCreateEncryptionKey = async (): Promise<string> => {
  const existing = await Keychain.getGenericPassword({
    service: SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  });

  if (existing) {
    return existing.password;
  }

  const key = generateKeyHex();

  const saved = await Keychain.setGenericPassword(SERVICE, key, {
    service: SERVICE,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  if (!saved) {
    throw new Error('Failed to persist the database encryption key to the keychain.');
  }

  return key;
};
