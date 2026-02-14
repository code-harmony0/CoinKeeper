import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, runOnUI } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedWavePath } from './AnimatedWavePath';
import { TabIcon } from './TabIcon';
import { FabButton } from './FabButton';
import { useBottomBarAnimation } from './hooks/useBottomBarAnimation';
import { TAB_KEYS, TabKey, BAR_CONSTANTS } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const BAR_HEIGHT = BAR_CONSTANTS.HEIGHT;
const WAVE_OFFSET = BAR_CONSTANTS.WAVE_DEPTH + 10;

interface AnimatedBottomBarProps {
  initialTab?: TabKey;
  onTabChange?: (tab: TabKey, index: number) => void;
  onFabPress?: () => void;
}

export const AnimatedBottomBar: React.FC<AnimatedBottomBarProps> = ({
  initialTab = 'home',
  onTabChange,
  onFabPress,
}) => {
  const insets = useSafeAreaInsets();
  const initialIndex = TAB_KEYS.indexOf(initialTab);
  const [activeTabIndex, setActiveTabIndex] = useState(initialIndex);

  const {
    activeIndex,
    waveCenterX,
    waveDepth,
    fabX,
    backgroundColor,
    setActiveTab,
    isReducedMotion,
    tabWidth,
  } = useBottomBarAnimation(initialIndex);

  const handleTabPress = useCallback(
    (index: number) => {
      if (index === 2) {
        // Center position is FAB - don't switch tabs
        onFabPress?.();
        return;
      }
      
      setActiveTabIndex(index);
      runOnUI(setActiveTab)(index);
      onTabChange?.(TAB_KEYS[index], index);
    },
    [setActiveTab, onTabChange, onFabPress]
  );

  const handleFabPress = useCallback(() => {
    onFabPress?.();
  }, [onFabPress]);

  // Animated background color
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 20) },
        backgroundStyle,
      ]}
    >
      <View style={styles.container}>
        {/* SVG wave path */}
        <View style={styles.waveContainer}>
          <AnimatedWavePath waveCenterX={waveCenterX} waveDepth={waveDepth} />
        </View>

        {/* FAB in the wave dip */}
        <View style={styles.fabLayer}>
          <FabButton fabX={fabX} onPress={handleFabPress} />
        </View>

        {/* Tab icons row */}
        <View style={styles.tabsRow}>
          {TAB_KEYS.map((name, index) => {
            if (name === 'activity') {
              // Spacer for center FAB
              return <View key={name} style={[styles.fabSpacer, { width: tabWidth }]} />;
            }
            return (
              <View key={name} style={[styles.tabContainer, { width: tabWidth }]}>
                <TabIcon
                  name={name}
                  isActive={activeTabIndex === index}
                  isReducedMotion={isReducedMotion}
                  onPress={() => handleTabPress(index)}
                />
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: WAVE_OFFSET + 8,
  },
  container: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT + WAVE_OFFSET,
    position: 'relative',
  },
  waveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fabLayer: {
    position: 'absolute',
    top: WAVE_OFFSET,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    position: 'absolute',
    top: WAVE_OFFSET,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  fabSpacer: {
    height: '100%',
  },
});

export default AnimatedBottomBar;
