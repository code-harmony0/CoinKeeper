import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { MessageSquare, Shield, ArrowRight } from 'lucide-react-native';
import { PermissionsAndroid } from 'react-native';
import { colors, spacing, typography, radii, shadows } from '../../../../theme/designTokens';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface PermissionScreenProps {
  navigation: any;
}

const PermissionScreen: React.FC<PermissionScreenProps> = ({ navigation }) => {
  // Animation values
  const iconScale = useSharedValue(1);
  const gradientOpacity = useSharedValue(0.5);
  const buttonScale = useSharedValue(1);
  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(30);

  useEffect(() => {
    // Entrance animation
    containerOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    containerTranslateY.value = withSpring(0, {
      damping: 24,
      stiffness: 120,
    });

    // Icon bounce animation
    iconScale.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 18, stiffness: 150 }),
        withSpring(1, { damping: 18, stiffness: 150 })
      ),
      -1, // infinite
      false
    );

    // Gradient pulse
    gradientOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacity.value,
  }));

  const requestSMSPermission = async () => {
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 20, stiffness: 200 }),
      withSpring(1, { damping: 20, stiffness: 200 })
    );

    if (Platform.OS !== 'android') {
      // iOS doesn't need SMS permission for reading
      await completeOnboarding();
      return;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'CoinKeeper needs access to read SMS messages to automatically track bank transactions.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('SMS permission granted');
        await completeOnboarding();
      } else {
        console.log('SMS permission denied');
        // User can still proceed but won't have auto-parsing
        Alert.alert(
          'Permission Denied',
          'You can still use CoinKeeper, but automatic transaction tracking from SMS will not be available. You can enable this later in settings.',
          [
            {
              text: 'Continue Anyway',
              onPress: async () => await completeOnboarding(),
            },
            { text: 'Try Again', onPress: requestSMSPermission },
          ]
        );
      }
    } catch (err) {
      console.error('Permission request error:', err);
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      const user = auth().currentUser;
      if (user) {
        // Mark onboarding as completed
        await firestore().collection('users').doc(user.uid).update({
          onboardingCompleted: true,
          smsPermissionGranted: true, // You can track actual permission status
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // Navigate to main app
      navigation.replace('UserDashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigation.replace('UserDashboard');
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip SMS Permission?',
      'You can enable automatic transaction tracking later in settings.',
      [
        {
          text: 'Go Back',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: async () => {
            try {
              const user = auth().currentUser;
              if (user) {
                await firestore().collection('users').doc(user.uid).update({
                  onboardingCompleted: true,
                  smsPermissionGranted: false,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
              }
              navigation.replace('UserDashboard');
            } catch (error) {
              console.error('Error skipping permission:', error);
              navigation.replace('UserDashboard');
            }
          },
        },
      ]
    );
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
        <Animated.View style={[styles.content, containerStyle]}>
          {/* Icon with animated gradient background */}
          <View style={styles.iconContainer}>
            <Animated.View style={[styles.gradientCircle, gradientStyle]}>
              <View style={styles.gradientInner} />
            </Animated.View>

            <Animated.View style={[styles.iconWrapper, iconStyle]}>
              <MessageSquare size={64} color={colors.white} strokeWidth={1.5} />
            </Animated.View>
          </View>

          {/* Title & Description */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Enable Smart Tracking</Text>
            <Text style={styles.description}>
              Let CoinKeeper automatically read your bank SMS messages to track transactions in real-time.
            </Text>

            {/* Features List */}
            <View style={styles.featuresList}>
              <FeatureItem
                icon={Shield}
                text="Your messages stay private and secure"
              />
              <FeatureItem
                icon={MessageSquare}
                text="Only reads bank transaction messages"
              />
              <FeatureItem
                icon={ArrowRight}
                text="Automatic expense & income tracking"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={requestSMSPermission}
                style={({ pressed }) => [
                  styles.enableButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <View style={styles.enableGradient}>
                  <Text style={styles.enableText}>Enable SMS Access</Text>
                </View>
              </Pressable>
            </Animated.View>

            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for Now</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

// Feature Item Component
interface FeatureItemProps {
  icon: typeof Shield;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon: Icon, text }) => {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrapper}>
        <Icon size={20} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.l,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
    position: 'relative',
  },
  gradientCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
  },
  gradientInner: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.m,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.m,
  },
  featuresList: {
    marginTop: spacing.l,
    gap: spacing.m,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderRadius: radii.l,
    ...shadows.card,
  },
  featureIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: spacing.m,
  },
  enableButton: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    ...shadows.card,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  enableGradient: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.m + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});

export default PermissionScreen;
