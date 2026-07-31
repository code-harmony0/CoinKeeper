import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { useTheme } from '../../hooks/useTheme';
import { setPin } from '../../services/pinService';

interface SetupPinScreenProps {
  onComplete: () => void;
}

type Step = 'enter' | 'confirm';

export const SetupPinScreen: React.FC<SetupPinScreenProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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
        <Text variant="h1" style={styles.title}>
          {step === 'enter' ? 'Set a PIN' : 'Confirm your PIN'}
        </Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {step === 'enter'
            ? 'Choose a 4-6 digit PIN to lock the app.'
            : 'Enter the same PIN again to confirm.'}
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

        <Text variant="caption" color="secondary" style={styles.caption}>
          If you forget this PIN, you can reset it using your device's screen
          lock — your data stays safe either way.
        </Text>

        <Button
          title={step === 'enter' ? 'Continue' : 'Confirm'}
          onPress={handleContinue}
          disabled={value.length < 4 || saving}
          loading={saving}
          style={styles.button}
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
    marginBottom: 8,
  },
  caption: {
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
});
