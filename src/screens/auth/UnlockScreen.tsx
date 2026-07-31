import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useSpecTheme } from '../../theme/specTheme';
import { verifyPin } from '../../services/pinService';
import { isBiometricAvailable, promptBiometric } from '../../services/biometricService';
import { getPreference } from '../../store/database';
import { ResetPinScreen } from './ResetPinScreen';

interface UnlockScreenProps {
  onUnlock: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlock }) => {
  const insets = useSafeAreaInsets();
  const { colors, inputRadius } = useSpecTheme();

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
  }, [onUnlock]);

  useEffect(() => {
    tryBiometricUnlock();
  }, [tryBiometricUnlock]);

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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Enter PIN</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlock CoinKeeper to continue.
          </Text>
        </View>

        <RNTextInput
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
          style={[
            styles.pinInput,
            { 
              backgroundColor: colors.chipBg, 
              color: colors.textPrimary,
              borderRadius: inputRadius,
              borderColor: error ? colors.danger : 'transparent'
            }
          ]}
        />
        
        {error && (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        )}

        <View style={styles.spacer} />

        <Button
          title="Unlock"
          onPress={handleSubmit}
          disabled={value.length < 4 || verifying}
          loading={verifying}
          style={[styles.button, { backgroundColor: colors.primaryAccent }]}
          textStyle={{ color: '#FFFFFF' }}
        />

        <Button
          title="Forgot PIN?"
          variant="ghost"
          onPress={() => setShowReset(true)}
          style={styles.forgotButton}
          textStyle={{ color: colors.textSecondary }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
    textAlign: 'center',
  },
  pinInput: {
    height: 72,
    fontSize: 32,
    fontFamily: 'Satoshi-Bold',
    textAlign: 'center',
    letterSpacing: 16,
    borderWidth: 1,
    paddingRight: 16, // offset letterSpacing
  },
  error: {
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    textAlign: 'center',
    marginTop: 12,
  },
  spacer: {
    flex: 1,
  },
  button: {
    height: 56,
  },
  forgotButton: {
    marginTop: 16,
  },
});
