/**
 * Redesigned Button Component
 * Soft pastel design with gradient and spring animations
 */
import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Text,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors, spacing, typography, radii } from '../../theme/designTokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = 0.96;
      ReactNativeHapticFeedback.trigger('impactLight');
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = 1;
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      onPress();
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.s,
          paddingHorizontal: spacing.m,
          minHeight: 40,
        };
      case 'medium':
        return {
          paddingVertical: spacing.m,
          paddingHorizontal: spacing.l,
          minHeight: 56,
        };
      case 'large':
        return {
          paddingVertical: spacing.l,
          paddingHorizontal: spacing.xl,
          minHeight: 64,
        };
      default:
        return {
          paddingVertical: spacing.m,
          paddingHorizontal: spacing.l,
          minHeight: 56,
        };
    }
  };

  const getTextSize = (): number => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 16;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
          size="small"
        />
      );
    }

    return (
      <>
        {leftIcon && <Animated.View style={styles.iconLeft}>{leftIcon}</Animated.View>}
        <Text
          style={[
            styles.text,
            {
              fontFamily: typography.section.fontFamily,
              fontSize: getTextSize(),
              color:
                variant === 'outline' || variant === 'ghost'
                  ? colors.primary
                  : colors.card,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
        {rightIcon && <Animated.View style={styles.iconRight}>{rightIcon}</Animated.View>}
      </>
    );
  };

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, styles.shadowContainer, style]}
      >
        <LinearGradient
          colors={disabled ? ['#E8EAF6', '#E8EAF6'] : [colors.primary, '#6A75D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, getSizeStyles(), disabled && styles.disabled]}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, style]}
      >
        <Animated.View
          style={[
            styles.button,
            getSizeStyles(),
            {
              backgroundColor: disabled ? colors.pillBackground : colors.pillBackground,
            },
            disabled && styles.disabled,
          ]}
        >
          <Text
            style={[
              styles.text,
              {
                fontFamily: typography.section.fontFamily,
                fontSize: getTextSize(),
                color: disabled ? colors.textMuted : colors.primary,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </Animated.View>
      </AnimatedPressable>
    );
  }

  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, style]}
      >
        <Animated.View
          style={[
            styles.button,
            getSizeStyles(),
            styles.outline,
            { borderColor: disabled ? colors.pillBackground : colors.primary },
            disabled && styles.disabled,
          ]}
        >
          {renderContent()}
        </Animated.View>
      </AnimatedPressable>
    );
  }

  // Ghost variant
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, style]}
    >
      <Animated.View
        style={[styles.button, getSizeStyles(), styles.ghost, disabled && styles.disabled]}
      >
        {renderContent()}
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    borderRadius: radii.card,
  },
  button: {
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outline: {
    backgroundColor: colors.card,
    borderWidth: 2,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: 'center',
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: spacing.s,
  },
  iconRight: {
    marginLeft: spacing.s,
  },
});
