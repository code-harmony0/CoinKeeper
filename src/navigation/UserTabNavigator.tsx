import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UserDashboardScreen, TransactionsScreen, SettingsScreen } from '../screens/user';
import { ExpandingTabBar } from '../components/shared/ExpandingTabBar';
import { AddScreen } from '../screens/user/AddScreen';
import { KazaScreen } from '../screens/user/KazaScreen';
import { isModuleEnabled } from '../config/modules';
import { getUserTabs } from './userTabs';

const Tab = createBottomTabNavigator();

export const UserTabNavigator: React.FC = () => {
  const chitFundEnabled = isModuleEnabled('chitFund');
  const tabs = getUserTabs(chitFundEnabled);

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <ExpandingTabBar {...props} tabs={tabs} hasFab fabIndex={2} />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={UserDashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      {chitFundEnabled && <Tab.Screen name="Kaza" component={KazaScreen} />}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default UserTabNavigator;
