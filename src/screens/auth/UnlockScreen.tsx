import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { useTheme } from '../../hooks/useTheme';
import { verifyPin } from '../../services/pinService';
import { isBiometricAvailable, promptBiometric } from '../../services/biometricService';
import { getPreference } from '../../store/database';
import { ResetPinScreen } from './ResetPinScreen';

interface UnlockScreenProps {
  onUnlock: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlock }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const tryBiometricUnlock = useCallback(async () => {
    const enabled = (await getPreference('biometric_enabled')) === 'true';
    if (!enabled) return;
    if (!(await isBiometricAvailable())) return;

    const success = await promptBiometric('Unlock CoinKeeper');
    if (success) {
      onUnlock();
    }
    // On failure/cancel, fall through silently to the PIN input already
    // rendered below — never block the user behind the biometric prompt.
  }, [onUnlock]);

  useEffect(() => {
    tryBiometricUnlock();
    // Only attempt automatically once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setVerifying(true);
    try {
      const ok = await verifyPin(value);
      if (ok) {
        onUnlock();
      } else {
        setError('Incorrect PIN. Try again.');
        setValue('');
      }
    } finally {
      setVerifying(false);
    }
  };

  if (showReset) {
    return (
      <ResetPinScreen
        onComplete={onUnlock}
        onCancel={() => setShowReset(false)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>Enter your PIN</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Unlock CoinKeeper to continue.
        </Text>

        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
          error={error ?? undefined}
          containerStyle={styles.input}
        />

        <Button
          title="Unlock"
          onPress={handleSubmit}
          disabled={value.length < 4 || verifying}
          loading={verifying}
          style={styles.button}
        />

        <Button
          title="Forgot PIN?"
          variant="ghost"
          onPress={() => setShowReset(true)}
          style={styles.forgotButton}
        />
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
  input: {
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
  forgotButton: {
    marginTop: 16,
  },
});
