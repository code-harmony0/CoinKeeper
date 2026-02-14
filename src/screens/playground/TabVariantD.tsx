import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { PLAYGROUND_THEME, TabName, TABS } from './playgroundTheme';
import { PlaygroundIcon } from './PlaygroundIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_HEIGHT = 68;

const TAB_LABELS: Record<TabName, string> = {
  home: 'Home',
  groups: 'Groups',
  fab: 'Add',
  approvals: 'Approvals',
  settings: 'Settings',
};

interface Props {
  activeTab: TabName;
  onTabPress?: (tab: TabName) => void;
}

export const TabVariantD: React.FC<Props> = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {TABS.map((tab, index) => (
          <SegmentItem
            key={tab}
            tab={tab}
            label={TAB_LABELS[tab]}
            isActive={activeTab === tab}
            isFab={tab === 'fab'}
            index={index}
            onPress={() => onTabPress?.(tab)}
          />
        ))}
      </View>
    </View>
  );
};

const SegmentItem: React.FC<{
  tab: TabName;
  label: string;
  isActive: boolean;
  isFab: boolean;
  index: number;
  onPress: () => void;
}> = ({ tab, label, isActive, isFab, index, onPress }) => {
  const scale = useSharedValue(1);
  const elevation = useSharedValue(isActive ? 1 : 0);
  const entryOpacity = useSharedValue(0);

  useEffect(() => {
    entryOpacity.value = withDelay(index * 60, withTiming(1, { duration: 200 }));
  }, []);

  useEffect(() => {
    elevation.value = withSpring(isActive ? 1 : 0, { damping: 14 });
  }, [isActive]);

  const capsuleStyle = useAnimatedStyle(() => ({
    backgroundColor: isActive || isFab ? PLAYGROUND_THEME.colors.surface : 'transparent',
    transform: [{ translateY: -elevation.value * 6 }],
    shadowOpacity: elevation.value * 0.1,
    opacity: entryOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.96, { damping: 8 }), withSpring(1, { damping: 10 }));
    onPress();
  };

  const iconColor = isFab
    ? '#FFF'
    : isActive
    ? PLAYGROUND_THEME.colors.inkDark
    : PLAYGROUND_THEME.colors.textSecondary;

  return (
    <Pressable onPress={handlePress} style={styles.segmentPressable}>
      <Animated.View
        style={[
          styles.capsule,
          isFab && styles.fabCapsule,
          capsuleStyle,
        ]}
      >
        <Animated.View style={iconStyle}>
          <PlaygroundIcon name={tab} size={22} color={iconColor} />
        </Animated.View>
        {!isFab && <Text style={[styles.label, { color: iconColor }]}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', height: BAR_HEIGHT + 16 },
  bar: {
    width: '100%',
    height: BAR_HEIGHT,
    backgroundColor: PLAYGROUND_THEME.colors.bgBlue2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  segmentPressable: { flex: 1, height: BAR_HEIGHT - 12 },
  capsule: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: PLAYGROUND_THEME.colors.inkDark,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  fabCapsule: {
    backgroundColor: PLAYGROUND_THEME.colors.inkDark,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
