/**
 * SplashScreen - Blob Theme
 * Animated logo with tagline, auto-navigates after 2 seconds
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { THEME_SHADOWS, THEME_ANIMATION } from '../../theme/blobTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  // Animation values
  const topBlobScale = useSharedValue(0.8);
  const topBlobOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(20);
  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(10);
  const taglineOpacity = useSharedValue(0);
  const bottomBlobScale = useSharedValue(0.8);
  const bottomBlobOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // Staggered animation sequence
    topBlobOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    topBlobScale.value = withDelay(100, withSpring(1, THEME_ANIMATION.spring));

    logoOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    logoTranslateY.value = withDelay(200, withSpring(0, THEME_ANIMATION.spring));

    brandOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    brandTranslateY.value = withDelay(400, withSpring(0, THEME_ANIMATION.spring));

    taglineOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    bottomBlobOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    bottomBlobScale.value = withDelay(300, withSpring(1, THEME_ANIMATION.spring));

    // Navigate after 2 seconds
    const timer = setTimeout(() => {
      screenOpacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(onComplete)();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Animated styles
  const topBlobStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: topBlobOpacity.value,
      transform: [{ scale: topBlobScale.value }],
    };
  });

  const logoStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: logoOpacity.value,
      transform: [{ translateY: logoTranslateY.value }],
    };
  });

  const brandStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: brandOpacity.value,
      transform: [{ translateY: brandTranslateY.value }],
    };
  });

  const taglineStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: taglineOpacity.value,
    };
  });

  const bottomBlobStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: bottomBlobOpacity.value,
      transform: [{ scale: bottomBlobScale.value }],
    };
  });

  const screenStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: screenOpacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <LinearGradient
        colors={['#C2DFF7', '#D8E2FA', '#CFD9F1']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top decorative blob */}
      <Animated.View style={[styles.topBlob, topBlobStyle]}>
        <Svg width={250} height={250} viewBox="0 0 200 200">
          <Path
            d="M45,-65C57.5,-55.5,66.5,-41,72,-25C77.5,-9,79.5,8.5,74,23C68.5,37.5,55.5,49,41,58.5C26.5,68,10.5,75.5,-6,76.5C-22.5,77.5,-39.5,72,-52,61C-64.5,50,-72.5,33.5,-75,16C-77.5,-1.5,-74.5,-20,-66,-35C-57.5,-50,-43.5,-61.5,-28.5,-70C-13.5,-78.5,2.5,-84,18,-82.5C33.5,-81,57.5,-72.5,45,-65Z"
            fill="#B8D4EA"
            opacity={0.4}
            transform="translate(100 100)"
          />
        </Svg>
      </Animated.View>

      {/* Bottom decorative blob */}
      <Animated.View style={[styles.bottomBlob, bottomBlobStyle]}>
        <Svg width={200} height={200} viewBox="0 0 200 200">
          <Path
            d="M40,-50C52,-40,62,-28,67,-13C72,2,72,20,64,35C56,50,40,62,23,68C6,74,-12,74,-28,68C-44,62,-58,50,-65,35C-72,20,-72,2,-66,-14C-60,-30,-48,-44,-34,-54C-20,-64,-4,-70,10,-68C24,-66,28,-60,40,-50Z"
            fill="#D4E8F5"
            opacity={0.35}
            transform="translate(100 100)"
          />
        </Svg>
      </Animated.View>

      {/* Center content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logo}>
            <LogoIcon />
          </View>
        </Animated.View>

        {/* Brand name */}
        <Animated.View style={brandStyle}>
          <Text style={styles.brandName}>CoinKeeper</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>Track. Save. Grow.</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// Logo SVG
const LogoIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
    {/* Outer blob shape */}
    <Path
      d="M28 4C38 4 46 10 50 18C54 26 52 36 46 44C40 52 30 54 20 50C10 46 4 38 4 28C4 18 10 10 18 6C22 4 26 4 28 4Z"
      fill="#5B8DEF"
      opacity={0.15}
    />
    {/* Inner circle */}
    <Circle cx={28} cy={28} r={18} stroke="#5B8DEF" strokeWidth={3} fill="none" />
    {/* Rupee symbol lines */}
    <Path d="M20 22h16M20 28h16M24 22v14l8-8" stroke="#5B8DEF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBlob: {
    position: 'absolute',
    top: -80,
    right: -60,
  },
  bottomBlob: {
    position: 'absolute',
    bottom: -60,
    left: -50,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME_SHADOWS.elevated,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
