import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { TAB_COLORS, TabKey, TAB_LABELS, TAB_SIZING } from './theme/colors';

interface TabItemProps {
  name: TabKey;
  index: number;
  isActive: boolean;
  accentColor: string;
  onPress: () => void;
}

export const TabItem: React.FC<TabItemProps> = memo(({ name, isActive, accentColor, onPress }) => {
  const iconColor = isActive ? TAB_COLORS.activeIcon : TAB_COLORS.inactiveIcon;
  const bgColor = isActive ? accentColor : TAB_COLORS.inactiveBg;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { backgroundColor: bgColor }]}
      accessibilityRole="tab"
      accessibilityLabel={TAB_LABELS[name]}
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.iconWrapper}>
        <TabIcon name={name} color={iconColor} />
      </View>
      {isActive && (
        <Text style={styles.label} numberOfLines={1}>
          {TAB_LABELS[name]}
        </Text>
      )}
    </Pressable>
  );
});

// Simple icon component
const TabIcon: React.FC<{ name: TabKey; color: string }> = memo(({ name, color }) => {
  const size = TAB_SIZING.iconSize;
  const sw = 2;

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 9.5L12 3L21 9.5V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9.5Z" stroke={color} strokeWidth={sw} />
          <Path d="M9 22V12H15V22" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'groups':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M22 19C22 20.1 21.1 21 20 21H4C2.9 21 2 20.1 2 19V5C2 3.9 2.9 3 4 3H9L11 6H20C21.1 6 22 6.9 22 8V19Z" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'approve':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={sw} />
          <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    default:
      return null;
  }
});

const styles = StyleSheet.create({
  container: {
    height: TAB_SIZING.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 8,
  },
  iconWrapper: {
    width: TAB_SIZING.iconSize,
    height: TAB_SIZING.iconSize,
  },
  label: {
    fontSize: TAB_SIZING.labelSize,
    fontWeight: TAB_SIZING.labelWeight,
    color: TAB_COLORS.activeText,
    letterSpacing: TAB_SIZING.letterSpacing,
  },
});
