import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

interface PlatformGlassMaterialProps {
  style?: StyleProp<ViewStyle>;
  tintColor: string;
  colorScheme: 'light' | 'dark';
  blurFallbackColor?: string;
  isFab?: boolean;
}

/**
 * Solid surface behind the tab bar / FAB.
 * The liquid-glass material was removed — this renders an opaque fill.
 */
export const PlatformGlassMaterial: React.FC<PlatformGlassMaterialProps> = ({
  style,
  blurFallbackColor = '#FFFFFF',
}) => (
  <View
    style={[
      StyleSheet.absoluteFill,
      style,
      { backgroundColor: blurFallbackColor },
    ]}
  />
);
