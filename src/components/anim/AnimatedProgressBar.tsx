import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSpecTheme } from '../../theme/specTheme';

export interface AnimatedProgressBarProps {
  progress: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  delay?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 8,
  trackColor,
  fillColor,
  delay = 0,
}) => {
  const { colors, spring } = useSpecTheme();
  const widthPercent = useSharedValue(0);
  const clampedProgress = Math.min(Math.max(progress, 0), 1) * 100;

  const animate = useCallback(() => {
    widthPercent.value = withDelay(delay, withSpring(clampedProgress, spring));
    return () => {
      widthPercent.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedProgress, delay]);

  useFocusEffect(animate);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthPercent.value}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? colors.chipBg,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: fillColor ?? colors.primaryAccent,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default AnimatedProgressBar;
