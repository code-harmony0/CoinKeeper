import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle,
  ActivityIndicator,
  Pressable,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, RADIUS, SHADOWS, SPACING, FONT_SIZE, FONT_WEIGHT } from '../../theme';
import { Text } from './Typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  gradient?: string[];
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right'; // Added for legacy compatibility
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  gradient = COLORS.gradientBlue,
  disabled = false,
  loading = false,
  style,
  icon,
}) => {
  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.container,
          SHADOWS.soft,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={disabled ? ['#E5E7EB', '#D1D5DB'] : gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                {icon && <View style={styles.icon}>{icon}</View>}
                <Text style={styles.primaryText}>{title}</Text>
              </>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.container,
          styles.secondary,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={COLORS.babyBlue} />
          ) : (
            <>
              {icon && <View style={styles.icon}>{icon}</View>}
              <Text style={styles.secondaryText}>{title}</Text>
            </>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.textButton, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.babyBlue} size="small" />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={styles.textButtonText}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: SPACING.xs,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.babyBlue,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  secondaryText: {
    color: COLORS.babyBlue,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  textButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonText: {
    color: COLORS.babyBlue,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
