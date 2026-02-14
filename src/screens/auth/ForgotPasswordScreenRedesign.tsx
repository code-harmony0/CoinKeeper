/**
 * Redesigned Forgot Password Screen
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
import { Mail, KeyRound, ArrowLeft } from 'lucide-react-native';

import { Input } from '../../components/redesign/Input';
import { Button } from '../../components/redesign/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, typography, radii } from '../../theme/designTokens';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreenRedesign: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { resetPassword } = useAuth();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const backgroundOpacity = useSharedValue(0);

  React.useEffect(() => {
    backgroundOpacity.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.quad),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to send reset email');
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
          colors={['rgba(228, 150, 178, 0.15)', 'rgba(228, 150, 178, 0.05)']}
          style={styles.orbGradient}
        />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(400).duration(1000)} style={styles.orbBottom}>
        <LinearGradient
          colors={['rgba(168, 176, 240, 0.15)', 'rgba(168, 176, 240, 0.05)']}
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
          {/* Back Button */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Button
              title="Back to Login"
              onPress={handleBackToLogin}
              variant="ghost"
              leftIcon={<ArrowLeft size={20} color={colors.primary} strokeWidth={2} />}
              style={styles.backButton}
            />
          </Animated.View>

          {/* Logo/Header Section */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.accent, '#D47CA0']}
                style={styles.logoGradient}
              >
                <KeyRound size={32} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you{'\n'}instructions to reset your password
            </Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.formCard}>
            <View style={styles.form}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Mail size={20} color={colors.textMuted} strokeWidth={2} />}
                error={errorMessage}
              />

              {successMessage && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.successContainer}>
                  <Text style={styles.successText}>{successMessage}</Text>
                </Animated.View>
              )}

              <Button
                title="Send Reset Link"
                onPress={handleResetPassword}
                loading={isLoading}
                size="large"
                style={styles.resetButton}
              />
            </View>
          </Animated.View>

          {/* Help Text */}
          <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Remember your password?{' '}
              <Text style={styles.helpLink} onPress={handleBackToLogin}>
                Sign In
              </Text>
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
    width: 260,
    height: 260,
    top: -60,
    right: -100,
    borderRadius: 130,
  },
  orbBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    bottom: 120,
    left: -60,
    borderRadius: 100,
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.l,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.l,
    shadowColor: colors.accent,
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
  successContainer: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radii.card,
    padding: spacing.m,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  successText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  resetButton: {
    marginTop: spacing.s,
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  helpText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textBody,
  },
  helpLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
