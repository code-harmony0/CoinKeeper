/**
 * LoginScreen - Blob Theme
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
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME_SHADOWS, THEME_ANIMATION } from '../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Path, Circle } from 'react-native-svg';

type Props = NativeStackScreenProps<any, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
      transform: [{ scale: withSpring(buttonScale.value, THEME_ANIMATION.spring) }],
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#C2DFF7', '#D8E2FA', '#CFD9F1']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blob */}
      <View style={styles.blobDecor}>
        <Svg width={300} height={300} viewBox="0 0 200 200">
          <Path
            d="M40,-62C51.5,-54.5,60.5,-42.5,67.5,-29C74.5,-15.5,79.5,0,77,14C74.5,28,64.5,40.5,52.5,50C40.5,59.5,26.5,66,11,69.5C-4.5,73,-21.5,73.5,-36,68C-50.5,62.5,-62.5,51,-70,37C-77.5,23,-80.5,6.5,-78,-9C-75.5,-24.5,-67.5,-39,-55.5,-47.5C-43.5,-56,-27.5,-58.5,-13,-59.5C1.5,-60.5,28.5,-60,40,-62Z"
            fill="#B8D4EA"
            opacity={0.4}
            transform="translate(100 100)"
          />
        </Svg>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.inner, { paddingTop: insets.top + 60 }]}>
          {/* Logo */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.logoContainer}>
            <View style={styles.logo}>
              <LogoIcon />
            </View>
            <Text style={styles.brandName}>CoinKeeper</Text>
          </Animated.View>

          {/* Welcome text */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>Track your money with ease</Text>
          </Animated.View>

          {/* Phone input */}
          <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.inputContainer, inputAnim]}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={[styles.inputWrapper, error ? styles.inputError : phone ? styles.inputFocused : null]}>
              <View style={styles.prefixContainer}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.prefixText}>+91</Text>
                <View style={styles.divider} />
              </View>
              <PhoneIcon />
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/\D/g, ''));
                  if (error) setError('');
                }}
              />
              {isValidPhone && <CheckIcon />}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </Animated.View>

          {/* Continue button */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <Pressable
              onPress={handleContinue}
              onPressIn={() => { buttonScale.value = 0.97; }}
              onPressOut={() => { buttonScale.value = 1; }}
              disabled={isLoading}
            >
              <Animated.View style={[styles.continueButton, buttonAnim, isLoading && styles.buttonDisabled]}>
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.continueText}>Continue</Text>
                )}
              </Animated.View>
            </Pressable>
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Social buttons */}
          <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.socialRow}>
            <Pressable style={styles.socialButton}>
              <GoogleIcon />
              <Text style={styles.socialText}>Google</Text>
            </Pressable>
            <Pressable style={styles.socialButton}>
              <AppleIcon />
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>
          </Animated.View>

          {/* Terms */}
          <Animated.View entering={FadeInUp.delay(700).springify()}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text> &{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </View>

        {/* Admin login - bottom */}
        <Animated.View entering={FadeInUp.delay(800).springify()} style={[styles.adminContainer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable onPress={handleAdminLogin}>
            <Text style={styles.adminText}>Admin Login (Temporary)</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================
// SVG ICONS - Thick stroke (2px)
// ============================================
const ICON_CLR = '#475569';
const SW = 2;

const LogoIcon = () => (
  <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
    <Circle cx={24} cy={24} r={20} fill="#5B8DEF" opacity={0.15} />
    <Circle cx={24} cy={24} r={14} stroke="#5B8DEF" strokeWidth={2.5} fill="none" />
    <Text 
      style={{ position: 'absolute', fontSize: 20, fontWeight: '700', color: '#5B8DEF' }}
    >₹</Text>
    <Path d="M18 24h12M20 20h8M20 28h8" stroke="#5B8DEF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const PhoneIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
      stroke={ICON_CLR}
      strokeWidth={SW}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
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

const AppleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill="#1E293B"
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
  blobDecor: {
    position: 'absolute',
    top: -50,
    right: -80,
    opacity: 0.6,
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
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...THEME_SHADOWS.elevated,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },

  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#64748B',
  },

  // Input
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    ...THEME_SHADOWS.card,
  },
  inputFocused: {
    borderColor: '#3B82F6',
  },
  inputError: {
    borderColor: '#DC2626',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
    marginTop: 8,
    marginLeft: 4,
  },

  // Button
  continueButton: {
    height: 56,
    backgroundColor: '#121723',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME_SHADOWS.elevated,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
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
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...THEME_SHADOWS.card,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Terms
  termsText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Admin
  adminContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  adminText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
