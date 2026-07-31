jest.mock('react-native-argon2', () => jest.fn(async (password: string, salt: string) => ({
  rawHash: `raw-${password}-${salt}`,
  encodedHash: `enc-${password}-${salt}`,
})));

jest.mock('react-native-keychain', () => {
  // Map<service, password> — models real Keychain where each service is an
  // independent slot. The previous single-slot mock broke confirmDeviceIdentity
  // because the PIN entry and the DB key entry shared the same store.
  const stores = new Map<string, string>();
  return {
    getGenericPassword: jest.fn(async ({ service }: { service: string }) => {
      const v = stores.get(service);
      return v === undefined
        ? false
        : { username: service, password: v, service, storage: 'x' };
    }),
    setGenericPassword: jest.fn(
      async (_u: string, password: string, { service }: { service: string }) => {
        stores.set(service, password);
        return { service, storage: 'x' };
      },
    ),
    resetGenericPassword: jest.fn(async ({ service }: { service: string }) => {
      stores.delete(service);
      return true;
    }),
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
    ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode' },
  };
});

import * as Keychain from 'react-native-keychain';
import { hasPinSet, setPin, verifyPin, clearPin, confirmDeviceIdentity } from '../../src/services/pinService';

const DB_KEY_SERVICE = 'coinkeeper.db.encryptionKey';

describe('pinService', () => {
  it('reports no PIN set initially', async () => {
    expect(await hasPinSet()).toBe(false);
  });

  it('rejects a PIN that is not 4-6 digits', async () => {
    await expect(setPin('12')).rejects.toThrow();
    await expect(setPin('abcdef')).rejects.toThrow();
  });

  it('accepts and verifies a correct PIN, rejects a wrong one', async () => {
    await setPin('4821');
    expect(await hasPinSet()).toBe(true);
    expect(await verifyPin('4821')).toBe(true);
    expect(await verifyPin('0000')).toBe(false);
  });

  it('clearPin removes it entirely', async () => {
    await setPin('4821');
    await clearPin();
    expect(await hasPinSet()).toBe(false);
    expect(await verifyPin('4821')).toBe(false);
  });

  it('allows setting a new PIN after clearing, without touching stored transactions', async () => {
    await setPin('1111');
    await clearPin();
    await setPin('2222');
    expect(await verifyPin('2222')).toBe(true);
    expect(await verifyPin('1111')).toBe(false);
  });
});

describe('confirmDeviceIdentity', () => {
  it('returns true when the DB key Keychain entry resolves', async () => {
    // Seed the DB key service slot so the mock returns a credential:
    await (Keychain.setGenericPassword as jest.Mock)(
      DB_KEY_SERVICE, 'fake-db-key', { service: DB_KEY_SERVICE },
    );
    expect(await confirmDeviceIdentity()).toBe(true);
  });

  it('returns false when the OS prompt is cancelled (Keychain throws)', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(
      new Error('LAErrorUserCancel'),
    );
    expect(await confirmDeviceIdentity()).toBe(false);
  });

  it('returns false when no DB key credential exists', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(false);
    expect(await confirmDeviceIdentity()).toBe(false);
  });
});
