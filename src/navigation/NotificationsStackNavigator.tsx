import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminNotificationsScreen } from '../screens/admin/notifications';

const Stack = createNativeStackNavigator();

export const NotificationsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="NotificationsList" component={AdminNotificationsScreen} />
    </Stack.Navigator>
  );
};

export default NotificationsStackNavigator;
