import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../hooks/useTheme';
import { theme } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  ...props
}) => {
  const { colors } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.disabled : '#121723', // Dark theme primary
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: disabled ? colors.disabled : '#F1F5F9',
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: disabled ? colors.disabled : '#121723',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: disabled ? colors.disabled : '#EF4444',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: '#121723',
          borderWidth: 0,
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          minHeight: 36,
          borderRadius: theme.radius.full,
        };
      case 'medium':
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          minHeight: 48,
          borderRadius: theme.radius.full,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          minHeight: 56,
          borderRadius: theme.radius.full,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          minHeight: 48,
          borderRadius: theme.radius.full,
        };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return '#94A3B8';
    if (variant === 'outline' || variant === 'ghost') return '#121723';
    if (variant === 'secondary') return '#121723';
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={getTextColor()}
          size="small"
        />
      ) : (
        <>
          {icon && icon}
          {title ? (
            <Text
              variant="label"
              style={[
                styles.buttonText, 
                { color: getTextColor(), marginLeft: icon ? 8 : 0 },
                textStyle
              ]}
            >
              {title}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...theme.shadows.soft,
  },
  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
});
