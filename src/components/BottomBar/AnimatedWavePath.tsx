import React, { memo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedProps,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { generateWavePath } from './hooks/useBottomBarAnimation';
import { BAR_CONSTANTS } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const BAR_HEIGHT = BAR_CONSTANTS.HEIGHT;
const WAVE_OFFSET = BAR_CONSTANTS.WAVE_DEPTH + 10; // Extra space for wave dip

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedWavePathProps {
  waveCenterX: SharedValue<number>;
  waveDepth: SharedValue<number>;
}

export const AnimatedWavePath: React.FC<AnimatedWavePathProps> = memo(
  ({ waveCenterX, waveDepth }) => {
    const animatedProps = useAnimatedProps(() => {
      const path = generateWavePath(
        BAR_WIDTH,
        BAR_HEIGHT,
        waveCenterX.value,
        BAR_CONSTANTS.WAVE_RADIUS,
        waveDepth.value,
        BAR_CONSTANTS.CORNER_RADIUS
      );
      return { d: path };
    });

    return (
      <Svg
        width={BAR_WIDTH}
        height={BAR_HEIGHT + WAVE_OFFSET}
        style={styles.svg}
        viewBox={`0 ${-WAVE_OFFSET} ${BAR_WIDTH} ${BAR_HEIGHT + WAVE_OFFSET}`}
      >
        {/* Shadow layer */}
        <AnimatedPath
          animatedProps={animatedProps}
          fill="rgba(18, 23, 35, 0.06)"
          transform="translate(0, 4)"
        />
        {/* Main bar */}
        <AnimatedPath
          animatedProps={animatedProps}
          fill="#FFFFFF"
        />
      </Svg>
    );
  }
);

AnimatedWavePath.displayName = 'AnimatedWavePath';

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
