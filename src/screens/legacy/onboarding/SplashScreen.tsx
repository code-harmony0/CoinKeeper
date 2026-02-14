import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Heading } from '../../components/core/Typography';
import { SPACING, COLORS, RADIUS } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Wallet, Sparkles } from 'lucide-react-native';

type Props = NativeStackScreenProps<any, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const sparkle1Scale = useSharedValue(0);
  const sparkle2Scale = useSharedValue(0);
  const sparkle3Scale = useSharedValue(0);
  const backgroundOpacity = useSharedValue(0);

  useEffect(() => {
    // Background fade in
    backgroundOpacity.value = withTiming(1, { duration: 800 });

    // Logo entrance with bounce
    logoScale.value = withDelay(
      300,
      withSpring(1, {
        damping: 10,
        stiffness: 100,
      })
    );

    // Logo subtle rotation
    logoRotate.value = withDelay(
      300,
      withSequence(
        withSpring(5, { damping: 8 }),
        withSpring(-5, { damping: 8 }),
        withSpring(0, { damping: 8 })
      )
    );

    // Title fade in and slide up
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(
      600,
      withSpring(0, {
        damping: 15,
        stiffness: 150,
      })
    );

    // Sparkles appear in sequence
    sparkle1Scale.value = withDelay(
      800,
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    sparkle2Scale.value = withDelay(
      900,
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    sparkle3Scale.value = withDelay(
      1000,
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    // Navigate to next screen after animation
    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const sparkle1Style = useAnimatedStyle(() => ({
    transform: [{ scale: sparkle1Scale.value }],
  }));

  const sparkle2Style = useAnimatedStyle(() => ({
    transform: [{ scale: sparkle2Scale.value }],
  }));

  const sparkle3Style = useAnimatedStyle(() => ({
    transform: [{ scale: sparkle3Scale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Animated Gradient Background */}
      <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle]}>
        <LinearGradient
          colors={['#BDE0FE', '#FFDAB9', '#E6DFFD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Floating Blobs Background */}
      <View style={styles.blobsContainer}>
        <Animated.View
          style={[styles.blob, styles.blob1, backgroundStyle]}
        />
        <Animated.View
          style={[styles.blob, styles.blob2, backgroundStyle]}
        />
        <Animated.View
          style={[styles.blob, styles.blob3, backgroundStyle]}
        />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Sparkles */}
        <Animated.View style={[styles.sparkle, styles.sparkle1, sparkle1Style]}>
          <Sparkles size={20} color="rgba(255, 255, 255, 0.8)" fill="rgba(255, 255, 255, 0.4)" />
        </Animated.View>

        <Animated.View style={[styles.sparkle, styles.sparkle2, sparkle2Style]}>
          <Sparkles size={16} color="rgba(255, 255, 255, 0.7)" fill="rgba(255, 255, 255, 0.3)" />
        </Animated.View>

        <Animated.View style={[styles.sparkle, styles.sparkle3, sparkle3Style]}>
          <Sparkles size={24} color="rgba(255, 255, 255, 0.9)" fill="rgba(255, 255, 255, 0.5)" />
        </Animated.View>

        {/* Logo Container */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <LinearGradient
            colors={['#FFFFFF', '#FAFAF8']}
            style={styles.logoCircle}
          >
            <Wallet size={72} color={COLORS.navyText} strokeWidth={2.5} />
          </LinearGradient>
        </Animated.View>

        {/* App Title */}
        <Animated.View style={titleAnimatedStyle}>
          <Heading level={1} color="#FFFFFF" style={styles.title}>
            CoinKeeper
          </Heading>
          <Heading level={4} color="rgba(255, 255, 255, 0.9)" style={styles.subtitle}>
            Track. Save. Grow.
          </Heading>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.babyBlue,
  },
  blobsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blob1: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -100,
    right: -100,
  },
  blob2: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(255, 218, 185, 0.15)',
    bottom: 100,
    left: -80,
  },
  blob3: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(230, 223, 253, 0.15)',
    top: '40%',
    right: -50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.xxl,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: '25%',
    left: '15%',
  },
  sparkle2: {
    top: '35%',
    right: '20%',
  },
  sparkle3: {
    bottom: '30%',
    left: '25%',
  },
});
