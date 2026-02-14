import React, { memo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const TAB_COUNT = 5;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;
const INDICATOR_HEIGHT = 4;

interface AnimatedIndicatorProps {
  translateX: SharedValue<number>;
  indicatorWidth: SharedValue<number>;
}

export const AnimatedIndicator: React.FC<AnimatedIndicatorProps> = memo(
  ({ translateX, indicatorWidth }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const width = indicatorWidth.value;
      const xPos = translateX.value * TAB_WIDTH + (TAB_WIDTH - width) / 2;

      return {
        width,
        transform: [{ translateX: xPos }],
        borderRadius: width / 2,
      };
    });

    return <Animated.View style={[styles.indicator, animatedStyle]} />;
  }
);

AnimatedIndicator.displayName = 'AnimatedIndicator';

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    height: INDICATOR_HEIGHT,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
