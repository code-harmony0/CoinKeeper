/**
 * BlobCard - Organic curved card component
 */
import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { THEME_COLORS, THEME_SHADOWS, THEME_RADIUS, THEME_SPACING, THEME_ANIMATION } from '../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface BlobCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'flat';
}

export const BlobCard: React.FC<BlobCardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
}) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, THEME_ANIMATION.spring) }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = THEME_ANIMATION.scale.pressed;
      ReactNativeHapticFeedback.trigger('impactLight');
    }
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const shadowStyle = variant === 'elevated' 
    ? THEME_SHADOWS.elevated 
    : variant === 'flat' 
    ? {} 
    : THEME_SHADOWS.card;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.card, shadowStyle, style, animStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, shadowStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME_COLORS.surface,
    borderRadius: THEME_RADIUS.xl,
    padding: THEME_SPACING.lg,
  },
});

export default BlobCard;
