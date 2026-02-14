/**
 * Redesigned Input Component
 * Soft pastel design with Inter font and smooth animations
 */
import React, { forwardRef, useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../theme/designTokens';

interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const Input = forwardRef<RNTextInput, InputProps>(
  (
    {
      label,
      error,
      containerStyle,
      leftIcon,
      rightIcon,
      secureTextEntry,
      style,
      ...props
    },
    ref
  ) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const focusScale = useSharedValue(1);
    const borderColor = useSharedValue(0);

    const handleFocus = () => {
      setIsFocused(true);
      focusScale.value = withSpring(1.02, { damping: 15 });
      borderColor.value = withTiming(1, { duration: 200 });
    };

    const handleBlur = () => {
      setIsFocused(false);
      focusScale.value = withSpring(1, { damping: 15 });
      borderColor.value = withTiming(0, { duration: 200 });
    };

    const animatedContainerStyle = useAnimatedStyle(() => ({
      transform: [{ scale: focusScale.value }],
      borderColor: error
        ? colors.accent
        : borderColor.value === 1
        ? colors.primary
        : colors.pillBackground,
    }));

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Animated.Text style={styles.label}>{label}</Animated.Text>}
        <AnimatedView style={[styles.inputContainer, animatedContainerStyle]}>
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
          <RNTextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={colors.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={isSecure}
            {...props}
          />
          {secureTextEntry && (
            <Pressable
              onPress={() => setIsSecure(!isSecure)}
              style={styles.iconContainer}
            >
              {isSecure ? (
                <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
              ) : (
                <Eye size={20} color={colors.textMuted} strokeWidth={2} />
              )}
            </Pressable>
          )}
          {rightIcon && !secureTextEntry && (
            <View style={styles.iconContainer}>{rightIcon}</View>
          )}
        </AnimatedView>
        {error && <Animated.Text style={styles.error}>{error}</Animated.Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.m,
  },
  label: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textBody,
    marginBottom: spacing.s,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radii.card,
    paddingHorizontal: spacing.m,
    minHeight: 56,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textTitle,
    paddingVertical: spacing.m,
  },
  iconContainer: {
    marginLeft: spacing.s,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 16,
    color: colors.accent,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
