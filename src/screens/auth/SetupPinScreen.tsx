import React, { useState } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useSpecTheme } from '../../theme/specTheme';
import { setPin } from '../../services/pinService';

interface SetupPinScreenProps {
  onComplete: () => void;
}

type Step = 'enter' | 'confirm';

export const SetupPinScreen: React.FC<SetupPinScreenProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const { colors, inputRadius } = useSpecTheme();

  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('enter');
    setFirstPin('');
    setValue('');
  };

  const handleContinue = async () => {
    setError(null);

    if (step === 'enter') {
      if (!/^\d{4,6}$/.test(value)) {
        setError('PIN must be 4 to 6 digits.');
        return;
      }
      setFirstPin(value);
      setValue('');
      setStep('confirm');
      return;
    }

    // step === 'confirm'
    if (value !== firstPin) {
      setError("PINs didn't match. Try again.");
      reset();
      return;
    }

    try {
      setSaving(true);
      await setPin(value);
      onComplete();
    } catch {
      setError('Could not save your PIN. Please try again.');
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {step === 'enter' ? 'Set a PIN' : 'Confirm PIN'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'enter'
              ? 'Choose a 4-6 digit PIN to lock the app.'
              : 'Enter the same PIN again to confirm.'}
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

        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          If you forget this PIN, you can reset it using your device's screen
          lock — your data stays safe either way.
        </Text>

        <Button
          title={step === 'enter' ? 'Continue' : 'Confirm'}
          onPress={handleContinue}
          disabled={value.length < 4 || saving}
          loading={saving}
          style={[styles.button, { backgroundColor: colors.primaryAccent }]}
          textStyle={{ color: '#FFFFFF' }}
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
    paddingHorizontal: 20,
    lineHeight: 22,
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
  caption: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  button: {
    height: 56,
  },
});
