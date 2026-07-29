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

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Register'
>;

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      // Navigation will be handled automatically by the auth state change
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <Card style={styles.container}>
      <Text variant="h2" style={styles.title}>
        Welcome Back
      </Text>
      <Text variant="body" style={styles.subtitle}>
        Sign in to your account
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

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          error={errorMessage}
        />

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.loginButton}
        />

        <Button
          title="Forgot Password?"
          onPress={handleForgotPassword}
          variant="ghost"
          style={styles.forgotButton}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text variant="caption" style={styles.dividerText}>
            or
          </Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Create Account"
          onPress={handleRegister}
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
  loginButton: {
    marginTop: 8,
  },
  forgotButton: {
    alignSelf: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    marginHorizontal: 16,
    opacity: 0.6,
  },
});
