import React, { forwardRef } from 'react';
import {
  TextInput as RNTextInput,
  View,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../hooks/useTheme';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  ({ label, error, containerStyle, leftIcon, rightIcon, style, ...props }, ref) => {
    const { colors } = useTheme();

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text variant="label" style={styles.label}>
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: error ? colors.error : colors.border,
              backgroundColor: colors.inputBackground,
            },
            props.editable === false && styles.disabled,
          ]}
        >
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
          <RNTextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: colors.text,
              },
              style,
            ]}
            placeholderTextColor={colors.placeholder}
            {...props}
          />
          {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
        </View>
        {error && (
          <Text variant="caption" color="error" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  disabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  iconContainer: {
    marginRight: 8,
  },
  error: {
    marginTop: 4,
  },
});
