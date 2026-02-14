/**
 * ConnectedPillButtons - EXACT replica of reference image
 * Two buttons connected by organic blob shape in center
 */
import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { THEME_COLORS, THEME_SHADOWS, THEME_ANIMATION } from '../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ButtonConfig {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

interface ConnectedPillButtonsProps {
  left: ButtonConfig;
  right: ButtonConfig;
}

export const ConnectedPillButtons: React.FC<ConnectedPillButtonsProps> = ({
  left,
  right,
}) => {
  const leftScale = useSharedValue(1);
  const rightScale = useSharedValue(1);

  const leftAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(leftScale.value, THEME_ANIMATION.spring) }],
  }));

  const rightAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(rightScale.value, THEME_ANIMATION.spring) }],
  }));

  const handlePressIn = (side: 'left' | 'right') => {
    if (side === 'left') {
      leftScale.value = 0.97;
    } else {
      rightScale.value = 0.97;
    }
    ReactNativeHapticFeedback.trigger('impactLight');
  };

  const handlePressOut = (side: 'left' | 'right') => {
    if (side === 'left') {
      leftScale.value = 1;
    } else {
      rightScale.value = 1;
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Left pill button */}
      <Pressable
        onPress={left.onPress}
        onPressIn={() => handlePressIn('left')}
        onPressOut={() => handlePressOut('left')}
        style={styles.pillTouchable}
      >
        <Animated.View style={[styles.pillButton, leftAnimStyle]}>
          <View style={styles.iconCircle}>{left.icon}</View>
          <Text style={styles.pillLabel}>{left.label}</Text>
        </Animated.View>
      </Pressable>

      {/* Center blob connector - the organic shape that connects the pills */}
      <View style={styles.blobConnector}>
        <View style={styles.blobLeft} />
        <View style={styles.blobCenter} />
        <View style={styles.blobRight} />
      </View>

      {/* Right pill button */}
      <Pressable
        onPress={right.onPress}
        onPressIn={() => handlePressIn('right')}
        onPressOut={() => handlePressOut('right')}
        style={styles.pillTouchable}
      >
        <Animated.View style={[styles.pillButton, rightAnimStyle]}>
          <View style={styles.iconCircle}>{right.icon}</View>
          <Text style={styles.pillLabel}>{right.label}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const PILL_HEIGHT = 56;
const ICON_SIZE = 40;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTouchable: {
    flex: 1,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.surface,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    paddingHorizontal: 8,
    gap: 10,
    ...THEME_SHADOWS.card,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: '#F0F4F8', // Light gray circle as in reference
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME_COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  // Blob connector - creates the organic connection between pills
  blobConnector: {
    width: 24,
    height: PILL_HEIGHT,
    marginHorizontal: -12, // Overlap with pills
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobLeft: {
    width: 12,
    height: PILL_HEIGHT,
    backgroundColor: THEME_COLORS.surface,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  blobCenter: {
    width: 12,
    height: 40,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 6,
  },
  blobRight: {
    width: 12,
    height: PILL_HEIGHT,
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
});

export default ConnectedPillButtons;
