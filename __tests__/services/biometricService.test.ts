const mockIsSensorAvailable = jest.fn();
const mockSimplePrompt = jest.fn();

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: mockIsSensorAvailable,
    simplePrompt: mockSimplePrompt,
  }));
});

import { isBiometricAvailable, promptBiometric } from '../../src/services/biometricService';

describe('biometricService', () => {
  beforeEach(() => {
    mockIsSensorAvailable.mockReset();
    mockSimplePrompt.mockReset();
  });

  it('reports availability from the sensor check', async () => {
    mockIsSensorAvailable.mockResolvedValue({ available: true, biometryType: 'Fingerprint' });
    expect(await isBiometricAvailable()).toBe(true);
  });

  it('reports unavailable when no sensor exists', async () => {
    mockIsSensorAvailable.mockResolvedValue({ available: false });
    expect(await isBiometricAvailable()).toBe(false);
  });

  it('resolves true when the prompt succeeds', async () => {
    mockSimplePrompt.mockResolvedValue({ success: true });
    expect(await promptBiometric('Unlock CoinKeeper')).toBe(true);
  });

  it('resolves false (not throws) when the user cancels', async () => {
    mockSimplePrompt.mockResolvedValue({ success: false });
    expect(await promptBiometric('Unlock CoinKeeper')).toBe(false);
  });

  it('resolves false when the prompt itself rejects', async () => {
    mockSimplePrompt.mockRejectedValue(new Error('sensor error'));
    expect(await promptBiometric('Unlock CoinKeeper')).toBe(false);
  });
});
