/**
 * AdminTabNavigator - 4 Tab Bottom Navigation
 * Tabs: Dashboard, Groups, Approvals, Settings
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ExpandingTabBar } from '../components/shared/ExpandingTabBar';

// Screens
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminApprovalsScreen } from '../screens/admin/AdminApprovalsScreen';
import { AdminSettingsScreen } from '../screens/admin/AdminSettingsScreen';
import { GroupsStackNavigator } from './GroupsStackNavigator';

const Tab = createBottomTabNavigator();

// 4 tabs: Dashboard, Groups, Approvals, Settings
const ADMIN_TABS = [
  { name: 'Dashboard', label: 'Home', icon: 'dashboard' as const },
  { name: 'Groups', label: 'Groups', icon: 'groups' as const },
  { name: 'Approvals', label: 'Approve', icon: 'approve' as const },
  { name: 'Settings', label: 'Settings', icon: 'settings' as const },
];

export const AdminTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <ExpandingTabBar
          {...props}
          tabs={ADMIN_TABS}
          hasFab={false}
        />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Groups" component={GroupsStackNavigator} />
      <Tab.Screen name="Approvals" component={AdminApprovalsScreen} />
      <Tab.Screen name="Settings" component={AdminSettingsScreen} />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
