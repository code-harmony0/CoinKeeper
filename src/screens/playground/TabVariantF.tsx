import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { PLAYGROUND_THEME, TabName } from './playgroundTheme';
import { PlaygroundIcon } from './PlaygroundIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_HEIGHT = 52;

const TABS_NO_FAB: TabName[] = ['home', 'groups', 'approvals', 'settings'];
const TAB_WIDTH = SCREEN_WIDTH / 4;

interface Props {
  activeTab: TabName;
  onTabPress?: (tab: TabName) => void;
}

export const TabVariantF: React.FC<Props> = ({ activeTab, onTabPress }) => {
  const [showRadial, setShowRadial] = useState(false);
  const dotX = useSharedValue(getTabIndex(activeTab) * TAB_WIDTH);
  const barOpacity = useSharedValue(0);
  const radialScale = useSharedValue(0);

  useEffect(() => {
    barOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  useEffect(() => {
    dotX.value = withSpring(getTabIndex(activeTab) * TAB_WIDTH + TAB_WIDTH / 2 - 3, {
      damping: 18,
      stiffness: 120,
    });
  }, [activeTab]);

  const toggleRadial = () => {
    if (showRadial) {
      radialScale.value = withTiming(0, { duration: 200 });
      setTimeout(() => setShowRadial(false), 200);
    } else {
      setShowRadial(true);
      radialScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    }
  };

  const barStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotX.value }],
  }));

  const radialStyle = useAnimatedStyle(() => ({
    transform: [{ scale: radialScale.value }],
    opacity: radialScale.value,
  }));

  return (
    <View style={styles.container}>
      {showRadial && (
        <Animated.View style={[styles.radialMenu, radialStyle]}>
          {['home', 'groups', 'approvals', 'settings', 'fab'].map((action, i) => (
            <Pressable
              key={action}
              style={[styles.radialItem, getRadialPosition(i)]}
              onPress={() => {
                toggleRadial();
                onTabPress?.(action as TabName);
              }}
            >
              <PlaygroundIcon name={action} size={20} color={PLAYGROUND_THEME.colors.surface} />
            </Pressable>
          ))}
        </Animated.View>
      )}

      <Animated.View style={[styles.bar, barStyle]}>
        <Animated.View style={[styles.activeDot, dotStyle]} />
        {TABS_NO_FAB.map((tab) => (
          <EdgeTabItem
            key={tab}
            tab={tab}
            isActive={activeTab === tab}
            onPress={() => onTabPress?.(tab)}
            onLongPress={toggleRadial}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const getTabIndex = (tab: TabName) => TABS_NO_FAB.indexOf(tab);

const getRadialPosition = (index: number) => {
  const angle = -180 + index * 45;
  const rad = (angle * Math.PI) / 180;
  const radius = 70;
  return {
    left: SCREEN_WIDTH / 2 - 20 + Math.cos(rad) * radius,
    bottom: 70 + Math.sin(rad) * radius,
  };
};

const EdgeTabItem: React.FC<{
  tab: TabName;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ tab, isActive, onPress, onLongPress }) => {
  const scale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.92, { damping: 10 }), withSpring(1, { damping: 12 }));
    onPress();
  };

  return (
    <Pressable onPress={handlePress} onLongPress={onLongPress} style={styles.tabItem}>
      <Animated.View style={iconStyle}>
        <PlaygroundIcon
          name={tab}
          size={24}
          color={isActive ? PLAYGROUND_THEME.colors.inkDark : '#94A3B8'}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', height: BAR_HEIGHT + 16 },
  bar: {
    width: '100%',
    height: BAR_HEIGHT,
    backgroundColor: PLAYGROUND_THEME.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: PLAYGROUND_THEME.colors.bgBlue3,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  activeDot: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PLAYGROUND_THEME.colors.inkDark,
  },
  radialMenu: {
    position: 'absolute',
    bottom: BAR_HEIGHT,
    left: 0,
    right: 0,
    height: 180,
  },
  radialItem: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PLAYGROUND_THEME.colors.inkDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...PLAYGROUND_THEME.shadow.medium,
  },
});
