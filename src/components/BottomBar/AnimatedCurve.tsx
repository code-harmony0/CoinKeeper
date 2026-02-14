import React, { memo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedProps,
  SharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { BOTTOM_BAR_COLORS } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const BAR_HEIGHT = 72;
const CURVE_WIDTH = 72;
const CURVE_DEPTH = 36;
const TAB_COUNT = 5;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedCurveProps {
  curveOffset: SharedValue<number>;
  curveStretch: SharedValue<number>;
}

export const AnimatedCurve: React.FC<AnimatedCurveProps> = memo(
  ({ curveOffset, curveStretch }) => {
    const animatedProps = useAnimatedProps(() => {
      // Calculate curve center position based on active tab
      const centerX = curveOffset.value * TAB_WIDTH + TAB_WIDTH / 2;
      
      // Stretch effect: widen curve during animation
      const stretch = interpolate(
        curveStretch.value,
        [0, 1],
        [1, 1.3],
        Extrapolation.CLAMP
      );
      
      const halfWidth = (CURVE_WIDTH / 2) * stretch;
      const depth = CURVE_DEPTH;
      
      // Curve control points
      const leftX = centerX - halfWidth;
      const rightX = centerX + halfWidth;
      const controlOffset = halfWidth * 0.6;
      
      // Build the full bar path with notch
      const path = `
        M 0 ${BAR_HEIGHT}
        L 0 24
        Q 0 0 24 0
        L ${leftX - 24} 0
        Q ${leftX} 0 ${leftX} 0
        C ${leftX + controlOffset} 0 ${centerX - controlOffset} ${depth} ${centerX} ${depth}
        C ${centerX + controlOffset} ${depth} ${rightX - controlOffset} 0 ${rightX} 0
        Q ${rightX} 0 ${rightX + 24} 0
        L ${BAR_WIDTH - 24} 0
        Q ${BAR_WIDTH} 0 ${BAR_WIDTH} 24
        L ${BAR_WIDTH} ${BAR_HEIGHT}
        Z
      `;
      
      return { d: path };
    });

    return (
      <Svg
        width={BAR_WIDTH}
        height={BAR_HEIGHT + CURVE_DEPTH}
        style={styles.svg}
      >
        <AnimatedPath
          animatedProps={animatedProps}
          fill={BOTTOM_BAR_COLORS.bar}
        />
      </Svg>
    );
  }
);

AnimatedCurve.displayName = 'AnimatedCurve';

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
