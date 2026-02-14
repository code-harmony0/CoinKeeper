/**
 * Redesigned Register Screen
 * Soft pastel design with animated background and smooth interactions
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Mail, Lock, User, UserPlus } from 'lucide-react-native';

import { Input } from '../../components/redesign/Input';
import { Button } from '../../components/redesign/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, typography, radii } from '../../theme/designTokens';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreenRedesign: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const backgroundOpacity = useSharedValue(0);

  React.useEffect(() => {
    backgroundOpacity.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await signUp(email, password);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      {/* Animated Background Gradient */}
      <Animated.View style={[styles.backgroundGradient, backgroundAnimatedStyle]}>
        <LinearGradient colors={colors.backgroundGradient} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Decorative Orbs */}
      <Animated.View entering={FadeInUp.delay(200).duration(1000)} style={styles.orbTop}>
        <LinearGradient
          colors={['rgba(168, 176, 240, 0.15)', 'rgba(168, 176, 240, 0.05)']}
          style={styles.orbGradient}
        />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(400).duration(1000)} style={styles.orbBottom}>
        <LinearGradient
          colors={['rgba(123, 134, 226, 0.15)', 'rgba(123, 134, 226, 0.05)']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header Section */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.primaryMuted, colors.primary]}
                style={styles.logoGradient}
              >
                <UserPlus size={32} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join CoinKeeper and start tracking</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formCard}>
            <View style={styles.form}>
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                leftIcon={<User size={20} color={colors.textMuted} strokeWidth={2} />}
              />

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Mail size={20} color={colors.textMuted} strokeWidth={2} />}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textMuted} strokeWidth={2} />}
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                leftIcon={<Lock size={20} color={colors.textMuted} strokeWidth={2} />}
              />

              {errorMessage && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Animated.View>
              )}

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={isLoading}
                size="large"
                style={styles.registerButton}
              />
            </View>
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Login Button */}
          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <Button
              title="Already have an account? Sign In"
              onPress={handleBackToLogin}
              variant="ghost"
              size="large"
            />
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.footer}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our{'\n'}Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orbTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    top: -100,
    right: -80,
    borderRadius: 150,
  },
  orbBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    bottom: 80,
    left: -100,
    borderRadius: 120,
  },
  orbGradient: {
    flex: 1,
    borderRadius: 1000,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.l,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.l,
    shadowColor: colors.primaryMuted,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderRadius: 32,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    lineHeight: 40,
    color: colors.textTitle,
    marginBottom: spacing.s,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textBody,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.l,
    marginBottom: spacing.l,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  form: {
    gap: spacing.m,
  },
  errorContainer: {
    backgroundColor: `${colors.accent}15`,
    borderRadius: radii.card,
    padding: spacing.m,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  errorText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.accent,
  },
  registerButton: {
    marginTop: spacing.s,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.l,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.pillBackground,
  },
  dividerText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginHorizontal: spacing.m,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.l,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
