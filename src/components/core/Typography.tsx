import React from 'react';
import { Text as RNText, TextStyle, StyleProp } from 'react-native';
import { COLORS, TEXT_STYLES } from '../../theme';

interface TextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodyMedium' | 'caption' | 'label' | 'amount';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  color = COLORS.navyText,
  style,
  numberOfLines,
  align = 'left',
}) => {
  const textStyle = [
    TEXT_STYLES[variant],
    { color, textAlign: align },
    style,
  ];

  return (
    <RNText style={textStyle} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
};

// Convenience components
export const Heading = ({ children, level = 1, align, numberOfLines, ...props }: { children: React.ReactNode; level?: 1 | 2 | 3 | 4; color?: string; style?: StyleProp<TextStyle>; align?: 'left' | 'center' | 'right'; numberOfLines?: number }) => (
  <Text variant={`h${level}` as any} align={align} numberOfLines={numberOfLines} {...props}>{children}</Text>
);

export const BodyText = ({ children, medium = false, align, numberOfLines, ...props }: { children: React.ReactNode; medium?: boolean; color?: string; style?: StyleProp<TextStyle>; align?: 'left' | 'center' | 'right'; numberOfLines?: number }) => (
  <Text variant={medium ? 'bodyMedium' : 'body'} align={align} numberOfLines={numberOfLines} {...props}>{children}</Text>
);

export const Caption = ({ children, medium = false, align, numberOfLines, ...props }: { children: React.ReactNode; medium?: boolean; color?: string; style?: StyleProp<TextStyle>; align?: 'left' | 'center' | 'right'; numberOfLines?: number }) => (
  <Text variant="caption" color={COLORS.grayText} align={align} numberOfLines={numberOfLines} {...props}>{children}</Text>
);

export const Label = ({ children, ...props }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) => (
  <Text variant="label" {...props}>{children}</Text>
);

export const AmountText = ({ children, ...props }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) => (
  <Text variant="amount" {...props}>{children}</Text>
);
