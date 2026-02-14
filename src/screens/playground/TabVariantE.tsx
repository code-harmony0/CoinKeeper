import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { PLAYGROUND_THEME, TabName } from './playgroundTheme';
import { PlaygroundIcon } from './PlaygroundIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.9;
const BAR_HEIGHT = 78;

const TABS_NO_FAB: TabName[] = ['home', 'groups', 'approvals', 'settings'];

const TAB_DATA: Record<TabName, { label: string; count?: number; progress?: number }> = {
  home: { label: 'Home' },
  groups: { label: 'Groups', count: 12 },
  fab: { label: 'Add' },
  approvals: { label: 'Approvals', count: 5, progress: 0.4 },
  settings: { label: 'Settings' },
};

interface Props {
  activeTab: TabName;
  onTabPress?: (tab: TabName) => void;
}

export const TabVariantE: React.FC<Props> = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {TABS_NO_FAB.map((tab, index) => (
          <SmartTabItem
            key={tab}
            tab={tab}
            data={TAB_DATA[tab]}
            isActive={activeTab === tab}
            index={index}
            onPress={() => onTabPress?.(tab)}
          />
        ))}
      </View>
    </View>
  );
};

const SmartTabItem: React.FC<{
  tab: TabName;
  data: { label: string; count?: number; progress?: number };
  isActive: boolean;
  index: number;
  onPress: () => void;
}> = ({ tab, data, isActive, index, onPress }) => {
  const scale = useSharedValue(1);
  const expandProgress = useSharedValue(isActive ? 1 : 0);
  const countBounce = useSharedValue(1);
  const entryScale = useSharedValue(0);

  useEffect(() => {
    entryScale.value = withDelay(index * 80, withSpring(1, { damping: 14 }));
  }, []);

  useEffect(() => {
    expandProgress.value = withSpring(isActive ? 1 : 0, { damping: 14, stiffness: 100 });
    if (isActive && data.count) {
      countBounce.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withSpring(1, { damping: 10 })
      );
    }
  }, [isActive]);

  const containerStyle = useAnimatedStyle(() => {
    const width = interpolate(
      expandProgress.value,
      [0, 1],
      [52, data.count ? 110 : 88],
      Extrapolation.CLAMP
    );
    return {
      width,
      backgroundColor:
        expandProgress.value > 0.5 ? PLAYGROUND_THEME.colors.bgBlue1 : 'transparent',
      transform: [{ scale: entryScale.value }],
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    transform: [{ translateX: interpolate(expandProgress.value, [0, 1], [-8, 0]) }],
  }));

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countBounce.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.9, { damping: 10 }), withSpring(1, { damping: 12 }));
    onPress();
  };

  const iconColor = isActive
    ? PLAYGROUND_THEME.colors.inkDark
    : PLAYGROUND_THEME.colors.textSecondary;

  return (
    <Pressable onPress={handlePress} style={styles.tabPressable}>
      <Animated.View style={[styles.tabItem, containerStyle]}>
        <View style={styles.iconContainer}>
          <PlaygroundIcon name={tab} size={22} color={iconColor} />
          {data.progress && isActive && (
            <View style={styles.progressRing}>
              <Svg width={28} height={28} viewBox="0 0 28 28">
                <Circle
                  cx="14"
                  cy="14"
                  r="11"
                  stroke={PLAYGROUND_THEME.colors.bgBlue3}
                  strokeWidth={2}
                  fill="none"
                />
                <Circle
                  cx="14"
                  cy="14"
                  r="11"
                  stroke={PLAYGROUND_THEME.colors.inkDark}
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray={`${data.progress * 69} 69`}
                  strokeLinecap="round"
                  transform="rotate(-90 14 14)"
                />
              </Svg>
            </View>
          )}
        </View>
        {isActive && (
          <Animated.View style={[styles.labelContainer, contentStyle]}>
            <Text style={styles.label}>{data.label}</Text>
            {data.count && (
              <Animated.View style={[styles.countChip, chipStyle]}>
                <Text style={styles.countText}>{data.count}</Text>
              </Animated.View>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', height: BAR_HEIGHT + 16 },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    backgroundColor: PLAYGROUND_THEME.colors.surface,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
    ...PLAYGROUND_THEME.shadow.medium,
  },
  tabPressable: { height: '100%', justifyContent: 'center' },
  tabItem: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  iconContainer: { position: 'relative' },
  progressRing: { position: 'absolute', top: -3, left: -3 },
  labelContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: PLAYGROUND_THEME.colors.inkDark },
  countChip: {
    backgroundColor: PLAYGROUND_THEME.colors.bgBlue2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: { fontSize: 11, fontWeight: '700', color: PLAYGROUND_THEME.colors.inkDark },
});
