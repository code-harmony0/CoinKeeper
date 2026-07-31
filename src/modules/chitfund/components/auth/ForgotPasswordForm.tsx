import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Text, TextInput, Button, Card } from '../../../../components/ui';
import { useAuth } from '../../hooks/useAuth';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { resetPassword } = useAuth();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setEmailSent(true);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (emailSent) {
    return (
      <Card style={styles.container}>
        <Text variant="h2" style={styles.title}>
          Check Your Email
        </Text>
        <Text variant="body" style={styles.subtitle}>
          We've sent a password reset link to {email}
        </Text>

        <Button
          title="Back to Login"
          onPress={handleBackToLogin}
          style={styles.backButton}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <Text variant="h2" style={styles.title}>
        Forgot Password?
      </Text>
      <Text variant="body" style={styles.subtitle}>
        Enter your email address and we'll send you a link to reset your password.
      </Text>

      <View style={styles.form}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errorMessage}
        />

        <Button
          title="Send Reset Link"
          onPress={handleResetPassword}
          loading={isLoading}
          style={styles.resetButton}
        />

        <Button
          title="Back to Login"
          onPress={handleBackToLogin}
          variant="outline"
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  form: {
    gap: 16,
  },
  resetButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 16,
  },
});
