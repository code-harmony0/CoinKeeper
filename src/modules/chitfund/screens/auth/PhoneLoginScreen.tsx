import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, TextInput as RNTextInput, Keyboard } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  useAnimatedKeyboard,
  useAnimatedScrollHandler,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, ArrowLeft, Check } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { colors, spacing, typography, radii, shadows } from '../../../../theme/designTokens';

interface PhoneLoginScreenProps {
  navigation: any;
}

const PhoneLoginScreen: React.FC<PhoneLoginScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);

  // Animation values
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);
  const keyboard = useAnimatedKeyboard();

  // OTP input refs
  const otpRefs = useRef<Array<RNTextInput | null>>([]);

  // Entrance animation
  useEffect(() => {
    formOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    formTranslateY.value = withSpring(0, {
      damping: 24,
      stiffness: 120,
    });
  }, []);

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [
      { translateY: formTranslateY.value },
      { translateY: -keyboard.height.value * 0.3 },
    ],
  }));

  const handleSendCode = async () => {
    // TEMPORARY: Skip phone auth and use anonymous login for testing
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 20, stiffness: 200 }),
      withSpring(1, { damping: 20, stiffness: 200 })
    );

    try {
      // Sign in anonymously - this will trigger RootNavigator to show UserTabNavigator
      await auth().signInAnonymously();
    } catch (error) {
      console.log('Anonymous login error:', error);
      // If anonymous login fails, the auth state won't change and we stay on login
    }

    /* ORIGINAL CODE - Commented out for testing:
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 20, stiffness: 200 }),
      withSpring(1, { damping: 20, stiffness: 200 })
    );

    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirmation);
      setIsCodeSent(true);

      // Focus first OTP input
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 300);
    } catch (err: any) {
      console.error('Phone auth error:', err);
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
    */
  };

  const handleVerifyCode = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 20, stiffness: 200 }),
      withSpring(1, { damping: 20, stiffness: 200 })
    );

    try {
      const userCredential = await confirmation.confirm(otpCode);
      const user = userCredential.user;

      // Check if user profile exists in Firestore
      const userDoc = await firestore().collection('users').doc(user.uid).get();

      if (!userDoc.exists) {
        // New user - create profile and navigate to registration
        await firestore().collection('users').doc(user.uid).set({
          phoneNumber: user.phoneNumber,
          createdAt: firestore.FieldValue.serverTimestamp(),
          role: 'user',
          onboardingCompleted: false,
        });

        // Show success animation
        showSuccessAnimation();

        setTimeout(() => {
          navigation.replace('Register');
        }, 1500);
      } else {
        // Existing user - check role and navigate
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        // Show success animation
        showSuccessAnimation();

        setTimeout(() => {
          if (isAdmin) {
            navigation.replace('AdminTabs');
          } else {
            // Check if onboarding completed
            if (userData?.onboardingCompleted) {
              navigation.replace('UserTabs');
            } else {
              navigation.replace('Register');
            }
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError('Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccessAnimation = () => {
    Keyboard.dismiss();
    successScale.value = withSpring(1, { damping: 18, stiffness: 150 });
    successOpacity.value = withTiming(1, { duration: 300 });
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 5 && text) {
      const otpCode = newOtp.join('');
      if (otpCode.length === 6) {
        Keyboard.dismiss();
        setTimeout(() => handleVerifyCode(), 300);
      }
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleBack = () => {
    if (isCodeSent) {
      setIsCodeSent(false);
      setOtp(['', '', '', '', '', '']);
      setError('');
    } else {
      navigation.goBack();
    }
  };

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  return (
    <View style={styles.container}>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>

        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.formContainer, formStyle]}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconGradient}>
                <Phone size={32} color={colors.white} strokeWidth={2} />
              </View>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Animated.Text style={styles.title}>
                {isCodeSent ? 'Verify Code' : 'Welcome Back'}
              </Animated.Text>
              <Animated.Text style={styles.subtitle}>
                {isCodeSent
                  ? `Enter the 6-digit code sent to\n${phoneNumber}`
                  : 'Enter your phone number to continue'}
              </Animated.Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Animated.Text style={styles.errorText}>{error}</Animated.Text>
              </View>
            ) : null}

            {/* Phone Input or OTP */}
            {!isCodeSent ? (
              <View style={styles.inputCard}>
                <RNTextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  autoFocus
                  editable={!isLoading}
                />
              </View>
            ) : (
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <View key={index} style={styles.otpInputWrapper}>
                    <RNTextInput
                      ref={(ref) => { otpRefs.current[index] = ref; }}
                      style={[
                        styles.otpInput,
                        digit ? styles.otpInputFilled : null,
                      ]}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={({ nativeEvent }) =>
                        handleOtpKeyPress(nativeEvent.key, index)
                      }
                      keyboardType="number-pad"
                      maxLength={1}
                      editable={!isLoading}
                      selectTextOnFocus
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Submit Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={isCodeSent ? handleVerifyCode : handleSendCode}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  isLoading && styles.submitButtonDisabled,
                ]}
              >
                <View style={styles.submitGradient}>
                  <Animated.Text style={styles.submitText}>
                    {isLoading
                      ? isCodeSent
                        ? 'Verifying...'
                        : 'Sending Code...'
                      : isCodeSent
                      ? 'Verify Code'
                      : 'Send Code'}
                  </Animated.Text>
                </View>
              </Pressable>
            </Animated.View>

            {/* Resend Code */}
            {isCodeSent && !isLoading && (
              <Pressable onPress={handleSendCode} style={styles.resendButton}>
                <Animated.Text style={styles.resendText}>
                  Didn't receive code? Resend
                </Animated.Text>
              </Pressable>
            )}
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Success Overlay */}
      {successOpacity.value > 0 && (
        <Animated.View style={[styles.successOverlay, successStyle]}>
          <View style={styles.successCircle}>
            <Check size={48} color={colors.white} strokeWidth={3} />
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radii.m,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
  },
  formContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.m,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginBottom: spacing.m,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
    textAlign: 'center',
  },
  inputCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    marginBottom: spacing.l,
    ...shadows.card,
  },
  phoneInput: {
    fontSize: 20,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    padding: 0,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.s,
    marginBottom: spacing.l,
    width: '100%',
  },
  otpInputWrapper: {
    flex: 1,
    maxWidth: 50,
  },
  otpInput: {
    backgroundColor: colors.white,
    borderRadius: radii.m,
    height: 56,
    fontSize: 24,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    ...shadows.card,
  },
  otpInputFilled: {
    backgroundColor: colors.iconBackgroundBlue,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  submitButton: {
    width: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
    ...shadows.card,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.m + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  resendButton: {
    marginTop: spacing.l,
    paddingVertical: spacing.s,
  },
  resendText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    textAlign: 'center',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 240, 249, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
});

export default PhoneLoginScreen;