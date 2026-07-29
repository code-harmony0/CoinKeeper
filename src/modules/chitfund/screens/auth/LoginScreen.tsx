/**
 * LoginScreen - Spec Theme
 * Phone login + Admin bypass
 */
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSpecTheme } from '../../../../theme/specTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Path, Circle } from 'react-native-svg';

type Props = NativeStackScreenProps<any, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardShadow, inputRadius, chipRadius, spring } = useSpecTheme();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const buttonScale = useSharedValue(1);
  const inputShake = useSharedValue(0);

  const buttonAnim = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: withSpring(buttonScale.value, spring) }],
    };
  });

  const inputAnim = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: inputShake.value }],
    };
  });

  const isValidPhone = phone.length === 10 && /^\d+$/.test(phone);

  const handleContinue = async () => {
    if (!isValidPhone) {
      setError('Please enter a valid 10-digit phone number');
      inputShake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      ReactNativeHapticFeedback.trigger('notificationError');
      return;
    }

    setError('');
    setIsLoading(true);
    ReactNativeHapticFeedback.trigger('impactMedium');

    // Simulate OTP send
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('UserTabs');
    }, 1500);
  };

  const handleAdminLogin = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.navigate('AdminTabs');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.inner, { paddingTop: insets.top + 60 }]}>
          {/* Logo */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.card }, cardShadow]}>
              <LogoIcon accentColor={colors.primaryAccent} />
            </View>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>CoinKeeper</Text>
          </Animated.View>

          {/* Welcome text */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.welcomeContainer}>
            <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Welcome back</Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>Track your money with ease</Text>
          </Animated.View>

          {/* Phone input */}
          <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.inputContainer, inputAnim]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.card, borderRadius: inputRadius },
                cardShadow,
                error ? { borderWidth: 1.5, borderColor: colors.danger } : phone ? { borderWidth: 1.5, borderColor: colors.primaryAccent } : null,
              ]}
            >
              <View style={styles.prefixContainer}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={[styles.prefixText, { color: colors.textPrimary }]}>+91</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>
              <PhoneIcon color={colors.textSecondary} />
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/\D/g, ''));
                  if (error) setError('');
                }}
              />
              {isValidPhone && <CheckIcon color={colors.success} />}
            </View>
            {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
          </Animated.View>

          {/* Continue button */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <Pressable
              onPress={handleContinue}
              onPressIn={() => { buttonScale.value = 0.97; }}
              onPressOut={() => { buttonScale.value = 1; }}
              disabled={isLoading}
            >
              <Animated.View
                style={[
                  styles.continueButton,
                  { backgroundColor: colors.primaryAccent, borderRadius: chipRadius },
                  buttonAnim,
                  isLoading && styles.buttonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.continueText, { color: colors.background }]}>Continue</Text>
                )}
              </Animated.View>
            </Pressable>
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </Animated.View>

          {/* Social buttons */}
          <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.socialRow}>
            <Pressable style={[styles.socialButton, { backgroundColor: colors.card }, cardShadow]}>
              <GoogleIcon />
              <Text style={[styles.socialText, { color: colors.textPrimary }]}>Google</Text>
            </Pressable>
            <Pressable style={[styles.socialButton, { backgroundColor: colors.card }, cardShadow]}>
              <AppleIcon color={colors.textPrimary} />
              <Text style={[styles.socialText, { color: colors.textPrimary }]}>Apple</Text>
            </Pressable>
          </Animated.View>

          {/* Terms */}
          <Animated.View entering={FadeInUp.delay(700).springify()}>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              By continuing, you agree to our{' '}
              <Text style={[styles.termsLink, { color: colors.lavenderDeep }]}>Terms</Text> &{' '}
              <Text style={[styles.termsLink, { color: colors.lavenderDeep }]}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </View>

        {/* Admin login - bottom */}
        <Animated.View entering={FadeInUp.delay(800).springify()} style={[styles.adminContainer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable onPress={handleAdminLogin}>
            <Text style={[styles.adminText, { color: colors.textSecondary }]}>Admin Login (Temporary)</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================
// SVG ICONS - Thick stroke (2px)
// ============================================
const SW = 2;

const LogoIcon = ({ accentColor }: { accentColor: string }) => (
  <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
    <Circle cx={24} cy={24} r={20} fill={accentColor} opacity={0.12} />
    <Circle cx={24} cy={24} r={14} stroke={accentColor} strokeWidth={2.5} fill="none" />
    <Path d="M18 24h12M20 20h8M20 28h8" stroke={accentColor} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const PhoneIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
      stroke={color}
      strokeWidth={SW}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.998 10.998 0 0012 23z" fill="#34A853" />
    <Path d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a10.998 10.998 0 000 9.88l3.66-2.84z" fill="#FBBC05" />
    <Path d="M12 4.75c1.62 0 3.06.56 4.2 1.64l3.15-3.15A10.998 10.998 0 0012 1 10.998 10.998 0 002.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

const AppleIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill={color}
    />
  </Svg>
);

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandName: {
    fontFamily: 'Satoshi-Black',
    fontSize: 28,
    letterSpacing: -0.5,
  },

  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontFamily: 'Satoshi-Black',
    fontSize: 28,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 15,
  },

  // Input
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagEmoji: {
    fontSize: 18,
  },
  prefixText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  divider: {
    width: 1,
    height: 24,
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
  },
  errorText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },

  // Button
  continueButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  continueText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  socialText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },

  // Terms
  termsText: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: 'Satoshi-Medium',
  },

  // Admin
  adminContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  adminText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
