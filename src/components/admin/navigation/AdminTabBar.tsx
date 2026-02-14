import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { THEME } from '../../../theme/blobTheme';
import { AdminIcons } from './AdminIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH * 0.92;
const TAB_BAR_HEIGHT = 72;
const FAB_SIZE = 56;

// Spring Configs
const PRESS_SPRING = { damping: 12, stiffness: 180 };
const FAB_SPRING = { damping: 10, stiffness: 150 };

export const AdminTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const fabScale = useSharedValue(1);

  // Entrance Animation
  const barTranslateY = useSharedValue(50);
  const barOpacity = useSharedValue(0);

  useEffect(() => {
    barTranslateY.value = withDelay(200, withSpring(0, { damping: 15 }));
    barOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barTranslateY.value }],
    opacity: barOpacity.value,
  }));

  const onFabPress = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    fabScale.value = withSequence(
      withTiming(0.88, { duration: 100 }),
      withSpring(1.05, FAB_SPRING),
      withSpring(1, FAB_SPRING)
    );
    // TODO: Handle FAB action (e.g., open modal)
    console.log('FAB Pressed');
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
      {/* Floating Bar */}
      <Animated.View style={[styles.barContainer, containerStyle]}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            
            // Insert FAB in the middle (after 2nd item)
            if (index === 2) {
              return (
                <React.Fragment key="fab-spacer">
                  <View style={styles.fabSpacer} />
                  <TabItem
                    key={route.key}
                    route={route}
                    isFocused={isFocused}
                    options={options}
                    onPress={() => {
                      const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                      });

                      if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                      }
                    }}
                  />
                </React.Fragment>
              );
            }

            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={isFocused}
                options={options}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </LinearGradient>
      </Animated.View>

      {/* FAB (Absolute Center) */}
      <Animated.View style={[styles.fabContainer, { bottom: insets.bottom + 48 }, fabAnimatedStyle]}>
        <Pressable onPress={onFabPress} style={styles.fab}>
          <LinearGradient
            colors={[THEME.colors.lavender, '#C4B5FD']} // Deep Lilac / Lavender gradient
            style={styles.fabGradient}
          >
            <AdminIcons.Plus size={28} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ============================================
// TAB ITEM COMPONENT
// ============================================
const TabItem = ({ route, isFocused, onPress }: any) => {
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: interpolate(activeProgress.value, [0, 1], [0, -2]) }],
    opacity: interpolate(activeProgress.value, [0, 1], [0.6, 1]),
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [{ scale: activeProgress.value }],
  }));

  const handlePress = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    scale.value = withSequence(
      withTiming(0.92, { duration: 100 }),
      withSpring(1, PRESS_SPRING)
    );
    onPress();
  };

  const IconComponent = AdminIcons[route.name as keyof typeof AdminIcons] || AdminIcons.Home;
  const iconColor = isFocused ? '#6366F1' : '#94A3B8'; // Deep Lilac vs Slate

  return (
    <Pressable onPress={handlePress} style={styles.tabItem}>
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <IconComponent color={iconColor} size={26} />
      </Animated.View>
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barContainer: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: 24,
    ...THEME.shadows.elevated, // Use theme shadow
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
    marginTop: 4,
    position: 'absolute',
    bottom: 16,
  },
  fabSpacer: {
    width: FAB_SIZE + 16, // Space for FAB
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.elevated,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
