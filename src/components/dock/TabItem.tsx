import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTabItemAnimation } from './hooks/useTabAnimation';
import { DOCK_THEME, TabKey, TAB_LABELS } from './theme/ThemeTokens';

interface TabItemProps {
  name: TabKey;
  index: number;
  isActive: boolean;
  isCenter: boolean;
  accentColor: string;
  onPress: () => void;
}

export const TabItem: React.FC<TabItemProps> = memo(({
  name,
  index,
  isActive,
  isCenter,
  accentColor,
  onPress,
}) => {
  const { containerStyle, onPressIn, onPressOut } = useTabItemAnimation(isActive, isCenter, index);

  const handlePress = useCallback(() => {
    ReactNativeHapticFeedback.trigger(isCenter ? 'impactMedium' : 'impactLight');
    onPress();
  }, [isCenter, onPress]);

  const size = isCenter ? DOCK_THEME.tab.center.size : DOCK_THEME.tab.active.size;
  const iconColor = isActive ? DOCK_THEME.tab.active.iconColor : DOCK_THEME.tab.inactive.iconColor;

  return (
    <View style={[styles.wrapper, isCenter && styles.centerWrapper]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.container,
          { width: size, height: size },
        ]}
        hitSlop={48}
        accessibilityRole="tab"
        accessibilityLabel={TAB_LABELS[name]}
        accessibilityState={{ selected: isActive }}
      >
        <Animated.View style={[styles.innerContainer, containerStyle]}>
          {/* Icon container */}
          <View style={[styles.iconContainer, { width: size, height: size, borderRadius: size / 2 }]}>
            <TabIcon name={name} color={iconColor} size={isCenter ? 26 : 22} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
});

TabItem.displayName = 'TabItem';

// Icon components
const TabIcon: React.FC<{ name: TabKey; color: string; size: number }> = ({ name, color, size }) => {
  const sw = 2;

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 9.5L12 3L21 9.5V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9.5Z" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 22V12H15V22" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'wallet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M21 4H3C1.9 4 1 4.9 1 6V18C1 19.1 1.9 20 3 20H21C22.1 20 23 19.1 23 18V6C23 4.9 22.1 4 21 4Z" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M1 10H23" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'center':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={sw} />
          <Path d="M12 8V16M8 12H16" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'activity':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M22 12H18L15 21L9 3L6 12H2" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={sw} />
          <Path d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  centerWrapper: {
    marginTop: DOCK_THEME.tab.center.elevated,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
