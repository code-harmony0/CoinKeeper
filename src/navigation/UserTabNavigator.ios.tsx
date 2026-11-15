import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import type { AppleIcon } from 'react-native-bottom-tabs';
import { LiquidGlassView } from '@callstack/liquid-glass';
import Svg, { Path } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { UserDashboardScreen, TransactionsScreen, SettingsScreen } from '../screens/user';
import { AddScreen } from '../screens/user/AddScreen';
import { KazaScreen } from '../screens/user/KazaScreen';
import { CHITFUND_ENABLED, ISLAMIC_ENABLED } from '../config/buildFlags';
import { getUserTabs, TabDef } from './userTabs';
import { useKazaReminders } from '../hooks/useKazaReminders';
import { fabSize } from '../theme/specTheme';

const Tab = createNativeBottomTabNavigator();

const ChitsScreen = process.env.CK_CHITFUND === '1'
  ? require('../modules/chitfund/screens/GroupsScreen').GroupsScreen
  : null;

// react-native-bottom-tabs needs a real system icon per tab — SF Symbols on iOS.
const TAB_ICON: Record<TabDef['icon'], AppleIcon> = {
  home: { sfSymbol: 'house.fill' },
  transactions: { sfSymbol: 'list.bullet.rectangle.fill' },
  add: { sfSymbol: 'plus' },
  kaza: { sfSymbol: 'moon.fill' },
  chits: { sfSymbol: 'person.3.fill' },
  settings: { sfSymbol: 'gearshape.fill' },
};

// Rendered into the native tab bar's bottom-accessory slot (iOS 26 tabViewBottomAccessory).
const FabAccessory: React.FC = () => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
        navigation.navigate('Add' as never);
      }}
      accessibilityRole="button"
      accessibilityLabel="Add"
      style={styles.fab}
    >
      <LiquidGlassView style={StyleSheet.absoluteFill} effect="clear" interactive />
      <Svg width={26} height={26} viewBox="0 0 24 24" style={styles.fabIcon}>
        <Path d="M12 5V19M5 12H19" stroke="#000000" strokeWidth={2.8} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
};

export const UserTabNavigator: React.FC = () => {
  useKazaReminders();
  const tabs = getUserTabs({
    chitFund: CHITFUND_ENABLED,
    islamic: ISLAMIC_ENABLED,
  });

  return (
    <Tab.Navigator
      minimizeBehavior="onScrollDown"
      renderBottomAccessoryView={() => <FabAccessory />}
    >
      {tabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={
            tab.name === 'Home' ? UserDashboardScreen :
            tab.name === 'Transactions' ? TransactionsScreen :
            tab.name === 'Add' ? AddScreen :
            tab.name === 'Kaza' ? KazaScreen :
            tab.name === 'Chits' ? ChitsScreen :
            SettingsScreen
          }
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: () => TAB_ICON[tab.icon],
            tabBarItemHidden: tab.name === 'Add',
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: fabSize,
    height: fabSize,
    borderRadius: fabSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fabIcon: {
    position: 'absolute',
  },
});

export default UserTabNavigator;
