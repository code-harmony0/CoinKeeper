import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { useTooltipAnimation } from './hooks/useTabAnimation';
import { DOCK_THEME } from './theme/ThemeTokens';

interface TooltipProps {
  label: string;
  isVisible: boolean;
  accentColor: string;
}

export const Tooltip: React.FC<TooltipProps> = memo(({ label, isVisible, accentColor }) => {
  const { style } = useTooltipAnimation(isVisible);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, style]}>
      <BlurView
        blurType="light"
        blurAmount={DOCK_THEME.tooltip.blur}
        style={styles.blur}
        reducedTransparencyFallbackColor="#FFFFFF"
      />
      <View style={[styles.content, { borderColor: accentColor }]}>
        <Text style={styles.label}>{label}</Text>
      </View>
      {/* Arrow */}
      <View style={[styles.arrow, { borderTopColor: accentColor }]} />
    </Animated.View>
  );
});

Tooltip.displayName = 'Tooltip';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: DOCK_THEME.tooltip.offset * -1,
    alignItems: 'center',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DOCK_THEME.tooltip.radius,
  },
  content: {
    paddingHorizontal: DOCK_THEME.tooltip.padding.h,
    paddingVertical: DOCK_THEME.tooltip.padding.v,
    backgroundColor: DOCK_THEME.tooltip.bg,
    borderRadius: DOCK_THEME.tooltip.radius,
    borderWidth: 1,
  },
  label: {
    fontSize: DOCK_THEME.tooltip.fontSize,
    fontWeight: DOCK_THEME.tooltip.fontWeight,
    color: '#121723',
    letterSpacing: -0.2,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
