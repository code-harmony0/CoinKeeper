import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { TabIcon } from './TabIcon';
import { useFabAnimation } from './hooks/useTabAnimations';
import { TAB_THEMES } from './theme/colors';

interface FABProps {
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FAB: React.FC<FABProps> = memo(({ onPress }) => {
  const { animatedStyle, onPressIn, onPressOut } = useFabAnimation();

  const handlePress = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.fab, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel="Add new item"
    >
      <TabIcon name="plus" size={28} color={TAB_THEMES.fab.icon} />
    </AnimatedPressable>
  );
});

FAB.displayName = 'FAB';

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TAB_THEMES.fab.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    marginTop: -28,
  },
});
