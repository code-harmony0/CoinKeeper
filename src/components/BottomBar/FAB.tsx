import React, { memo } from 'react';
import { Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useFabPulse } from './hooks/useBottomBarAnimation';
import { BOTTOM_BAR_COLORS } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const TAB_COUNT = 5;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;
const FAB_SIZE = 56;
const CURVE_DEPTH = 36;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FABProps {
  curveOffset: SharedValue<number>;
  onPress: () => void;
}

export const FAB: React.FC<FABProps> = memo(({ curveOffset, onPress }) => {
  const { animatedStyle: pulseStyle, onPressIn, onPressOut } = useFabPulse();

  // Position FAB to follow the curve
  const positionStyle = useAnimatedStyle(() => {
    const centerX = curveOffset.value * TAB_WIDTH + TAB_WIDTH / 2;
    return {
      left: centerX - FAB_SIZE / 2,
    };
  });

  const handlePress = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    onPress();
  };

  return (
    <Animated.View style={[styles.fabContainer, positionStyle]}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.fab, pulseStyle]}
        accessibilityRole="button"
        accessibilityLabel="Add new item"
      >
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 5V19M5 12H19"
            stroke={BOTTOM_BAR_COLORS.fabIcon}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </AnimatedPressable>
    </Animated.View>
  );
});

FAB.displayName = 'FAB';

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    top: CURVE_DEPTH - FAB_SIZE / 2 - 4,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: BOTTOM_BAR_COLORS.fab,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BOTTOM_BAR_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
});
