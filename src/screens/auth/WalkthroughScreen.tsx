import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Wallet, TrendingUp, Users, Shield } from 'lucide-react-native';
import { colors, typography, spacing, radii } from '../../theme/designTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WalkthroughPage {
  id: number;
  title: string;
  description: string;
  icon: typeof Wallet;
  gradient: string[];
}

const WALKTHROUGH_PAGES: WalkthroughPage[] = [
  {
    id: 0,
    title: 'Track Every Coin',
    description: 'Monitor all your expenses and income in one beautiful place. Auto-parse SMS from banks.',
    icon: Wallet,
    gradient: ['#1A1A1A', '#000000'], // Black gradient
  },
  {
    id: 1,
    title: 'Grow Your Wealth',
    description: 'Set budgets, track trends, and watch your savings grow with smart insights.',
    icon: TrendingUp,
    gradient: [colors.accent, '#B8E5E1'],
  },
  {
    id: 2,
    title: 'Join Chit Funds',
    description: 'Participate in traditional chit funds with your group. Track contributions and draws.',
    icon: Users,
    gradient: ['#4A5568', '#2D3748'], // Dark gray gradient
  },
  {
    id: 3,
    title: 'Secure & Private',
    description: 'Your financial data is encrypted and secure. Phone authentication keeps it safe.',
    icon: Shield,
    gradient: ['#1A1A1A', '#000000'], // Black gradient
  },
];

interface WalkthroughScreenProps {
  navigation: any;
}

const WalkthroughScreen: React.FC<WalkthroughScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleGetStarted = async () => {
    buttonScale.value = withSpring(0.95, { damping: 20, stiffness: 200 });
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 20, stiffness: 200 });
    }, 150);

    // Mark onboarding as completed
    try {
      await AsyncStorage.setItem('hasSeenWalkthrough', 'true');
    } catch (error) {
      console.error('Error saving walkthrough status:', error);
    }

    // Navigate to Login
    setTimeout(() => {
      navigation.replace('Login');
    }, 200);
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWalkthrough', 'true');
    } catch (error) {
      console.error('Error saving walkthrough status:', error);
    }
    navigation.replace('Login');
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
        {/* Skip Button */}
        <View style={styles.header}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Scrollable Pages */}
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
          style={styles.scrollView}
        >
          {WALKTHROUGH_PAGES.map((page, index) => (
            <WalkthroughPage
              key={page.id}
              page={page}
              index={index}
              scrollX={scrollX}
            />
          ))}
        </Animated.ScrollView>

        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {WALKTHROUGH_PAGES.map((_, index) => (
            <PaginationDot
              key={index}
              index={index}
              scrollX={scrollX}
            />
          ))}
        </View>

        {/* Get Started Button (only on last page) */}
        {currentIndex === WALKTHROUGH_PAGES.length - 1 && (
          <Animated.View style={[styles.buttonContainer]}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.getStartedButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.buttonGradient}>
                <Text style={styles.getStartedText}>Get Started</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
};

// Individual Page Component
interface WalkthroughPageProps {
  page: WalkthroughPage;
  index: number;
  scrollX: Animated.SharedValue<number>;
}

const WalkthroughPage: React.FC<WalkthroughPageProps> = ({ page, index, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [50, 0, 50],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const Icon = page.icon;

  return (
    <View style={styles.pageContainer}>
      <Animated.View style={[styles.pageContent, animatedStyle]}>
        <LinearGradient
          colors={page.gradient}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon size={64} color={colors.white} strokeWidth={1.5} />
        </LinearGradient>

        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.description}>{page.description}</Text>
      </Animated.View>
    </View>
  );
};

// Pagination Dot Component
interface PaginationDotProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
}

const PaginationDot: React.FC<PaginationDotProps> = ({ index, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    return {
      width,
      opacity,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
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
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  skipText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  pageContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 28,
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
    paddingHorizontal: spacing.m,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  buttonContainer: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.l,
  },
  getStartedButton: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.m + 4,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
});

export default WalkthroughScreen;
