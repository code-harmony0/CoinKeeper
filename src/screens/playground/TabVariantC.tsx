import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { PLAYGROUND_THEME, TabName, TABS } from './playgroundTheme';
import { PlaygroundIcon } from './PlaygroundIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.92;
const BAR_HEIGHT = 70;
const FAB_SIZE = 54;

interface Props {
  activeTab: TabName;
  onTabPress?: (tab: TabName) => void;
}

export const TabVariantC: React.FC<Props> = ({ activeTab, onTabPress }) => {
  const barTranslateY = useSharedValue(20);
  const barOpacity = useSharedValue(0);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    barTranslateY.value = withSpring(0, { damping: 14 });
    barOpacity.value = withTiming(1, { duration: 320 });
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barTranslateY.value }],
    opacity: barOpacity.value,
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPress = () => {
    fabScale.value = withSequence(
      withSpring(0.85, { damping: 8 }),
      withSpring(1.08, { damping: 10 }),
      withSpring(1, { damping: 12 })
    );
    onTabPress?.('fab');
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.barWrapper, barStyle]}>
        <BlurView blurType="light" blurAmount={24} style={StyleSheet.absoluteFill} />
        <View style={styles.glassOverlay}>
          {TABS.filter((t) => t !== 'fab').map((tab) => (
            <GlassTabItem
              key={tab}
              tab={tab}
              isActive={activeTab === tab}
              onPress={() => onTabPress?.(tab)}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.fabContainer, fabStyle]}>
        <Pressable onPress={handleFabPress} style={styles.fab}>
          <PlaygroundIcon name="plus" size={26} color="#FFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const GlassTabItem: React.FC<{ tab: TabName; isActive: boolean; onPress: () => void }> = ({
  tab,
  isActive,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const tintOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    tintOpacity.value = withTiming(isActive ? 1 : 0, { duration: 180 });
  }, [isActive]);

  const tintStyle = useAnimatedStyle(() => ({
    opacity: tintOpacity.value,
    transform: [{ scale: 0.95 + tintOpacity.value * 0.05 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * (isActive ? 1.05 : 1) }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.9, { damping: 10 }), withSpring(1, { damping: 12 }));
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.tabItem}>
      <Animated.View style={[styles.tintBg, tintStyle]} />
      <Animated.View style={iconStyle}>
        <PlaygroundIcon
          name={tab}
          size={24}
          color={isActive ? PLAYGROUND_THEME.colors.inkDark : PLAYGROUND_THEME.colors.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', height: BAR_HEIGHT + 24 },
  barWrapper: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    ...PLAYGROUND_THEME.shadow.medium,
  },
  glassOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: FAB_SIZE / 2 + 20,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  tintBg: {
    position: 'absolute',
    width: 44,
    height: 40,
    borderRadius: 12,
    backgroundColor: PLAYGROUND_THEME.colors.bgBlue1,
  },
  fabContainer: {
    position: 'absolute',
    top: (BAR_HEIGHT - FAB_SIZE) / 2 - 16,
    ...PLAYGROUND_THEME.shadow.medium,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: PLAYGROUND_THEME.colors.inkDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
