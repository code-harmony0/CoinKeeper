/**
 * OnboardingScreen - Blob Theme
 * 3 swipeable slides introducing app features
 */
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Pressable,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_SHADOWS, THEME_ANIMATION } from '../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: '1',
    headline: 'Track Expenses\nEffortlessly',
    subtext: 'Record every rupee with a single tap. Stay on top of your spending.',
    accent: '#FEF3E2',
    icon: 'expense',
  },
  {
    id: '2',
    headline: 'Manage Chit Funds\nTogether',
    subtext: 'Create groups, track contributions, and never miss a draw date.',
    accent: '#ECFDF5',
    icon: 'group',
  },
  {
    id: '3',
    headline: 'Smart SMS\nDetection',
    subtext: 'Automatically detect bank transactions and categorize them for you.',
    accent: '#F5F3FF',
    icon: 'sms',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useSharedValue(1);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
      ReactNativeHapticFeedback.trigger('impactLight');
    }
  };

  const handleContinue = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onComplete();
  };

  const buttonAnim = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: withSpring(buttonScale.value, THEME_ANIMATION.spring) }],
    };
  });

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
    <View style={styles.slide}>
      {/* Illustration */}
      <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.illustrationContainer, { backgroundColor: item.accent }]}>
        <SlideIllustration type={item.icon} />
      </Animated.View>

      {/* Text content */}
      <View style={styles.textContainer}>
        <Animated.Text entering={FadeInDown.delay(300).springify()} style={styles.headline}>
          {item.headline}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(400).springify()} style={styles.subtext}>
          {item.subtext}
        </Animated.Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#C2DFF7', '#D8E2FA', '#CFD9F1']} style={StyleSheet.absoluteFill} />

      {/* Skip button */}
      <Animated.View entering={FadeIn.delay(500)} style={[styles.skipContainer, { top: insets.top + 16 }]}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.flatList}
        contentContainerStyle={{ paddingTop: insets.top + 60 }}
      />

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                activeIndex === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Continue button */}
        <Pressable
          onPress={handleContinue}
          onPressIn={() => { buttonScale.value = 0.97; }}
          onPressOut={() => { buttonScale.value = 1; }}
        >
          <Animated.View style={[styles.continueButton, buttonAnim]}>
            <Text style={styles.continueText}>
              {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
};

// Slide illustrations
const SlideIllustration: React.FC<{ type: string }> = ({ type }) => {
  const ICON_CLR = '#475569';
  const SW = 2;

  if (type === 'expense') {
    return (
      <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
        {/* Large coin blob */}
        <Circle cx={70} cy={60} r={45} fill="#FBBF24" opacity={0.3} />
        <Circle cx={70} cy={60} r={32} stroke="#F59E0B" strokeWidth={3} fill="none" />
        <Path d="M60 55h20M60 65h20M66 50v25" stroke="#F59E0B" strokeWidth={2.5} strokeLinecap="round" />
        {/* Chart bars */}
        <Rect x={40} y={100} width={12} height={25} rx={4} fill="#FDA4AF" />
        <Rect x={58} y={90} width={12} height={35} rx={4} fill="#6EE7B7" />
        <Rect x={76} y={105} width={12} height={20} rx={4} fill="#93C5FD" />
        <Rect x={94} y={95} width={12} height={30} rx={4} fill="#C4B5FD" />
      </Svg>
    );
  }

  if (type === 'group') {
    return (
      <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
        {/* Connected avatars */}
        <Circle cx={45} cy={50} r={22} fill="#6EE7B7" opacity={0.4} />
        <Circle cx={45} cy={50} r={14} stroke="#059669" strokeWidth={2.5} fill="none" />
        <Circle cx={95} cy={50} r={22} fill="#93C5FD" opacity={0.4} />
        <Circle cx={95} cy={50} r={14} stroke="#3B82F6" strokeWidth={2.5} fill="none" />
        <Circle cx={70} cy={95} r={22} fill="#C4B5FD" opacity={0.4} />
        <Circle cx={70} cy={95} r={14} stroke="#7C3AED" strokeWidth={2.5} fill="none" />
        {/* Connection lines */}
        <Path d="M55 60 L62 80" stroke="#CBD5E1" strokeWidth={2} strokeLinecap="round" />
        <Path d="M85 60 L78 80" stroke="#CBD5E1" strokeWidth={2} strokeLinecap="round" />
        <Path d="M55 48 L85 48" stroke="#CBD5E1" strokeWidth={2} strokeLinecap="round" />
        {/* Center rupee */}
        <Circle cx={70} cy={55} r={12} fill="#FEF3E2" stroke="#F59E0B" strokeWidth={2} />
        <Path d="M66 52h8M66 58h8" stroke="#F59E0B" strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    );
  }

  // SMS type
  return (
    <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
      {/* Message bubble */}
      <Path
        d="M25 40 C25 30, 35 25, 50 25 L90 25 C105 25, 115 35, 115 50 L115 75 C115 90, 105 95, 90 95 L55 95 L40 110 L40 95 L50 95 C35 95, 25 85, 25 70 Z"
        fill="#C4B5FD"
        opacity={0.4}
      />
      <Rect x={40} y={40} width={60} height={8} rx={4} fill="#7C3AED" opacity={0.6} />
      <Rect x={40} y={55} width={45} height={8} rx={4} fill="#7C3AED" opacity={0.4} />
      <Rect x={40} y={70} width={35} height={8} rx={4} fill="#7C3AED" opacity={0.3} />
      {/* Arrow */}
      <Path d="M85 85 L100 100 L115 85" stroke="#7C3AED" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Organized cards */}
      <Rect x={95} y={105} width={35} height={12} rx={4} fill="#6EE7B7" />
      <Rect x={95} y={120} width={35} height={12} rx={4} fill="#93C5FD" />
    </Svg>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustrationContainer: {
    width: 220,
    height: 220,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    ...THEME_SHADOWS.card,
  },
  textContainer: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtext: {
    fontSize: 16,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    gap: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CFD9F1',
  },
  dotActive: {
    backgroundColor: '#1E293B',
    width: 24,
  },
  continueButton: {
    height: 56,
    backgroundColor: '#121723',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME_SHADOWS.elevated,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OnboardingScreen;
