import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
} from 'react-native';
import { COLORS, RADIUS, SPACING, FONT_SIZE } from '../../theme';
import { Label } from './Typography';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  return (
    <View style={containerStyle}>
      {label && (
        <Label style={styles.label}>{label}</Label>
      )}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <RNTextInput
          style={[styles.input, leftIcon ? styles.inputWithLeftIcon : undefined, style]}
          placeholderTextColor={COLORS.grayText}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && (
        <Label style={styles.errorText}>{error}</Label>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: SPACING.xs,
    color: COLORS.navyText,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderGray,
    paddingHorizontal: SPACING.md,
  },
  inputError: {
    borderColor: COLORS.errorPink,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.base,
    color: COLORS.navyText,
  },
  inputWithLeftIcon: {
    paddingLeft: SPACING.xs,
  },
  leftIcon: {
    marginRight: SPACING.xs,
  },
  rightIcon: {
    marginLeft: SPACING.xs,
  },
  errorText: {
    marginTop: SPACING.xs,
    color: COLORS.errorPink,
  },
});
