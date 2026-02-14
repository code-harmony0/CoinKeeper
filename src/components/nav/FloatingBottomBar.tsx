import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Home, BarChart2, Bell, User as UserIcon, Plus } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, spacing, radii, shadows, typography } from '../../theme/designTokens';

const iconMap = {
  Home: Home,
  Analytics: BarChart2,
  Notifications: Bell,
  Profile: UserIcon,
};

const Fab = ({ onPress }: { onPress: () => void }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200, mass: 1 });
    opacity.value = withSpring(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.fabShadow, animatedStyle]}>
        <TouchableOpacity style={styles.fabContainer} onPress={onPress}>
            <Plus color={colors.white} size={32} />
        </TouchableOpacity>
    </Animated.View>
  );
};


export const FloatingBottomBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const fabRouteDescriptor = descriptors[state.routes[2].key];
    const onFabPress = () => {
        navigation.emit({
            type: 'tabPress',
            target: fabRouteDescriptor.route.key,
            canPreventDefault: true,
        });
        navigation.navigate(fabRouteDescriptor.route.name);
    }

  return (
    <View style={styles.barContainer}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          if (index === 2) {
              return <View key={route.key} style={styles.fabPlaceholder} />
          }
          const isFocused = state.index === index;
          const Icon = iconMap[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity key={route.key} style={styles.tabItem} onPress={onPress}>
              <Icon color={isFocused ? colors.primary : colors.textMuted} size={26} />
               <Text style={[styles.tabLabel, {color: isFocused ? colors.primary : colors.textMuted}]}>{route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Fab onPress={onFabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
    barContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        height: 110,
        backgroundColor: 'transparent',
    },
    bar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: radii.pill,
        marginHorizontal: spacing.l,
        ...shadows.fab,
        shadowOpacity: 0.1,
        shadowRadius: 20,
        height: 72,
        alignItems: 'center',
        justifyContent: 'space-around',
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.m,
        paddingBottom: spacing.s,
    },
    tabLabel: {
        ...typography.bodySmall,
        fontSize: 10,
        marginTop: spacing.xs,
    },
    fabPlaceholder: {
        width: 64,
    },
    fabShadow: {
        position: 'absolute',
        top: 0,
        ...shadows.fab,
    },
    fabContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    }
})