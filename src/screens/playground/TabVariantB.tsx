import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { PLAYGROUND_THEME, TabName } from './playgroundTheme';
import { PlaygroundIcon } from './PlaygroundIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const BAR_HEIGHT = 64;
const INDICATOR_WIDTH = 48;

const TABS_ALL: TabName[] = ['home', 'groups', 'fab', 'approvals', 'settings'];
const TAB_WIDTH = BAR_WIDTH / 5;

interface Props {
  activeTab: TabName;
  onTabPress?: (tab: TabName) => void;
}

export const TabVariantB: React.FC<Props> = ({ activeTab, onTabPress }) => {
  const indicatorX = useSharedValue(getTabIndex(activeTab) * TAB_WIDTH);
  const barScale = useSharedValue(0.95);
  const barOpacity = useSharedValue(0);

  useEffect(() => {
    barScale.value = withSpring(1, { damping: 14 });
    barOpacity.value = withTiming(1, { duration: 280 });
  }, []);

  useEffect(() => {
    indicatorX.value = withSpring(getTabIndex(activeTab) * TAB_WIDTH, {
      damping: 18,
      stiffness: 150,
    });
  }, [activeTab]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scale: barScale.value }],
    opacity: barOpacity.value,
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value + (TAB_WIDTH - INDICATOR_WIDTH) / 2 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.barWrapper, barStyle]}>
        <LinearGradient
          colors={[PLAYGROUND_THEME.colors.bgBlue2, PLAYGROUND_THEME.colors.bgBlue3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Animated.View style={[styles.indicator, indicatorStyle]} />
          <View style={styles.tabsRow}>
            {TABS_ALL.map((tab) => (
              <LiquidTabItem
                key={tab}
                tab={tab}
                isActive={activeTab === tab}
                onPress={() => onTabPress?.(tab)}
              />
            ))}
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const getTabIndex = (tab: TabName) => TABS_ALL.indexOf(tab);

const LiquidTabItem: React.FC<{ tab: TabName; isActive: boolean; onPress: () => void }> = ({
  tab,
  isActive,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.94, { damping: 10 }), withSpring(1, { damping: 12 }));
    onPress();
  };

  const isFab = tab === 'fab';

  return (
    <Pressable onPress={handlePress} style={styles.tabItem}>
      <Animated.View style={iconStyle}>
        {isFab ? (
          <View style={styles.fabCircle}>
            <PlaygroundIcon name="plus" size={22} color="#FFF" />
          </View>
        ) : (
          <PlaygroundIcon
            name={tab}
            size={24}
            color={isActive ? PLAYGROUND_THEME.colors.inkDark : PLAYGROUND_THEME.colors.textSecondary}
          />
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', height: BAR_HEIGHT + 16 },
  barWrapper: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: 32,
    ...PLAYGROUND_THEME.shadow.medium,
  },
  gradient: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - 32) / 2,
    width: INDICATOR_WIDTH,
    height: 32,
    borderRadius: 16,
    backgroundColor: PLAYGROUND_THEME.colors.surface,
    ...PLAYGROUND_THEME.shadow.light,
  },
  tabsRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PLAYGROUND_THEME.colors.inkDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
