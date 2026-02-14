import React from 'react';
import { Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../theme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  variant?: 'glass' | 'solid';
  enableHaptic?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  style,
  variant = 'glass',
  enableHaptic = true,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(scale.value, {
            damping: 15,
            stiffness: 150,
            mass: 0.5,
          }),
        },
      ],
      opacity: withTiming(opacity.value, { duration: 200 }),
    };
  });

  const handlePressIn = () => {
    scale.value = 0.97;
    opacity.value = 0.9;
    
    if (enableHaptic) {
      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
  };

  const handlePressOut = () => {
    scale.value = 1;
    opacity.value = 1;
  };

  const cardStyle = [
    styles.card,
    variant === 'glass' ? styles.glass : styles.solid,
    SHADOWS.neumorphicCard, // Neumorphic shadow for banking theme
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        android_ripple={{
          color: `${COLORS.babyBlue}20`,
          borderless: false,
        }}
      >
        <Animated.View style={[cardStyle, animatedStyle]}>
          {variant === 'glass' && (
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.92)', 'rgba(250, 250, 255, 0.88)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[cardStyle, animatedStyle]}>
      {variant === 'glass' && (
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.92)', 'rgba(250, 250, 255, 0.88)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md, // 16px for banking theme
    padding: SPACING.md,
    overflow: 'hidden',
    // Neumorphic elevation
    ...Platform.select({
      android: {
        elevation: 2,
      },
    }),
  },
  glass: {
    backgroundColor: 'transparent', // LinearGradient handles background
    borderWidth: 0.5,
    borderColor: 'rgba(120, 120, 150, 0.12)',
  },
  solid: {
    backgroundColor: COLORS.surfaceLight, // White for banking theme
  },
});
