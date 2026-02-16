/**
 * UserTabNavigator - Expanding Tab Bar
 */
import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ExpandingTabBar } from '../components/shared/ExpandingTabBar';

// Screens
import { UserDashboardScreen, TransactionsScreen, GroupsScreen, SettingsScreen } from '../screens/user';

const Tab = createBottomTabNavigator();

const USER_TABS = [
  { name: 'Home', label: 'Home', icon: 'home' as const },
  { name: 'Transactions', label: 'Wallet', icon: 'wallet' as const },
  { name: 'Add', label: 'Add', icon: 'add' as const },
  { name: 'Groups', label: 'Groups', icon: 'users' as const },
  { name: 'Settings', label: 'Settings', icon: 'settings' as const },
];

export const UserTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <ExpandingTabBar
          {...props}
          tabs={USER_TABS}
          hasFab={true}
          fabIndex={2}
        />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={UserDashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={View} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default UserTabNavigator;