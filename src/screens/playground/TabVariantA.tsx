import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { PLAYGROUND_THEME, TabName, TABS } from './playgroundTheme';
import { PlaygroundIcon } from './PlaygroundIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.9;
const BAR_HEIGHT = 72;
const FAB_SIZE = 58;
const NOTCH_WIDTH = 68;

interface Props {
  activeTab: TabName;
  onTabPress?: (tab: TabName) => void;
}

export const TabVariantA: React.FC<Props> = ({ activeTab, onTabPress }) => {
  const fabScale = useSharedValue(1);
  const fabMorph = useSharedValue(0);
  const barTranslateY = useSharedValue(24);
  const fabBounce = useSharedValue(0);

  useEffect(() => {
    barTranslateY.value = withSpring(0, { damping: 14, stiffness: 100 });
    fabBounce.value = withSequence(
      withTiming(0, { duration: 200 }),
      withSpring(1, { damping: 12, stiffness: 80 })
    );
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barTranslateY.value }],
  }));

  const fabContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value * interpolate(fabBounce.value, [0, 1], [0.5, 1]) },
    ],
    opacity: fabBounce.value,
  }));

  const handleFabPress = () => {
    fabScale.value = withSequence(
      withSpring(0.85, { damping: 8 }),
      withSpring(1.08, { damping: 10 }),
      withSpring(1, { damping: 12 })
    );
    onTabPress?.('fab');
  };

  const renderTab = (tab: TabName, index: number) => {
    if (tab === 'fab') return <View key={tab} style={styles.notchSpace} />;
    return (
      <NotchedTabItem
        key={tab}
        tab={tab}
        isActive={activeTab === tab}
        onPress={() => onTabPress?.(tab)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, barStyle]}>
        <View style={styles.notchCutout}>
          <Svg width={NOTCH_WIDTH + 40} height={32} viewBox="0 0 108 32" style={styles.notchSvg}>
            <Path
              d="M0 32 C20 32 24 0 54 0 C84 0 88 32 108 32"
              fill={PLAYGROUND_THEME.colors.surface}
            />
          </Svg>
        </View>
        <View style={styles.tabsRow}>{TABS.map(renderTab)}</View>
      </Animated.View>

      <Animated.View style={[styles.fabContainer, fabContainerStyle]}>
        <Pressable onPress={handleFabPress} style={styles.fab}>
          <PlaygroundIcon name="plus" size={28} color="#FFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const NotchedTabItem: React.FC<{ tab: TabName; isActive: boolean; onPress: () => void }> = ({
  tab,
  isActive,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const active = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    active.value = withSpring(isActive ? 1 : 0, { damping: 14 });
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (1 + active.value * 0.1) },
      { translateY: -active.value * 4 },
    ],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scale: active.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.92, { damping: 10 }), withSpring(1, { damping: 12 }));
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.tabItem}>
      <Animated.View style={iconStyle}>
        <PlaygroundIcon
          name={tab}
          size={26}
          color={isActive ? PLAYGROUND_THEME.colors.inkDark : PLAYGROUND_THEME.colors.textSecondary}
        />
      </Animated.View>
      <Animated.View style={[styles.dot, dotStyle]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', height: BAR_HEIGHT + 30 },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    backgroundColor: PLAYGROUND_THEME.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: PLAYGROUND_THEME.colors.bgBlue2,
    ...PLAYGROUND_THEME.shadow.medium,
  },
  notchCutout: {
    position: 'absolute',
    top: -1,
    left: '50%',
    marginLeft: -54,
    width: NOTCH_WIDTH + 40,
    height: 32,
  },
  notchSvg: { position: 'absolute', top: -31 },
  tabsRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  notchSpace: { width: NOTCH_WIDTH + 24 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PLAYGROUND_THEME.colors.inkDark,
    marginTop: 6,
    position: 'absolute',
    bottom: 12,
  },
  fabContainer: {
    position: 'absolute',
    top: -10,
    ...PLAYGROUND_THEME.shadow.medium,
    shadowColor: PLAYGROUND_THEME.colors.inkDark,
    shadowOpacity: 0.2,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: PLAYGROUND_THEME.colors.inkDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
