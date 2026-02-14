import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, spacing } from '../../theme/designTokens';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { user, userProfile, isLoading: isAuthLoading } = useAuth();

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.3);
  const backgroundFloat = useSharedValue(0);
  const exitOpacity = useSharedValue(1);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: backgroundFloat.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));

  const checkOnboardingStatus = async (): Promise<boolean> => {
    try {
      const hasSeenWalkthrough = await AsyncStorage.getItem('hasSeenWalkthrough');
      return hasSeenWalkthrough === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  useEffect(() => {
    // --- Start entrance animations ---
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 1000 }));
    logoScale.value = withDelay(200, withSpring(1, { damping: 20, stiffness: 100 }));
    backgroundFloat.value = withSequence(
      withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.quad) })
    );

    // --- Navigation Logic ---
    // TEMPORARY: Skip directly to Login screen (which then skips to home)
    const navigationTimer = setTimeout(() => {
      // Animate out before navigating
      exitOpacity.value = withTiming(0, { duration: 400 });

      setTimeout(() => {
        navigation.replace('Login');
      }, 400);

    }, 2000); // Reduced splash time for faster testing

    return () => clearTimeout(navigationTimer);

    /* ORIGINAL CODE - Commented out for testing:
    if (!isAuthLoading) {
      const navigationTimer = setTimeout(() => {
        exitOpacity.value = withTiming(0, { duration: 400 });

        const navigate = async () => {
          try {
            if (user && userProfile) {
              navigation.replace(userProfile.isAdmin ? 'AdminTabNavigator' : 'UserTabNavigator');
            } else {
              const hasSeenWalkthrough = await checkOnboardingStatus();
              navigation.replace(hasSeenWalkthrough ? 'Login' : 'Walkthrough');
            }
          } catch (e) {
              console.error("Navigation failed", e);
              navigation.replace('Login');
          }
        };

        setTimeout(navigate, 400);
      }, 2500);

      return () => clearTimeout(navigationTimer);
    }
    */
  }, [isAuthLoading, user, userProfile, navigation]);


  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['#F6F7FB', '#F2F3FA']} // Use hardcoded theme colors since designTokens might not be fully loaded
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <Animated.View style={[styles.floatingBackground, backgroundStyle]}>
        <View style={[styles.circle1, { backgroundColor: '#A8B0F0' }]} />
        <View style={[styles.circle2, { backgroundColor: '#E496B2' }]} />
      </Animated.View>

      <SafeAreaView style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={[styles.logoCircle, { backgroundColor: '#7B86E2' }]}>
            <Text style={[styles.logoText, { color: '#FFFFFF' }]}>CK</Text>
          </View>
          <Text style={[styles.appName, { color: '#2D3142' }]}>CoinKeeper</Text>
          <Text style={[styles.tagline, { color: '#6E7490' }]}>Manage your finances with ease</Text>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    floatingBackground: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    circle1: {
      position: 'absolute',
      width: 400,
      height: 400,
      borderRadius: 200,
      opacity: 0.1,
      top: -100,
      right: -100,
    },
    circle2: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
      opacity: 0.08,
      bottom: -80,
      left: -80,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      alignItems: 'center',
    },
    logoCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: 'rgba(123, 134, 226, 0.15)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    logoText: {
      fontSize: 48,
      fontWeight: 'bold',
      letterSpacing: -1,
    },
    appName: {
      fontSize: 32,
      fontWeight: 'bold',
      marginTop: 24,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 16,
      marginTop: 4,
    },
});

export default SplashScreen;