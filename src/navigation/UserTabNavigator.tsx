import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UserDashboardScreen, TransactionsScreen, ReportsScreen, SettingsScreen } from '../screens/user';
import { UserCapsuleTabBar } from '../components/navigation/UserCapsuleTabBar';
import { AddScreen } from '../screens/user/AddScreen';

const Tab = createBottomTabNavigator();
const renderUserTabBar = (props: any) => <UserCapsuleTabBar {...props} />;

export const UserTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={renderUserTabBar}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={UserDashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default UserTabNavigator;
