import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { clearPin, confirmDeviceIdentity } from '../../services/pinService';
import { SetupPinScreen } from './SetupPinScreen';

interface ResetPinScreenProps {
  /** Called once the user has confirmed their identity and set a new PIN. */
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'confirming' | 'failed' | 'settingNewPin';

/**
 * Safe PIN reset — NOT a destructive wipe. The app PIN never gates the
 * database encryption key (see src/db/key.ts / the correction note above
 * Task 2.1 in docs/plans/2026-07-29-coinkeeper-finance.md), so resetting it
 * touches zero data. Re-authenticates via the device's existing
 * biometric/passcode — the same mechanism that already gates the DB key —
 * then clears and re-sets the app PIN.
 */
export const ResetPinScreen: React.FC<ResetPinScreenProps> = ({ onComplete, onCancel }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('confirming');

  const confirmIdentity = useCallback(async () => {
    setStep('confirming');
    // confirmDeviceIdentity() re-reads the DB key Keychain entry which is
    // already configured with BIOMETRY_ANY_OR_DEVICE_PASSCODE — the OS shows
    // its own biometric or device-passcode sheet. No branching needed: the OS
    // decides whether to show a fingerprint, face, or PIN prompt based on
    // what the device supports. Cancel → returns false → step = 'failed'.
    const ok = await confirmDeviceIdentity();
    if (ok) {
      await clearPin();
      setStep('settingNewPin');
    } else {
      setStep('failed');
    }
  }, []);

  useEffect(() => {
    confirmIdentity();
  }, [confirmIdentity]);

  if (step === 'settingNewPin') {
    return <SetupPinScreen onComplete={onComplete} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>Reset your PIN</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {step === 'confirming'
            ? 'Confirm your identity to continue. Your data stays safe either way.'
            : "We couldn't confirm your identity. Try again, or cancel to go back."}
        </Text>

        {step === 'failed' && (
          <>
            <Button title="Try Again" onPress={confirmIdentity} style={styles.button} />
            <Button title="Cancel" variant="ghost" onPress={onCancel} />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
  button: {
    marginBottom: 12,
  },
});
