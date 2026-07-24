import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UserDashboardScreen, TransactionsScreen, SettingsScreen } from '../screens/user';
import { ExpandingTabBar } from '../components/shared/ExpandingTabBar';
import { AddScreen } from '../screens/user/AddScreen';
import { KazaScreen } from '../screens/user/KazaScreen';

const Tab = createBottomTabNavigator();

// 5-slot layout (Home / Activity / [FAB Add] / Kaza / Settings) on the admin
// panel's ExpandingTabBar — glass-blur pill, icon-only until active, then
// the tab expands to reveal its label; center FAB unchanged.
const USER_TABS = [
  { name: 'Home', label: 'Home', icon: 'home' as const },
  { name: 'Transactions', label: 'Activity', icon: 'transactions' as const },
  { name: 'Add', label: 'Add', icon: 'add' as const },
  { name: 'Kaza', label: 'Kaza', icon: 'kaza' as const },
  { name: 'Settings', label: 'Settings', icon: 'settings' as const },
];

export const UserTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <ExpandingTabBar {...props} tabs={USER_TABS} hasFab fabIndex={2} />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={UserDashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      <Tab.Screen name="Kaza" component={KazaScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default UserTabNavigator;
