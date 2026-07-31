import ReactNativeBiometrics from 'react-native-biometrics';

// Instantiated lazily inside each call, rather than once at module scope.
// A module-scope singleton would be constructed at import time — which, once
// Babel hoists `import` statements above local `const` declarations, can run
// before a test's jest.mock() factory variables have initialized.
const getBiometrics = (): ReactNativeBiometrics => new ReactNativeBiometrics();

export const isBiometricAvailable = async (): Promise<boolean> => {
  const { available } = await getBiometrics().isSensorAvailable();
  return available;
};

export const promptBiometric = async (promptMessage: string): Promise<boolean> => {
  try {
    const { success } = await getBiometrics().simplePrompt({ promptMessage });
    return success;
  } catch {
    return false;
  }
};
