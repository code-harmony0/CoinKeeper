import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  AnalyticsDashboardScreen,
  GroupAnalyticsScreen,
  MemberAnalyticsScreen,
  SystemHealthScreen,
  ExportDataScreen,
} from '../screens/admin/analytics';

const Stack = createNativeStackNavigator();

export const AnalyticsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
      <Stack.Screen name="GroupAnalytics" component={GroupAnalyticsScreen} />
      <Stack.Screen name="MemberAnalytics" component={MemberAnalyticsScreen} />
      <Stack.Screen name="SystemHealth" component={SystemHealthScreen} />
      <Stack.Screen name="ExportData" component={ExportDataScreen} />
    </Stack.Navigator>
  );
};

export default AnalyticsStackNavigator;
