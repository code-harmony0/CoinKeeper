import React, { memo } from 'react';
import { Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useFabAnimation } from './hooks/useBottomBarAnimation';
import { TAB_THEMES, BAR_CONSTANTS } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const FAB_SIZE = BAR_CONSTANTS.FAB_SIZE;
const WAVE_DEPTH = BAR_CONSTANTS.WAVE_DEPTH;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FabButtonProps {
  fabX: SharedValue<number>;
  onPress: () => void;
}

export const FabButton: React.FC<FabButtonProps> = memo(({ fabX, onPress }) => {
  const { animatedStyle: pulseStyle, onPressIn, onPressOut } = useFabAnimation();

  // Position FAB to follow the wave center
  const positionStyle = useAnimatedStyle(() => ({
    left: fabX.value - FAB_SIZE / 2,
  }));

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
            stroke={TAB_THEMES.activity.barFill}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </AnimatedPressable>
    </Animated.View>
  );
});

FabButton.displayName = 'FabButton';

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    top: -(WAVE_DEPTH + FAB_SIZE / 2 - 4),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: TAB_THEMES.activity.fabFill,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BAR_CONSTANTS.SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
});
