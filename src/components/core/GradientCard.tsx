import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { RADIUS, SHADOWS, SPACING } from '../../theme';
import LinearGradient from 'react-native-linear-gradient';

interface GradientCardProps {
  children: React.ReactNode;
  colors: string[];
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: 'soft' | 'medium' | 'large';
}

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  colors,
  style,
  onPress,
  elevation = 'soft',
}) => {
  const containerStyle = [styles.container, SHADOWS[elevation], style];

  const content = (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          containerStyle,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
