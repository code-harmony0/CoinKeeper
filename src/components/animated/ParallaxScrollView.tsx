import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface ParallaxScrollViewProps {
  children: ReactNode;
  headerContent?: ReactNode;
  headerHeight?: number;
  style?: ViewStyle;
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const ParallaxScrollView: React.FC<ParallaxScrollViewProps> = ({
  children,
  headerContent,
  headerHeight = 200,
  style,
}) => {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, headerHeight],
      [0, -headerHeight / 2],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [-headerHeight, 0, headerHeight],
      [1.5, 1, 0.9],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight / 2, headerHeight],
      [1, 0.7, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  return (
    <AnimatedScrollView
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      style={style}
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      {headerContent && (
        <Animated.View style={[styles.header, { height: headerHeight }, headerAnimatedStyle]}>
          {headerContent}
        </Animated.View>
      )}
      {children}
    </AnimatedScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
    overflow: 'hidden',
  },
});
