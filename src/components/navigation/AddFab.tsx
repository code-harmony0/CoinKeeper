import React, { useEffect, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { TAB_COLORS } from './theme/colors';

const FAB_SIZE = 52;

interface AddFabProps {
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AddFab: React.FC<AddFabProps> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  // Idle pulse animation
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.85, { damping: 8 }),
      withSpring(1.1, { damping: 10 }),
      withSpring(1, { damping: 12 })
    );
    ReactNativeHapticFeedback.trigger('impactMedium');
    onPress();
  }, [onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[styles.fab, fabStyle]}
      accessibilityRole="button"
      accessibilityLabel="Add new item"
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M12 5V19M5 12H19" stroke={TAB_COLORS.fabIcon} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: TAB_COLORS.fabBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TAB_COLORS.active,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
});
