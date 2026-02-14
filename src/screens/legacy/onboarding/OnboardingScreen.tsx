import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, FlatList, Animated } from 'react-native';
import { SafeContainer } from '../../components/core/SafeContainer';
import { Heading, BodyText } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { SPACING, COLORS, RADIUS } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Track Your Expenses',
    description: 'Easily monitor your daily expenses and income with beautiful, intuitive interface',
    emoji: '💳',
  },
  {
    id: '2',
    title: 'Auto SMS Extraction',
    description: 'Automatically extract transaction details from bank SMS messages',
    emoji: '📱',
  },
  {
    id: '3',
    title: 'Manage Chit Funds',
    description: 'Create and manage chit fund groups with transparent tracking',
    emoji: '🤝',
  },
  {
    id: '4',
    title: 'Stay on Budget',
    description: 'Set budgets, get insights, and make better financial decisions',
    emoji: '📊',
  },
];

type Props = NativeStackScreenProps<any, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace('Login');
    }
  };

  const skip = () => {
    navigation.replace('Login');
  };

  return (
    <SafeContainer scrollable={false} showBlobs={true}>
      <View style={styles.container}>
        <FlatList
          ref={slidesRef}
          data={SLIDES}
          renderItem={({ item }) => <OnboardingSlideItem item={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
        />
        
        <View style={styles.footer}>
          <Paginator data={SLIDES} scrollX={scrollX} />
          
          <View style={styles.buttonContainer}>
            <Button
              title="Skip"
              onPress={skip}
              variant="text"
              style={styles.skipButton}
            />
            <Button
              title={currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
              onPress={scrollTo}
              gradient={COLORS.gradientBlue}
              style={styles.nextButton}
            />
          </View>
        </View>
      </View>
    </SafeContainer>
  );
};

const OnboardingSlideItem: React.FC<{ item: OnboardingSlide }> = ({ item }) => {
  return (
    <View style={styles.slide}>
      <View style={styles.emojiContainer}>
        <Heading level={1} style={styles.emoji}>{item.emoji}</Heading>
      </View>
      <Heading level={2} align="center" style={styles.title}>
        {item.title}
      </Heading>
      <BodyText align="center" color={COLORS.grayText} style={styles.description}>
        {item.description}
      </BodyText>
    </View>
  );
};

const Paginator: React.FC<{ data: OnboardingSlide[]; scrollX: Animated.Value }> = ({
  data,
  scrollX,
}) => {
  return (
    <View style={styles.paginatorContainer}>
      {data.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index.toString()}
            style={[styles.dot, { width: dotWidth, opacity }]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emojiContainer: {
    width: 160,
    height: 160,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    marginBottom: SPACING.md,
  },
  description: {
    paddingHorizontal: SPACING.md,
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
  },
  paginatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.babyBlue,
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
    marginLeft: SPACING.md,
  },
});
