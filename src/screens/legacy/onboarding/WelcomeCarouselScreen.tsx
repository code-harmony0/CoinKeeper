import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Pressable, StatusBar } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heading, BodyText, Caption } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight,
  PiggyBank,
  LineChart,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = NativeStackScreenProps<any, 'Welcome'>;

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string[];
  illustrationColor: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Track Every Penny',
    subtitle: 'Smart Expense Management',
    description: 'Effortlessly track your daily expenses with automatic SMS detection and beautiful insights.',
    icon: <TrendingUp size={88} color={COLORS.navyText} strokeWidth={2} />,
    gradient: COLORS.gradientBlue,
    illustrationColor: COLORS.babyBlue,
  },
  {
    id: '2',
    title: 'Manage Chit Funds',
    subtitle: 'Community Savings Made Easy',
    description: 'Join and manage chit fund groups with your friends, family, or colleagues seamlessly.',
    icon: <Users size={88} color={COLORS.navyText} strokeWidth={2} />,
    gradient: COLORS.gradientPeach,
    illustrationColor: COLORS.softPeach,
  },
  {
    id: '3',
    title: 'Grow Your Wealth',
    subtitle: 'Achieve Financial Goals',
    description: 'Set budgets, analyze spending patterns, and watch your savings grow with smart insights.',
    icon: <PiggyBank size={88} color={COLORS.navyText} strokeWidth={2} />,
    gradient: COLORS.gradientMint,
    illustrationColor: COLORS.mintGreen,
  },
];

export const WelcomeCarouselScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const handleNext = () => {
    ReactNativeHapticFeedback.trigger('impactLight');

    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.replace('Login');
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <SlideItem
      item={item}
      index={index}
      scrollX={scrollX}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Skip Button */}
      {currentIndex < SLIDES.length - 1 && (
        <Pressable
          onPress={handleSkip}
          style={[styles.skipButton, { top: insets.top + SPACING.md }]}
        >
          <Caption color="rgba(255, 255, 255, 0.8)" medium>Skip</Caption>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(newIndex);
        }}
      />

      {/* Bottom Controls */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <PaginationDot
              key={index}
              index={index}
              currentIndex={currentIndex}
            />
          ))}
        </View>

        {/* Next/Get Started Button */}
        <Button
          title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          gradient={SLIDES[currentIndex].gradient}
          icon={<ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />}
          iconPosition="right"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const SlideItem: React.FC<{
  item: OnboardingSlide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}> = ({ item, index, scrollX }) => {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [50, 0, 50],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  return (
    <View style={styles.slideContainer}>
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Blobs */}
      <View style={styles.blobsContainer}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <View style={[styles.blob, styles.blob3]} />
      </View>

      <Animated.View style={[styles.slideContent, animatedStyle]}>
        {/* Illustration Circle */}
        <View style={styles.illustrationContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
            style={styles.illustrationCircle}
          >
            {item.icon}

            {/* Decorative Elements */}
            <View style={[styles.decorativeCircle, styles.decorCircle1]}>
              <Sparkles size={16} color={item.illustrationColor} fill={item.illustrationColor} />
            </View>
            <View style={[styles.decorativeCircle, styles.decorCircle2]}>
              <Sparkles size={12} color={item.illustrationColor} fill={item.illustrationColor} />
            </View>
          </LinearGradient>
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Caption color="rgba(255, 255, 255, 0.9)" medium style={styles.subtitle}>
            {item.subtitle}
          </Caption>
          <Heading level={2} color="#FFFFFF" style={styles.title}>
            {item.title}
          </Heading>
          <BodyText color="rgba(255, 255, 255, 0.85)" align="center" style={styles.description}>
            {item.description}
          </BodyText>
        </View>
      </Animated.View>
    </View>
  );
};

const PaginationDot: React.FC<{
  index: number;
  currentIndex: number;
}> = ({ index, currentIndex }) => {
  const scale = useSharedValue(index === currentIndex ? 1 : 0.8);
  const width = useSharedValue(index === currentIndex ? 24 : 8);

  React.useEffect(() => {
    scale.value = withSpring(index === currentIndex ? 1 : 0.8, {
      damping: 15,
      stiffness: 150,
    });
    width.value = withSpring(index === currentIndex ? 24 : 8, {
      damping: 15,
      stiffness: 150,
    });
  }, [currentIndex, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    width: width.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        index === currentIndex && styles.dotActive,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.babyBlue,
  },
  skipButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  blobsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blob1: {
    width: 250,
    height: 250,
    top: '10%',
    right: -80,
  },
  blob2: {
    width: 200,
    height: 200,
    bottom: '20%',
    left: -60,
  },
  blob3: {
    width: 150,
    height: 150,
    top: '50%',
    left: '10%',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  illustrationContainer: {
    marginBottom: SPACING.xxl * 2,
  },
  illustrationCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  decorCircle1: {
    top: 20,
    right: 10,
  },
  decorCircle2: {
    bottom: 30,
    left: 15,
  },
  textContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  subtitle: {
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.md,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  button: {
    width: '100%',
  },
});
