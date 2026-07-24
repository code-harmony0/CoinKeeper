import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FONTS } from '../../theme/fonts';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'white' | 'black';
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'black',
  style,
  children,
  ...props
}) => {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return { fontSize: 32, fontFamily: FONTS.black };
      case 'h2':
        return { fontSize: 24, fontFamily: FONTS.black };
      case 'h3':
        return { fontSize: 20, fontFamily: FONTS.bold };
      case 'body':
        return { fontSize: 16, fontFamily: FONTS.regular };
      case 'caption':
        return { fontSize: 14, fontFamily: FONTS.regular };
      case 'label':
        return { fontSize: 14, fontFamily: FONTS.medium };
      default:
        return { fontSize: 16, fontFamily: FONTS.regular };
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return { color: colors.primary };
      case 'secondary':
        return { color: colors.secondary };
      case 'error':
        return { color: colors.error };
      case 'success':
        return { color: colors.success };
      case 'white':
        return { color: '#FFFFFF' };
      case 'black':
        return { color: '#000000' };
      default:
        return { color: colors.text };
    }
  };

  return (
    <RNText
      style={[
        getVariantStyles(),
        getColorStyles(),
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
