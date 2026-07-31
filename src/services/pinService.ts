import 'react-native-get-random-values';
import argon2 from 'react-native-argon2';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'coinkeeper.app.pin';

interface StoredPin {
  salt: string;
  encodedHash: string;
}

const generateSaltHex = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

export const hasPinSet = async (): Promise<boolean> => {
  const existing = await Keychain.getGenericPassword({ service: SERVICE });
  return existing !== false;
};

/**
 * Deliberately separate from the DB encryption key's Keychain entry
 * (src/db/key.ts) and its accessControl. This PIN is an app-level lock, not
 * a data-encryption factor — see the correction note above Task 2.1 in
 * docs/plans/2026-07-29-coinkeeper-finance.md.
 */
export const setPin = async (pin: string): Promise<void> => {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4 to 6 digits.');
  }

  const salt = generateSaltHex();
  const { encodedHash } = await argon2(pin, salt, { mode: 'argon2id' });
  const stored: StoredPin = { salt, encodedHash };

  const saved = await Keychain.setGenericPassword(SERVICE, JSON.stringify(stored), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  if (!saved) {
    throw new Error('Failed to store the app PIN.');
  }
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  const existing = await Keychain.getGenericPassword({ service: SERVICE });
  if (!existing) return false;

  const stored: StoredPin = JSON.parse(existing.password);
  const { encodedHash } = await argon2(pin, stored.salt, { mode: 'argon2id' });
  return encodedHash === stored.encodedHash;
};

export const clearPin = async (): Promise<void> => {
  await Keychain.resetGenericPassword({ service: SERVICE });
};
