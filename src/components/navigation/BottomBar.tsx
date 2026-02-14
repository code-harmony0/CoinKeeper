import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, AccessibilityInfo } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabItem } from './TabItem';
import { FAB } from './FAB';
import { AnimatedIndicator } from './AnimatedIndicator';
import { useTabAnimations } from './hooks/useTabAnimations';
import { TAB_NAMES, TabName, BAR_COLORS } from './theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.88;
const BAR_HEIGHT = 72;

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
  const [activeTab, setActiveTab] = useState(initialIndex);

  const {
    activeIndex,
    indicatorTranslateX,
    indicatorWidth,
    backgroundColor,
    setActiveTab: animateToTab,
  } = useTabAnimations(initialIndex);

  const handleTabPress = useCallback(
    (index: number) => {
      if (index === 2) {
        // FAB position
        onFabPress?.();
        return;
      }
      setActiveTab(index);
      animateToTab(index);
      onTabChange?.(TAB_NAMES[index], index);
    },
    [animateToTab, onTabChange, onFabPress]
  );

  const handleFabPress = useCallback(() => {
    onFabPress?.();
  }, [onFabPress]);

  // Animated background color
  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 300 }),
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 16) },
        containerStyle,
      ]}
    >
      <Animated.View style={[styles.bar, barStyle]}>
        {/* Indicator */}
        <AnimatedIndicator
          translateX={indicatorTranslateX}
          indicatorWidth={indicatorWidth}
        />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TAB_NAMES.map((name, index) => {
            if (name === 'fab') {
              return (
                <View key={name} style={styles.fabContainer}>
                  <FAB onPress={handleFabPress} />
                </View>
              );
            }
            return (
              <TabItem
                key={name}
                name={name}
                index={index}
                isActive={activeTab === index}
                onPress={() => handleTabPress(index)}
              />
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: (SCREEN_WIDTH - BAR_WIDTH) / 2,
  },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: 32,
    backgroundColor: '#C2DFF7',
    shadowColor: BAR_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: BAR_COLORS.border,
    overflow: 'visible',
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  fabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
