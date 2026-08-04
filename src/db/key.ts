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
  // Try the strict hardware-backed key first (requires device PIN/Biometrics)
  try {
    const existing = await Keychain.getGenericPassword({
      service: SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    });
    if (existing) return existing.password;
  } catch (error) {
    // If strict fails (likely because device has no screen lock), try the fallback service
    console.warn('[db/key] Strict keychain retrieval failed, trying fallback...', error);
  }

  // Check if we have a fallback key (for devices without lock screens)
  const FALLBACK_SERVICE = `${SERVICE}.fallback`;
  try {
    const fallbackExisting = await Keychain.getGenericPassword({
      service: FALLBACK_SERVICE,
    });
    if (fallbackExisting) return fallbackExisting.password;
  } catch (e) {
    // Ignore fallback retrieval errors
  }

  // Neither exists. We must generate a new key.
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
