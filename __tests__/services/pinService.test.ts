jest.mock('react-native-argon2', () => jest.fn(async (password: string, salt: string) => ({
  rawHash: `raw-${password}-${salt}`,
  encodedHash: `enc-${password}-${salt}`,
})));

jest.mock('react-native-keychain', () => {
  let store: string | null = null;
  return {
    getGenericPassword: jest.fn(async () =>
      store === null ? false : { username: 'coinkeeper.app.pin', password: store, service: 'coinkeeper.app.pin', storage: 'x' }
    ),
    setGenericPassword: jest.fn(async (_u: string, password: string) => {
      store = password;
      return { service: 'coinkeeper.app.pin', storage: 'x' };
    }),
    resetGenericPassword: jest.fn(async () => {
      store = null;
      return true;
    }),
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
  };
});

import { hasPinSet, setPin, verifyPin, clearPin } from '../../src/services/pinService';

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
