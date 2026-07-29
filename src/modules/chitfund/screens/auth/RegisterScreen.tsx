import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput as RNTextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  useAnimatedKeyboard,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, ArrowLeft } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { colors, spacing, typography, radii, shadows } from '../../../../theme/designTokens';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animation values
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);
  const keyboard = useAnimatedKeyboard();

  useEffect(() => {
    // Entrance animation
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
      { translateY: -keyboard.height.value * 0.2 },
    ],
  }));

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 20, stiffness: 200 }),
      withSpring(1, { damping: 20, stiffness: 200 })
    );

    try {
      const user = auth().currentUser;

      if (user) {
        // Update user profile in Firestore
        await firestore().collection('users').doc(user.uid).update({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        // Navigate to Permission screen
        setTimeout(() => {
          navigation.replace('Permission');
        }, 300);
      } else {
        setError('User not found. Please login again.');
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.backgroundGradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.formContainer, formStyle]}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconGradient}>
                  <User size={32} color={colors.white} strokeWidth={2} />
                </View>
              </View>

              {/* Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.subtitle}>
                  Tell us a bit about yourself to get started
                </Text>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Form Fields */}
              <View style={styles.formFields}>
                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputCard}>
                    <RNTextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.textTertiary}
                      autoFocus
                      editable={!isLoading}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputCard}>
                    <RNTextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your.email@example.com"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>
                </View>
              </View>

              {/* Continue Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  onPress={handleContinue}
                  disabled={isLoading || !name.trim() || !email.trim()}
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed && styles.continueButtonPressed,
                    (isLoading || !name.trim() || !email.trim()) && styles.continueButtonDisabled,
                  ]}
                >
                  <View style={styles.continueGradient}>
                    <Text style={styles.continueText}>
                      {isLoading ? 'Saving...' : 'Continue'}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              {/* Privacy Note */}
              <Text style={styles.privacyText}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
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
  formFields: {
    width: '100%',
    gap: spacing.l,
    marginBottom: spacing.xl,
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  inputCard: {
    backgroundColor: colors.white,
    borderRadius: radii.l,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    ...shadows.card,
  },
  input: {
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
    padding: 0,
  },
  continueButton: {
    width: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
    ...shadows.card,
  },
  continueButtonPressed: {
    opacity: 0.9,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueGradient: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.m + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  privacyText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.l,
    paddingHorizontal: spacing.xl,
    lineHeight: 18,
  },
});

export default RegisterScreen;
