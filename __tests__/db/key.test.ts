jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  SECURITY_LEVEL: { SECURE_HARDWARE: 'SECURE_HARDWARE' },
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode' },
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
}));

import * as Keychain from 'react-native-keychain';
import { getOrCreateEncryptionKey } from '../../src/db/key';

const mockGet = Keychain.getGenericPassword as jest.Mock;
const mockSet = Keychain.setGenericPassword as jest.Mock;

describe('getOrCreateEncryptionKey', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it('returns the existing key without generating or storing a new one', async () => {
    mockGet.mockResolvedValue({ password: 'a'.repeat(64) });

    const key = await getOrCreateEncryptionKey();

    expect(key).toBe('a'.repeat(64));
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('generates and persists a 256-bit hex key when none exists', async () => {
    mockGet.mockResolvedValue(false);
    mockSet.mockResolvedValue({ service: 'coinkeeper.db.encryptionKey', storage: 'x' });

    const key = await getOrCreateEncryptionKey();

    expect(key).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
    expect(mockSet).toHaveBeenCalledTimes(1);

    const [service, storedKey, options] = mockSet.mock.calls[0];
    expect(service).toBe('coinkeeper.db.encryptionKey');
    expect(storedKey).toBe(key);
    expect(options).toMatchObject({
      securityLevel: 'SECURE_HARDWARE',
      accessControl: 'BiometryAnyOrDevicePasscode',
      accessible: 'AccessibleWhenUnlockedThisDeviceOnly',
    });
  });

  it('generates a different key on each call when nothing is persisted (sanity check against a constant stub)', async () => {
    mockGet.mockResolvedValue(false);
    mockSet.mockResolvedValue({ service: 'x', storage: 'x' });

    const first = await getOrCreateEncryptionKey();
    const second = await getOrCreateEncryptionKey();

    expect(first).not.toBe(second);
  });

  it('throws if the keychain refuses to persist the new key', async () => {
    mockGet.mockResolvedValue(false);
    mockSet.mockResolvedValue(false);

    await expect(getOrCreateEncryptionKey()).rejects.toThrow(/Failed to persist/);
  });
});

/**
 * NOT COVERED HERE, on purpose: the plan's own "meaningful test" — opening
 * the DB with the wrong key and confirming SQLITE_NOTADB. That requires a
 * real SQLCipher-compiled native binary; @op-engineering/op-sqlite is a JSI
 * native module with no Jest-safe mock, so any version of that test run here
 * would only be testing a hand-written stub of op-sqlite's own behavior, not
 * verifying real encryption. That check needs a device/emulator run against
 * an actual proDebug or liteDebug build — it is not something this session's
 * sandbox can honestly claim to verify. Track it in docs/APP_FLOW_PLAN.md
 * as an open manual verification step, not a passing automated test.
 */
