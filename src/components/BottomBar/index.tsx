import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, runOnUI } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedCurve } from './AnimatedCurve';
import { TabItem } from './TabItem';
import { FAB } from './FAB';
import { useBottomBarAnimation } from './hooks/useBottomBarAnimation';
import { TAB_NAMES, TabName, BOTTOM_BAR_COLORS } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const BAR_HEIGHT = 72;
const CURVE_DEPTH = 36;

interface BottomBarProps {
  initialTab?: TabName;
  onTabChange?: (tab: TabName, index: number) => void;
  onFabPress?: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  initialTab = 'home',
  onTabChange,
  onFabPress,
}) => {
  const insets = useSafeAreaInsets();
  const initialIndex = TAB_NAMES.indexOf(initialTab);
  const [activeTabIndex, setActiveTabIndex] = useState(initialIndex);

  const {
    activeIndex,
    curveOffset,
    curveStretch,
    backgroundColor,
    setActiveTab,
  } = useBottomBarAnimation(initialIndex);

  const handleTabPress = useCallback(
    (index: number) => {
      if (index === 2) {
        // FAB position - don't switch tabs
        onFabPress?.();
        return;
      }
      
      setActiveTabIndex(index);
      runOnUI(setActiveTab)(index);
      onTabChange?.(TAB_NAMES[index], index);
    },
    [setActiveTab, onTabChange, onFabPress]
  );

  const handleFabPress = useCallback(() => {
    onFabPress?.();
  }, [onFabPress]);

  // Animated background
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 16) },
        backgroundStyle,
      ]}
    >
      <View style={styles.container}>
        {/* Curved bar background */}
        <View style={styles.curveContainer}>
          <AnimatedCurve curveOffset={curveOffset} curveStretch={curveStretch} />
        </View>

        {/* Shadow layer */}
        <View style={styles.shadowLayer} />

        {/* FAB */}
        <FAB curveOffset={curveOffset} onPress={handleFabPress} />

        {/* Tab items */}
        <View style={styles.tabsRow}>
          {TAB_NAMES.map((name, index) => {
            if (name === 'fab') {
              // Spacer for FAB position
              return <View key={name} style={styles.fabSpacer} />;
            }
            return (
              <TabItem
                key={name}
                name={name}
                isActive={activeTabIndex === index}
                onPress={() => handleTabPress(index)}
              />
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
    paddingTop: 20,
  },
  container: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT + CURVE_DEPTH,
  },
  curveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shadowLayer: {
    position: 'absolute',
    top: CURVE_DEPTH,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    borderRadius: 28,
    shadowColor: BOTTOM_BAR_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  tabsRow: {
    position: 'absolute',
    top: CURVE_DEPTH,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  fabSpacer: {
    width: 56,
  },
});

export default BottomBar;
